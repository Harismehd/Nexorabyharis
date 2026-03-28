function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
}
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const defaultData = {
  system: { globalShutdown: false, masterPassword: 'SAdmin#2026!GymFlow' },
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

function verifyAdmin(req, db) {
  const adminKey = req.headers['x-admin-key'];
  return adminKey && adminKey === db.system.masterPassword;
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

  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const db = await readDB();
  const url = req.url || '';

  if (!verifyAdmin(req, db)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  // GET /api/admin/dashboard
  if (req.method === 'GET' && url.includes('dashboard')) {
    return res.json({
      system: db.system || { globalShutdown: false },
      gyms: db.gyms.map(g => ({
        gymKey: g.gymKey,
        name: g.name || 'Unnamed Gym',
        isActive: g.isActive !== false,
        package: g.package || 'starter',
        whatsappStatus: g.whatsappStatus,
        memberCount: db.members.filter(m => m.gymKey === g.gymKey).length
      }))
    });
  }

  // GET /api/admin/gyms
  if (req.method === 'GET' && url.includes('gyms')) {
    return res.json({
      gyms: db.gyms.map(g => ({
        gymKey: g.gymKey,
        name: g.name || 'Unnamed Gym',
        isActive: g.isActive !== false,
        package: g.package || 'starter',
        whatsappStatus: g.whatsappStatus,
        memberCount: db.members.filter(m => m.gymKey === g.gymKey).length
      }))
    });
  }

  // POST /api/admin/gyms/create
  if (req.method === 'POST' && url.includes('create')) {
    const { gymKey, password, package: pkg } = req.body;
    if (db.gyms.find(g => g.gymKey === gymKey)) {
      return res.status(400).json({ error: 'Gym Key already exists' });
    }
    const allowedPackages = ['starter', 'growth', 'pro', 'pro_plus'];
    const selectedPackage = allowedPackages.includes(pkg) ? pkg : 'starter';
    const newGym = {
      gymKey, password,
      isActive: true,
      package: selectedPackage,
      autoMessagingEnabled: false,
      template: 'Hi {name}, your gym fee Rs {amount} is due on {date}. Please pay on time.',
      whatsappStatus: 'disconnected',
      paymentSettings: {
        methods: ['easypaisa'],
        easypaisaNumberEncrypted: '',
        jazzcashNumberEncrypted: '',
        bankTitle: '',
        bankIbanEncrypted: ''
      }
    };
    db.gyms.push(newGym);
    await writeDB(db);
    return res.json({ message: 'Gym Key created successfully', gym: newGym });
  }

  // POST /api/admin/gyms/package
  if (req.method === 'POST' && url.includes('package')) {
    const { gymKey, package: pkg } = req.body;
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    const allowedPackages = ['starter', 'growth', 'pro', 'pro_plus'];
    db.gyms[gymIndex].package = allowedPackages.includes(pkg) ? pkg : 'starter';
    ensureGymDefaults(db.gyms[gymIndex]);
    await writeDB(db);
    return res.json({ message: `Package updated to ${db.gyms[gymIndex].package.toUpperCase()}` });
  }

  // POST /api/admin/gyms/toggle
  if (req.method === 'POST' && url.includes('toggle')) {
    const { gymKey } = req.body;
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    db.gyms[gymIndex].isActive = !(db.gyms[gymIndex].isActive !== false);
    await writeDB(db);
    return res.json({ message: `Gym ${db.gyms[gymIndex].isActive ? 'Activated' : 'Suspended'}` });
  }

  // POST /api/admin/shutdown
  if (req.method === 'POST' && url.includes('shutdown')) {
    if (!db.system) db.system = { globalShutdown: false };
    db.system.globalShutdown = !db.system.globalShutdown;
    await writeDB(db);
    return res.json({ message: `Global platform is now ${db.system.globalShutdown ? 'OFFLINE' : 'ONLINE'}` });
  }

  res.status(404).json({ error: 'Not found' });
}