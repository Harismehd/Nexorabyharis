import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { isBefore, parseISO, startOfDay } from 'date-fns';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const defaultData = { system: { globalShutdown: false, masterPassword: 'SAdmin#2026!GymFlow' }, gyms: [], members: [], payments: [], pendingPayments: [], logs: [] };

async function readDB() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return JSON.parse(JSON.stringify(defaultData));
  return { ...defaultData, ...data.payload };
}

function calculateMemberStatus(member) {
  if (!member.subscriptionEndDate) return 'Dues';
  return isBefore(startOfDay(new Date()), parseISO(member.subscriptionEndDate)) ? 'Active' : 'Dues';
}

function getMemberDueDate(member) {
  if (member.dueDate) return member.dueDate;
  if (!member.subscriptionEndDate) return 'N/A';
  const date = new Date(member.subscriptionEndDate);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function decryptSensitive(payload) {
  if (!payload || !payload.includes(':')) return payload || '';
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const key = crypto.createHash('sha256').update(process.env.PAYMENT_SECRET || 'GymFlow-Payment-Secret-Change-Now-2026').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return ''; }
}

const PACKAGE_RANK = { starter: 1, growth: 2, pro: 3, pro_plus: 4 };
function requireMinPackage(gym, min) { return (PACKAGE_RANK[gym?.package] || 1) >= (PACKAGE_RANK[min] || 1); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { gymKey } = req.body;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  if (!gym) return res.status(404).json({ error: 'Gym not found' });
  if (gym.whatsappStatus !== 'connected') return res.status(403).json({ error: 'WhatsApp session not active. Please reconnect WhatsApp.' });

  const members = db.members.filter(m => m.gymKey === gymKey && calculateMemberStatus(m) === 'Dues');
  const template = gym.template || 'Hi {name}, your gym fee Rs {amount} is due on {date}. Please pay on time.';

  const jobs = members.map(member => {
    let msg = template.replace('{name}', member.name).replace('{amount}', member.amount || '0').replace('{date}', getMemberDueDate(member));
    if (requireMinPackage(gym, 'growth')) {
      const ps = gym.paymentSettings || {};
      const methods = Array.isArray(ps.methods) ? ps.methods : [];
      const lines = [];
      if (methods.includes('easypaisa') && ps.easypaisaNumberEncrypted) lines.push(`EasyPaisa: ${decryptSensitive(ps.easypaisaNumberEncrypted)}`);
      if (methods.includes('jazzcash') && ps.jazzcashNumberEncrypted) lines.push(`JazzCash: ${decryptSensitive(ps.jazzcashNumberEncrypted)}`);
      if (methods.includes('bank') && ps.bankIbanEncrypted) lines.push(`Bank IBAN${ps.bankTitle ? ` (${ps.bankTitle})` : ''}: ${decryptSensitive(ps.bankIbanEncrypted)}`);
      if (lines.length) msg += `\n\nPayment Options:\n${lines.join('\n')}\n\nAfter payment, share transaction ID / screenshot for verification.`;
    }
    return { id: uuidv4(), gym_key: gymKey, member_id: member.id, member_name: member.name, member_phone: member.phone, message: msg, status: 'pending', created_at: new Date().toISOString() };
  });

  if (jobs.length === 0) return res.json({ message: 'No due members found. Nothing to send.' });

  const { error } = await supabase.from('message_jobs').insert(jobs);
  if (error) return res.status(500).json({ error: 'Failed to queue messages' });

  return res.json({ message: `${jobs.length} messages queued. The WhatsApp service on this gym's PC will send them shortly.` });
}