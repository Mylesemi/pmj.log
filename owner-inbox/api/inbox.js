const sources = [
  { id: 'storybeat', url: 'https://storybeat-beta.vercel.app/api/inquiry-inbox', token: 'STORYBEAT_INBOX_READER_TOKEN' },
  { id: 'character-adv', url: 'https://character-adv.vercel.app/api/inquiry-inbox', token: 'CHARACTER_INBOX_READER_TOKEN' },
];

async function fetchSource({ id, url, token }) {
  const credential = process.env[token];
  if (!credential) throw new Error('Missing read credential');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${credential}` },
    redirect: 'error',
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Inquiry inbox is unavailable');
  const data = await response.json();
  if (!Array.isArray(data.items) || typeof data.updatedAt !== 'string') {
    throw new Error('Invalid inquiry inbox response');
  }
  return { id, ...data };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  // This deployment's preview URL is protected by Vercel Authentication.
  // A production alias must never serve inquiry data.
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ error: 'not_found' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method' });
  }

  const results = await Promise.allSettled(sources.map(fetchSource));
  const inboxes = results.map((result, index) => result.status === 'fulfilled'
    ? result.value
    : { id: sources[index].id, unavailable: true });
  return res.status(200).json({ inboxes });
}
