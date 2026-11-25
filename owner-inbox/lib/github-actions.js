import { sign } from 'node:crypto';

export const inboxOrigin = 'https://pmj-inbox-semimirr-3887.vercel.app';
export const githubOwner = 'Mylesemi';
const repositories = ['storybeat', 'character-adv'];

export function inboxEnabled() {
  return process.env.PMJ_INBOX_ENABLED === '1' && process.env.VERCEL_ENV !== 'production';
}

export function ownerPost(req) {
  return req.method === 'POST'
    && req.headers.origin === inboxOrigin
    && req.headers['x-pmj-inbox'] === '1';
}

export function githubApi(path, { method = 'GET', token, body } = {}) {
  return fetch('https://api.github.com' + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
}

export function installUrl(slug) {
  return `https://github.com/apps/${slug}/installations/new`;
}

function appJwt(app) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const message = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iat: now - 30,
    exp: now + 5 * 60,
    iss: app.clientId,
  })}`;
  return `${message}.${sign('RSA-SHA256', Buffer.from(message), app.pem).toString('base64url')}`;
}

async function dispatch(repo, jwt) {
  const path = `/repos/${githubOwner}/${repo}`;
  const installation = await githubApi(path + '/installation', { token: jwt });
  if (installation.status === 404) return { id: repo, status: 'installation_required' };
  if (!installation.ok) return { id: repo, status: 'failed' };

  const info = await installation.json();
  if (!Number.isSafeInteger(info.id) || info.account?.login?.toLowerCase() !== githubOwner.toLowerCase()
    || info.repository_selection !== 'selected') {
    return { id: repo, status: 'installation_required' };
  }

  const access = await githubApi(`/app/installations/${info.id}/access_tokens`, {
    method: 'POST',
    token: jwt,
    body: { repositories: [repo], permissions: { actions: 'write' } },
  });
  if (!access.ok) return { id: repo, status: 'failed' };
  const authorized = await access.json();
  if (typeof authorized.token !== 'string' || authorized.permissions?.actions !== 'write') {
    return { id: repo, status: 'failed' };
  }

  const run = await githubApi(`${path}/actions/workflows/${repo}-inquiries.yml/dispatches`, {
    method: 'POST',
    token: authorized.token,
    body: { ref: 'main', return_run_details: true },
  });
  return { id: repo, status: run.status === 200 || run.status === 204 ? 'queued' : 'failed' };
}

export async function requestInquirySync(app) {
  const jwt = appJwt(app);
  const results = await Promise.allSettled(repositories.map(repo => dispatch(repo, jwt)));
  return results.map((result, index) => result.status === 'fulfilled'
    ? result.value
    : { id: repositories[index], status: 'failed' });
}
