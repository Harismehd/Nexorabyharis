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

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const action = req.query.action || (url.includes('?') ? new URL(url, 'http://localhost').searchParams.get('action') : '');

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';

    let body = {};
    let fileBuffer = null;
    let fileName = 'proof.png';
    let fileType = 'image/png';

    if (contentType.includes('boundary')) {
      const boundary = contentType.split('boundary=')[1];
      const parts = buffer.toString('binary').split(`--${boundary}`);
      for (const part of parts) {
        if (part.includes('name="')) {
          const nameMatch = part.match(/name="([^"]+)"/);
          const name = nameMatch ? nameMatch[1] : null;
          if (part.includes('filename="')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            fileName = filenameMatch ? filenameMatch[1] : fileName;
            const typeMatch = part.match(/Content-Type: ([^\r\n]+)/);
            fileType = typeMatch ? typeMatch[1] : fileType;
            const dataStart = part.indexOf('\r\n\r\n') + 4;
            const dataEnd = part.lastIndexOf('\r\n');
            fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
          } else if (name) {
            body[name] = part.split('\r\n\r\n')[1]?.replace(/\r\n$/, '').trim();
          }
        }
      }
    } else if (buffer.length > 0) {
      try { body = JSON.parse(buffer.toString()); } catch (e) { body = {}; }
    }

    // 1. PUBLIC ACTION: SIGNUP
    if (req.method === 'POST' && action === 'signup') {
      if (!fileBuffer) return res.status(400).json({ error: 'Payment proof is required' });
      const fileExt = fileName.split('.').pop() || 'png';
      const storagePath = `proofs/${uuidv4()}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('registration-proofs').upload(storagePath, fileBuffer, { contentType: fileType });
      const { data: { publicUrl } } = supabase.storage.from('registration-proofs').getPublicUrl(storagePath);
      await supabase.from('registrations').insert([{
        gym_name: body.gymName,
        owner_name: body.ownerName,
        phone: body.businessPhone,
        email: body.emailAddress,
        package_name: body.packageName,
        gym_key_choice: body.gymKeyChoice,
        payment_proof_url: publicUrl,
        status: 'pending'
      }]);
      return res.status(200).json({ message: 'Registration submitted' });
    }

    // PROTECTED ACTIONS
    const db = await readDB();
    ensureSystem(db);
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== db.system.masterPassword) return res.status(403).json({ error: 'Forbidden' });

    if (req.method === 'GET') {
      if (action === 'dashboard' || url.includes('dashboard')) return res.json({ system: db.system, gyms: db.gyms.map(g => ({ ...g, memberCount: db.members.filter(m => m.gymKey === g.gymKey).length })) });
      if (action === 'gyms' || url.includes('gyms')) return res.json({ gyms: db.gyms.map(g => ({ ...g, memberCount: db.members.filter(m => m.gymKey === g.gymKey).length })) });
      if (action === 'applications') {
        const { data, error } = await supabase.from('registrations').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json(data || []);
      }
      if (action === 'stats') {
        const { data, error } = await supabase.from('message_jobs').select('gym_key, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        if (error) throw error;
        const statsMap = {};
        (data || []).forEach(job => {
          const date = job.created_at?.slice(0, 10);
          const key = `${job.gym_key}__${date}`;
          statsMap[key] = (statsMap[key] || 0) + 1;
        });
        const result = Object.entries(statsMap).map(([k, count]) => {
          const [gymKey, date] = k.split('__');
          return { gymKey, date, count };
        }).sort((a, b) => b.date.localeCompare(a.date));
        return res.json(result);
      }
    }

    if (req.method === 'POST') {
      if (action === 'create') {
        const { gymKey, password, package: pkg, deviceLimit } = body;
        if (db.gyms.find(g => g.gymKey === gymKey)) return res.status(400).json({ error: 'Gym Key exists' });
        const newGym = { gymKey, password, isActive: true, package: pkg || 'starter', deviceLimit: deviceLimit || 5, autoMessagingEnabled: false, template: 'Hi {name}, fee Rs {amount} due {date}.', whatsappStatus: 'disconnected', paymentSettings: { methods: ['easypaisa'], easypaisaNumberEncrypted: '', jazzcashNumberEncrypted: '', bankTitle: '', bankIbanEncrypted: '' } };
        db.gyms.push(newGym);
        await writeDB(db);
        return res.json({ message: 'Gym created', gym: newGym });
      }
      if (action === 'update') {
        const { gymKey, field, value } = body;
        const idx = db.gyms.findIndex(g => g.gymKey === gymKey);
        if (idx !== -1) {
          db.gyms[idx][field] = field === 'deviceLimit' ? parseInt(value, 10) : value;
          await writeDB(db);
          return res.json({ message: 'Updated' });
        }
      }
      if (action === 'toggle') {
        const { gymKey } = body;
        const idx = db.gyms.findIndex(g => g.gymKey === gymKey);
        if (idx !== -1) {
          db.gyms[idx].isActive = !db.gyms[idx].isActive;
          await writeDB(db);
          return res.json({ message: 'Toggled' });
        }
      }
      if (action === 'package') {
        const { gymKey, package: pkg } = body;
        const idx = db.gyms.findIndex(g => g.gymKey === gymKey);
        if (idx !== -1) {
          db.gyms[idx].package = pkg;
          await writeDB(db);
          return res.json({ message: 'Package updated' });
        }
      }
      if (action === 'shutdown') {
        db.system.globalShutdown = !db.system.globalShutdown;
        await writeDB(db);
        return res.json({ message: 'Shutdown toggled' });
      }
    }

    if (req.method === 'PUT' && action === 'approve') {
      const { id, status } = body;
      const { error } = await supabase.from('registrations').update({ status }).eq('id', id);
      if (error) throw error;
      return res.json({ message: 'Status updated' });
    }

    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Admin API error:', err);
    res.status(500).json({ error: err.message });
  }
}
