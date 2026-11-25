import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { get, put } from '@vercel/blob';

const credentialPath = 'github-app/credentials.json';

function encryptionKey() {
  const encoded = process.env.PMJ_GITHUB_APP_ENCRYPTION_KEY;
  return encoded && /^[A-Za-z0-9_-]{43}$/.test(encoded) ? Buffer.from(encoded, 'base64url') : null;
}

export function githubStorageReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && encryptionKey());
}

export async function readGithubApp() {
  const blob = await get(credentialPath, {
    access: 'private', useCache: false, abortSignal: AbortSignal.timeout(5000),
  });
  if (!blob) return null;
  if (blob.statusCode !== 200) throw new Error('GitHub App configuration is unavailable');
  const { nonce, tag, ciphertext } = await new Response(blob.stream).json();
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(nonce, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8'));
}

export async function saveGithubApp(app) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(app), 'utf8'), cipher.final()]);
  await put(credentialPath, JSON.stringify({
    nonce: nonce.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  }), {
    access: 'private', contentType: 'application/json', allowOverwrite: false,
    abortSignal: AbortSignal.timeout(8000),
  });
}
