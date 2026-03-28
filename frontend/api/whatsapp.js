import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const defaultData = { system: { globalShutdown: false, masterPassword: 'SAdmin#2026!GymFlow' }, gyms: [], members: [], payments: [], pendingPayments: [], logs: [] };

async function readDB() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return JSON.parse(JSON.stringify(defaultData));
  return { ...defaultData, ...data.payload };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const db = await readDB();

  if (url.includes('status')) {
    const { gymKey } = req.query;
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    return res.json({ status: gym?.whatsappStatus || 'disconnected' });
  }

  if (url.includes('connect')) {
    return res.json({ message: 'WhatsApp is managed by the desktop service on your PC.' });
  }

  if (url.includes('disconnect')) {
    const { gymKey } = req.body;
    const gymIndex = (db.gyms || []).findIndex(g => g.gymKey === gymKey);
    if (gymIndex !== -1) {
      db.gyms[gymIndex].whatsappStatus = 'disconnected';
      await supabase.from('app_state').upsert({ id: 1, payload: db, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    }
    return res.json({ message: 'Disconnected' });
  }

  if (url.includes('qr')) {
    return res.json({ qr: null });
  }

  res.status(404).json({ error: 'Not found' });
}