const services = {
  storybeat: { name: 'StoryBeat', issues: 'https://github.com/Mylesemi/storybeat/issues/' },
  'character-adv': { name: '글자 탐험대', issues: 'https://github.com/Mylesemi/character-adv/issues/' },
};
const stateLabels = { pending: 'GitHub 등록 대기', open: '열림', closed: '닫힘' };
const stamp = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul',
});
const source = document.querySelector('#source');
const state = document.querySelector('#state');
const status = document.querySelector('#status');
const entries = document.querySelector('#entries');
const refresh = document.querySelector('#refresh');
const syncStatus = document.querySelector('#sync-status');
const connectPanel = document.querySelector('#github-connect-panel');
const connect = document.querySelector('#github-connect');
const ownerHeaders = { 'X-PMJ-Inbox': '1' };
let inboxes = [];

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function dateText(value) {
  return Number.isFinite(Date.parse(value)) ? stamp.format(new Date(value)) : '';
}

function row(item) {
  const details = element('details');
  const summary = element('summary', item.title || '사용자 문의');
  summary.append(element('span', [
    services[item.service].name,
    stateLabels[item.state],
    item.reference ? `#${item.reference}` : '',
    dateText(item.submittedAt),
  ].filter(Boolean).join(' · '), 'summary-meta'));
  const body = element('div', '', 'entry-body');
  if (item.message) body.append(element('p', item.message, 'message'));
  if (item.email) body.append(element('p', `답변 이메일 ${item.email}`, 'email'));
  if (Number.isSafeInteger(item.number) && item.number > 0) {
    const issue = element('a', `GitHub 이슈 #${item.number} 열기`);
    issue.href = services[item.service].issues + item.number;
    issue.target = '_blank';
    issue.rel = 'noopener noreferrer';
    body.append(issue);
  }
  details.append(summary, body);
  return details;
}

function render() {
  const active = inboxes.filter(({ id }) => Object.hasOwn(services, id) && (source.value === 'all' || source.value === id));
  const allIssues = active.flatMap(({ id, items }) => (items ?? []).filter(item => item.state === 'pending'
    ? /^[0-9A-F]{12}$/.test(item.reference)
    : Number.isSafeInteger(item.number) && item.number > 0)
    .map(item => ({ ...item, service: id })));
  const issues = allIssues.filter(item => state.value === 'all' || item.state === state.value)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  const unavailable = active.filter(item => item.unavailable).map(item => services[item.id].name);
  const syncTimes = active.map(item => Date.parse(item.updatedAt)).filter(Number.isFinite);
  const heading = issues.length
    ? `${issues.length}건`
    : allIssues.length
      ? `선택한 상태의 문의가 없습니다. 전체 문의는 ${allIssues.length}건입니다.`
      : '아직 접수된 문의가 없습니다.';
  status.textContent = [
    active.some(item => !item.unavailable) ? heading : '',
    unavailable.length ? `${unavailable.join(', ')} 문의를 불러오지 못했습니다.` : '',
    (state.value === 'all' || state.value === 'pending') && active.some(item => item.pendingUnavailable)
      ? '일부 등록 대기 문의를 불러오지 못했습니다.' : '',
    active.some(item => item.snapshotUnavailable) ? '일부 GitHub 등록 내역을 불러오지 못했습니다.' : '',
    syncTimes.length ? `GitHub 동기화 기준 ${stamp.format(Math.min(...syncTimes))}` : '',
    active.some(item => item.hasOlder) ? '이전 기록은 GitHub에서 확인할 수 있습니다.' : '',
    (state.value === 'all' || state.value === 'pending') && active.some(item => item.pendingHasMore)
      ? '추가 대기 문의는 GitHub 등록 후 표시됩니다.' : '',
  ].filter(Boolean).join(' · ');
  entries.replaceChildren(...issues.map(row));
}

async function load(showLoading = true) {
  if (showLoading) status.textContent = '문의 불러오는 중…';
  try {
    const result = await fetch('/api/inbox', { cache: 'no-store' });
    if (!result.ok) throw new Error('Inbox unavailable');
    const data = await result.json();
    if (!Array.isArray(data.inboxes)) throw new Error('Invalid response');
    inboxes = data.inboxes;
    render();
    return true;
  } catch {
    status.textContent = '문의함을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return false;
  }
}

function showSyncStatus(message) {
  syncStatus.textContent = message;
  syncStatus.hidden = !message;
}

async function refreshWithSync() {
  refresh.disabled = true;
  connectPanel.hidden = true;
  showSyncStatus('GitHub 동기화를 요청하는 중…');
  try {
    const response = await fetch('/api/inbox-sync', { method: 'POST', headers: ownerHeaders });
    const data = await response.json();
    if (response.status === 409 && data.error === 'setup_required') {
      await load();
      connectPanel.hidden = false;
      showSyncStatus('GitHub에 새 문의를 등록하려면 한 번 연결해야 합니다.');
      return;
    }
    if (response.status !== 202 || !Array.isArray(data.results)) throw new Error('Sync request failed');

    const queued = new Set(data.results.filter(result => result.status === 'queued').map(result => result.id));
    const needsConnection = data.results.some(result => result.status === 'installation_required');
    const failed = data.results.filter(result => result.status !== 'queued')
      .map(result => services[result.id]?.name).filter(Boolean);
    connectPanel.hidden = !needsConnection;
    const requestedAt = Date.parse(data.requestedAt);
    if (!Number.isFinite(requestedAt)) throw new Error('Invalid sync request time');
    for (let attempt = 0; ; attempt += 1) {
      if (await load(attempt === 0)) {
        for (const item of inboxes) {
          if (Date.parse(item.updatedAt) >= requestedAt) queued.delete(item.id);
        }
      }
      if (!queued.size || attempt === 15) break;
      showSyncStatus('GitHub 등록을 기다리는 중…');
      await new Promise(resolve => window.setTimeout(resolve, 4000));
    }
    showSyncStatus([
      failed.length ? `${failed.join(', ')} 동기화 요청을 실행하지 못했습니다.` : '',
      queued.size ? 'GitHub가 동기화를 처리 중입니다. 현재까지의 접수 내역을 표시합니다.' : '',
      !failed.length && !queued.size ? 'GitHub 동기화가 완료되었습니다.' : '',
    ].filter(Boolean).join(' '));
  } catch {
    const loaded = await load();
    showSyncStatus(loaded
      ? 'GitHub 동기화를 요청하지 못했습니다. 현재 접수 내역을 표시합니다.'
      : 'GitHub 동기화와 접수 내역 조회에 실패했습니다.');
  } finally {
    refresh.disabled = false;
  }
}

async function connectGithub() {
  connect.disabled = true;
  try {
    const response = await fetch('/api/github-setup', { method: 'POST', headers: ownerHeaders });
    if (!response.ok) throw new Error('GitHub setup unavailable');
    const data = await response.json();
    if (typeof data.installUrl === 'string' && /^https:\/\/github\.com\/apps\/[a-z0-9-]+\/installations\/new$/.test(data.installUrl)) {
      location.assign(data.installUrl);
      return;
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(data.state) || !data.manifest) throw new Error('Invalid GitHub setup');
    const form = element('form');
    form.action = 'https://github.com/settings/apps/new?state=' + data.state;
    form.method = 'POST';
    const manifest = element('input');
    manifest.type = 'hidden';
    manifest.name = 'manifest';
    manifest.value = JSON.stringify(data.manifest);
    form.append(manifest);
    document.body.append(form);
    form.submit();
  } catch {
    showSyncStatus('GitHub 연결을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    connect.disabled = false;
  }
}

source.addEventListener('change', render);
state.addEventListener('change', render);
refresh.addEventListener('click', refreshWithSync);
connect.addEventListener('click', connectGithub);
const setupResult = new URLSearchParams(location.search).get('github_setup');
if (setupResult === 'installed' || setupResult === 'error') {
  history.replaceState(null, '', '/');
  if (setupResult === 'installed') showSyncStatus('GitHub 설치를 마쳤다면 다시 불러오기를 눌러 연결을 확인하세요.');
  else {
    connectPanel.hidden = false;
    showSyncStatus('GitHub 연결을 마치지 못했습니다. 다시 연결해 주세요.');
  }
}
refresh.disabled = true;
void load().finally(() => { refresh.disabled = false; });
