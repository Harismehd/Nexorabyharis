import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

function getSecurityKey() {
  return process.env.PAYMENT_SECRET || 'GymFlow-Payment-Secret-Change-Now-2026';
}

function encryptSensitive(text) {
  const key = crypto.createHash('sha256').update(getSecurityKey()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSensitive(payload) {
  if (!payload || typeof payload !== 'string' || !payload.includes(':')) return payload || '';
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const key = crypto.createHash('sha256').update(getSecurityKey()).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const result = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return result.toString('utf8');
  } catch { return ''; }
}

const PACKAGE_RANK = { starter: 1, growth: 2, pro: 3, pro_plus: 4 };

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

function normalizePaymentSettings(raw) {
  const allowed = ['easypaisa', 'jazzcash', 'bank'];
  const methods = Array.isArray(raw?.methods) ? raw.methods.filter(m => allowed.includes(m)) : ['easypaisa'];
  return {
    methods: methods.length ? methods : ['easypaisa'],
    easypaisaNumber: raw?.easypaisaNumber ? String(raw.easypaisaNumber).trim() : '',
    jazzcashNumber: raw?.jazzcashNumber ? String(raw.jazzcashNumber).trim() : '',
    bankTitle: raw?.bankTitle ? String(raw.bankTitle).trim() : '',
    bankIban: raw?.bankIban ? String(raw.bankIban).trim() : ''
  };
}

export default async function handler(req, res) {
  const db = await readDB();
  const { gymKey } = req.method === 'GET' ? req.query : req.body;

  // GET /api/profile?gymKey=xxx
  if (req.method === 'GET') {
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    if (!gym) return res.status(404).json({ error: 'Not found' });

    const { password, ...profileData } = gym;
    profileData.package = gym.package || 'starter';
    const rawSettings = gym.paymentSettings || {};
    profileData.paymentSettings = {
      methods: Array.isArray(rawSettings.methods) ? rawSettings.methods : ['easypaisa'],
      easypaisaNumber: decryptSensitive(rawSettings.easypaisaNumberEncrypted || ''),
      jazzcashNumber: decryptSensitive(rawSettings.jazzcashNumberEncrypted || ''),
      bankTitle: rawSettings.bankTitle || '',
      bankIban: decryptSensitive(rawSettings.bankIbanEncrypted || '')
    };
    return res.json({ profile: profileData });
  }

  // POST /api/profile — update profile
  if (req.method === 'POST') {
    const { profile } = req.body;
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Not found' });

    const gym = db.gyms[gymIndex];
    ensureGymDefaults(gym);
    const rank = PACKAGE_RANK[gym.package] || 1;
    const safeProfile = { ...profile };

    if (rank < PACKAGE_RANK.growth) {
      delete safeProfile.paymentSettings;
    } else if (safeProfile.paymentSettings) {
      const normalized = normalizePaymentSettings(safeProfile.paymentSettings);
      safeProfile.paymentSettings = {
        methods: normalized.methods,
        easypaisaNumberEncrypted: normalized.easypaisaNumber ? encryptSensitive(normalized.easypaisaNumber) : '',
        jazzcashNumberEncrypted: normalized.jazzcashNumber ? encryptSensitive(normalized.jazzcashNumber) : '',
        bankTitle: normalized.bankTitle,
        bankIbanEncrypted: normalized.bankIban ? encryptSensitive(normalized.bankIban) : ''
      };
    }

    if (rank < PACKAGE_RANK.pro) delete safeProfile.template;

    db.gyms[gymIndex] = { ...gym, ...safeProfile };
    await writeDB(db);
    return res.json({ message: 'Profile updated successfully' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}