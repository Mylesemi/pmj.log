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

async function load() {
  refresh.disabled = true;
  status.textContent = '문의 불러오는 중…';
  try {
    const result = await fetch('/api/inbox', { cache: 'no-store' });
    if (!result.ok) throw new Error('Inbox unavailable');
    const data = await result.json();
    if (!Array.isArray(data.inboxes)) throw new Error('Invalid response');
    inboxes = data.inboxes;
    render();
  } catch {
    status.textContent = '문의함을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    refresh.disabled = false;
  }
}

source.addEventListener('change', render);
state.addEventListener('change', render);
refresh.addEventListener('click', load);
void load();
