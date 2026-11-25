import { createPrivateKey, randomBytes, timingSafeEqual } from 'node:crypto';
import { githubApi, githubOwner, inboxEnabled, inboxOrigin, installUrl, ownerPost } from '../lib/github-actions.js';
import { githubStorageReady, readGithubApp, saveGithubApp } from '../lib/github-app-store.js';

const cookieName = '__Host-pmj-github-state';
const cookieAttributes = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const githubAppPath = '/api/github-setup';

function cookieValue(req) {
  return req.headers.cookie?.split('; ').find(value => value.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}

function stateMatches(received, expected) {
  return typeof received === 'string' && typeof expected === 'string'
    && /^[A-Za-z0-9_-]{43}$/.test(received) && /^[A-Za-z0-9_-]{43}$/.test(expected)
    && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!inboxEnabled() || req.headers.host !== new URL(inboxOrigin).host) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method' });
  }
  if (!githubStorageReady()) return res.status(503).json({ error: 'setup_unavailable' });

  try {
    if (req.method === 'POST') {
      if (!ownerPost(req)) return res.status(403).json({ error: 'origin' });
      const existing = await readGithubApp();
      if (existing) return res.status(200).json({ installUrl: installUrl(existing.slug) });

      const state = randomBytes(32).toString('base64url');
      res.setHeader('Set-Cookie', `${cookieName}=${state}; Max-Age=1800; ${cookieAttributes}`);
      return res.status(200).json({
        state,
        manifest: {
          name: 'PMJ Inbox Sync',
          url: inboxOrigin,
          redirect_url: inboxOrigin + githubAppPath,
          setup_url: inboxOrigin + '/?github_setup=installed',
          hook_attributes: { url: inboxOrigin, active: false },
          public: false,
          default_events: [],
          default_permissions: { actions: 'write' },
        },
      });
    }

    const { code, state } = req.query;
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(code) || !stateMatches(state, cookieValue(req))) {
      return res.redirect(303, '/?github_setup=error');
    }
    res.setHeader('Set-Cookie', `${cookieName}=; Max-Age=0; ${cookieAttributes}`);
    const existing = await readGithubApp();
    if (existing) return res.redirect(303, installUrl(existing.slug));

    const response = await githubApi(`/app-manifests/${code}/conversions`, { method: 'POST' });
    if (response.status !== 201) throw new Error('GitHub App setup failed');
    const app = await response.json();
    if (app.owner?.login?.toLowerCase() !== githubOwner.toLowerCase()
      || app.permissions?.actions !== 'write' || app.public !== false
      || typeof app.pem !== 'string' || app.pem.length > 12000
      || typeof app.client_id !== 'string' || !/^[a-z0-9-]+$/.test(app.slug ?? '')
      || createPrivateKey(app.pem).asymmetricKeyType !== 'rsa') {
      throw new Error('Unexpected GitHub App configuration');
    }

    await saveGithubApp({ slug: app.slug, clientId: app.client_id, pem: app.pem });
    return res.redirect(303, installUrl(app.slug));
  } catch {
    if (req.method === 'GET') return res.redirect(303, '/?github_setup=error');
    return res.status(502).json({ error: 'setup_failed' });
  }
}
