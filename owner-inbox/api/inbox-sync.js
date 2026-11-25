import { githubStorageReady, readGithubApp } from '../lib/github-app-store.js';
import { inboxEnabled, inboxOrigin, installUrl, ownerPost, requestInquirySync } from '../lib/github-actions.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!inboxEnabled() || req.headers.host !== new URL(inboxOrigin).host) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  if (!ownerPost(req)) return res.status(403).json({ error: 'origin' });
  if (!githubStorageReady()) return res.status(503).json({ error: 'setup_unavailable' });

  try {
    const app = await readGithubApp();
    if (!app) return res.status(409).json({ error: 'setup_required' });
    const requestedAt = new Date().toISOString();
    const results = await requestInquirySync(app);
    return res.status(202).json({
      requestedAt,
      results,
      ...(results.some(result => result.status === 'installation_required') ? { installUrl: installUrl(app.slug) } : {}),
    });
  } catch {
    return res.status(502).json({ error: 'sync_failed' });
  }
}
