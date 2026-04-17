import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const defaultData = { system: { globalShutdown: false, masterPassword: 'SAdmin#2026!Nexora' }, gyms: [], members: [], payments: [], pendingPayments: [], logs: [] };

async function readDB() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return JSON.parse(JSON.stringify(defaultData));
  return { ...defaultData, ...data.payload };
}

async function writeDB(payload) {
  const { error } = await supabase.from('app_state').upsert({ id: 1, payload, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

function ensureSystem(db) {
  if (!db.system) db.system = { globalShutdown: false, masterPassword: 'SAdmin#2026!Nexora' };
  if (!db.system.masterPassword) db.system.masterPassword = 'SAdmin#2026!Nexora';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await readDB();
  ensureSystem(db);
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== db.system.masterPassword) return res.status(403).json({ error: 'Forbidden: Admin access required' });

  const url = req.url || '';

  if (req.method === 'GET' && url.includes('dashboard')) {
    return res.json({ 
      system: db.system || { globalShutdown: false }, 
      gyms: db.gyms.map(g => ({ 
        gymKey: g.gymKey, 
        name: g.name || 'Unnamed Gym', 
        isActive: g.isActive !== false, 
        package: g.package || 'starter', 
        deviceLimit: g.deviceLimit || 5, // Expose for UI
        whatsappStatus: g.whatsappStatus, 
        memberCount: db.members.filter(m => m.gymKey === g.gymKey).length 
      })) 
    });
  }

  if (req.method === 'GET' && url.includes('gyms')) {
    return res.json({ 
      gyms: db.gyms.map(g => ({ 
        gymKey: g.gymKey, 
        name: g.name || 'Unnamed Gym', 
        isActive: g.isActive !== false, 
        package: g.package || 'starter', 
        deviceLimit: g.deviceLimit || 5, // Expose for UI
        whatsappStatus: g.whatsappStatus, 
        memberCount: db.members.filter(m => m.gymKey === g.gymKey).length 
      })) 
    });
  }

  const action = req.query.action || (url.includes('?') ? new URL(url, 'http://localhost').searchParams.get('action') : '');

  if (req.method === 'POST' && (action === 'create' || url.includes('create'))) {
    const { gymKey, password, package: pkg, deviceLimit } = req.body;
    if (db.gyms.find(g => g.gymKey === gymKey)) return res.status(400).json({ error: 'Gym Key already exists' });
    const allowedPackages = ['starter', 'growth', 'pro', 'pro_plus'];
    const newGym = { 
      gymKey, password, isActive: true, 
      package: allowedPackages.includes(pkg) ? pkg : 'starter', 
      deviceLimit: deviceLimit || 5,
      autoMessagingEnabled: false, 
      template: 'Hi {name}, your gym fee Rs {amount} is due on {date}. Please pay on time.', 
      whatsappStatus: 'disconnected', 
      paymentSettings: { methods: ['easypaisa'], easypaisaNumberEncrypted: '', jazzcashNumberEncrypted: '', bankTitle: '', bankIbanEncrypted: '' } 
    };
    db.gyms.push(newGym);
    await writeDB(db);
    return res.json({ message: 'Gym Key created successfully', gym: newGym });
  }

  if (req.method === 'POST' && (action === 'update' || url.includes('update'))) {
    const { gymKey, field, value } = req.body;
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    
    if (field === 'deviceLimit') {
      db.gyms[gymIndex].deviceLimit = parseInt(value, 10) || 5;
    } else {
      db.gyms[gymIndex][field] = value;
    }
    
    await writeDB(db);
    return res.json({ message: `Updated ${field} successfully` });
  }

  if (req.method === 'POST' && (action === 'toggle' || url.includes('toggle'))) {
    const { gymKey } = req.body;
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    db.gyms[gymIndex].isActive = !(db.gyms[gymIndex].isActive !== false);
    await writeDB(db);
    return res.json({ message: `Gym ${db.gyms[gymIndex].isActive ? 'Activated' : 'Suspended'}` });
  }

  if (req.method === 'POST' && (action === 'package' || url.includes('package'))) {
    const { gymKey, package: pkg } = req.body;
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    const allowedPackages = ['starter', 'growth', 'pro', 'pro_plus'];
    db.gyms[gymIndex].package = allowedPackages.includes(pkg) ? pkg : 'starter';
    await writeDB(db);
    return res.json({ message: `Package updated to ${db.gyms[gymIndex].package.toUpperCase()}` });
  }

  if (req.method === 'POST' && (action === 'shutdown' || url.includes('shutdown'))) {
    if (!db.system) db.system = { globalShutdown: false };
    db.system.globalShutdown = !db.system.globalShutdown;
    await writeDB(db);
    return res.json({ message: `Global platform is now ${db.system.globalShutdown ? 'OFFLINE' : 'ONLINE'}` });
  }

  res.status(404).json({ error: 'Not found' });
}
