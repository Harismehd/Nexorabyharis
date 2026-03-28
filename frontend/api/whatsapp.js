export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';

  if (url.includes('status')) {
    return res.json({ status: 'disconnected' });
  }

  if (url.includes('connect')) {
    return res.json({ message: 'WhatsApp is managed by the desktop service on your PC.' });
  }

  if (url.includes('disconnect')) {
    return res.json({ message: 'Disconnected' });
  }

  if (url.includes('qr')) {
    return res.json({ qr: null });
  }

  res.status(404).json({ error: 'Not found' });
}