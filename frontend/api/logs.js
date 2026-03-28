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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { gymKey } = req.query;
  const db = await readDB();
  const logs = (db.logs || []).filter(l => l.gymKey === gymKey);
  return res.json({ logs });
}