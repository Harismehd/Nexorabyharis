import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const defaultData = {
  system: { globalShutdown: false, masterPassword: 'SAdmin#2026!Nexora' },
  gyms: [], members: [], payments: [], pendingPayments: [], logs: []
};

async function readDB() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return JSON.parse(JSON.stringify(defaultData));
  return { ...defaultData, ...data.payload };
}

async function writeDB(payload) {
  const { error } = await supabase.from('app_state').upsert(
    { id: 1, payload, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

function ensureSystem(db) {
  if (!db.system) db.system = { ...defaultData.system };
  if (typeof db.system.globalShutdown !== 'boolean') db.system.globalShutdown = false;
  if (!db.system.masterPassword) db.system.masterPassword = defaultData.system.masterPassword;
}

function ensureGymDefaults(gym) {
  if (typeof gym.isActive !== 'boolean') gym.isActive = true;
  if (!gym.package) gym.package = 'starter';
  if (!gym.paymentSettings) {
    gym.paymentSettings = {
      methods: ['easypaisa'],
      easypaisaNumberEncrypted: '',
      jazzcashNumberEncrypted: '',
      bankTitle: '',
      bankIbanEncrypted: ''
    };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = req.url || '';
  const db = await readDB();
  ensureSystem(db);

  // 1. Normal Login logic
  const { gymKey, password } = req.body;

  if (gymKey === 'ADMIN') {
    if (password === db.system.masterPassword) {
      return res.json({ message: 'Welcome, Master Admin', gymKey: 'ADMIN', role: 'admin' });
    }
    return res.status(401).json({ error: 'Invalid Master Password' });
  }

  if (db.system.globalShutdown) {
    return res.status(403).json({ error: 'SYSTEM_OFFLINE', message: 'Platform is completely offline.' });
  }

  const gym = db.gyms.find(g => g.gymKey === gymKey);
  if (!gym) return res.status(401).json({ error: 'Gym Key not found. Contact your provider.' });
  if (gym.password !== password) return res.status(401).json({ error: 'Invalid password' });

  const before = JSON.stringify(gym);
  ensureGymDefaults(gym);
  if (before !== JSON.stringify(gym)) await writeDB(db);

  if (gym.isActive === false) {
    return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended.' });
  }

  res.json({ 
    message: 'Login successful', 
    gymKey, 
    role: 'gym', 
    package: gym.package || 'starter' 
  });
}
