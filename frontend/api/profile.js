import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

function getKey() { return process.env.PAYMENT_SECRET || 'Nexora-Payment-Secret-Change-Now-2026'; }

function encryptSensitive(text) {
  const key = crypto.createHash('sha256').update(getKey()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSensitive(payload) {
  if (!payload || !payload.includes(':')) return payload || '';
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const key = crypto.createHash('sha256').update(getKey()).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return ''; }
}

const PACKAGE_RANK = { starter: 1, growth: 2, pro: 3, pro_plus: 4 };

function ensureGymDefaults(gym) {
  if (typeof gym.isActive !== 'boolean') gym.isActive = true;
  if (!gym.package) gym.package = 'starter';
  if (!gym.packages) gym.packages = [];
  if (!gym.paymentSettings) gym.paymentSettings = { methods: ['easypaisa'], easypaisaNumberEncrypted: '', jazzcashNumberEncrypted: '', bankTitle: '', bankIbanEncrypted: '' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await readDB();
  const gymKey = req.query.gymKey || req.body.gymKey;

  if (req.method === 'GET') {
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    if (!gym) return res.status(404).json({ error: 'Not found' });
    const { password, ...profileData } = gym;
    profileData.package = gym.package || 'starter';
    const raw = gym.paymentSettings || {};
    profileData.paymentSettings = {
      methods: Array.isArray(raw.methods) ? raw.methods : ['easypaisa'], 
      easypaisaNumber: decryptSensitive(raw.easypaisaNumberEncrypted || ''), 
      jazzcashNumber: decryptSensitive(raw.jazzcashNumberEncrypted || ''), 
      bankTitle: raw.bankTitle || '', 
      bankIban: decryptSensitive(raw.bankIbanEncrypted || '')
    };
    return res.json({ profile: profileData });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const isPartial = req.method === 'PUT';
    const profile = isPartial ? req.body : req.body.profile;
    
    if (!profile && !isPartial) return res.status(400).json({ error: 'Missing profile in body' });

    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Not found' });
    const gym = db.gyms[gymIndex];
    ensureGymDefaults(gym);
    const rank = PACKAGE_RANK[gym.package] || 1;
    
    const safeProfile = { ...profile };

    // Gate features strictly by package.
    if (rank < PACKAGE_RANK.growth) {
      delete safeProfile.paymentSettings;
    } else if (safeProfile.paymentSettings) {
      const p = safeProfile.paymentSettings;
      // If partial update, we merge with existing paymentSettings
      const currentPS = gym.paymentSettings || {};
      
      const newPS = {
        methods: p.methods || currentPS.methods || ['easypaisa'],
        easypaisaNumberEncrypted: p.easypaisaNumber ? encryptSensitive(p.easypaisaNumber) : (currentPS.easypaisaNumberEncrypted || ''),
        jazzcashNumberEncrypted: p.jazzcashNumber ? encryptSensitive(p.jazzcashNumber) : (currentPS.jazzcashNumberEncrypted || ''),
        bankTitle: p.bankTitle || currentPS.bankTitle || '',
        bankIbanEncrypted: p.bankIban ? encryptSensitive(p.bankIban) : (currentPS.bankIbanEncrypted || '')
      };
      
      safeProfile.paymentSettings = newPS;
    }

    if (rank < PACKAGE_RANK.pro) {
      delete safeProfile.template;
      delete safeProfile.packages;
    } else if (safeProfile.packages) {
      const limit = gym.package === 'pro_plus' ? 7 : 3;
      if (safeProfile.packages.length > limit) safeProfile.packages = safeProfile.packages.slice(0, limit);
    }

    db.gyms[gymIndex] = { ...gym, ...safeProfile };
    await writeDB(db);
    return res.json({ message: 'Profile updated successfully', profile: db.gyms[gymIndex] });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
