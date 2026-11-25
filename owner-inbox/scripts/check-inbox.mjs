import assert from 'node:assert/strict';
import handler from '../api/inbox.js';
import { githubStorageReady, readGithubApp } from '../lib/github-app-store.js';

if (process.env.PMJ_INBOX_ENABLED !== '1') {
  // Public production deployments have no reader credentials or inbox data.
  console.log('PMJ inbox is disabled for this deployment');
  process.exit(0);
}

const res = {
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
};

await handler({ method: 'GET' }, res);
assert.equal(res.statusCode, 200, 'The private inbox route must be enabled');
assert.ok(githubStorageReady(), 'GitHub App storage must be available');
await readGithubApp();
console.log('Verified private GitHub App storage');
console.log(`Vercel preview indicator: ${process.env.VERCEL_ENV === 'preview' ? 'present' : 'unavailable'}`);
const expected = ['storybeat', 'character-adv'];
assert.deepEqual(res.body.inboxes.map(({ id }) => id), expected);
const unavailable = res.body.inboxes.filter(({ unavailable }) => unavailable).map(({ id }) => id);
assert.equal(unavailable.length, 0, `Inbox sources unavailable: ${unavailable.join(', ')}`);
for (const { id, items } of res.body.inboxes) {
  console.log(`Verified ${id} inbox connection (${items.length} records)`);
}
