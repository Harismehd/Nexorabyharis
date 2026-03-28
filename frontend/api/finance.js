import { createClient } from '@supabase/supabase-js';
import { parseISO } from 'date-fns';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const defaultData = { system: { globalShutdown: false, masterPassword: 'SAdmin#2026!GymFlow' }, gyms: [], members: [], payments: [], pendingPayments: [], logs: [] };

async function readDB() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return JSON.parse(JSON.stringify(defaultData));
  return { ...defaultData, ...data.payload };
}

const PACKAGE_RANK = { starter: 1, growth: 2, pro: 3, pro_plus: 4 };
function requireMinPackage(gym, min) { return (PACKAGE_RANK[gym?.package] || 1) >= (PACKAGE_RANK[min] || 1); }
function ensureGymDefaults(gym) {
  if (typeof gym.isActive !== 'boolean') gym.isActive = true;
  if (!gym.package) gym.package = 'starter';
}
function calculateMemberStatus(member) {
  if (!member.subscriptionEndDate) return 'Dues';
  return new Date(member.subscriptionEndDate) > new Date() ? 'Active' : 'Dues';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { gymKey } = req.query;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  ensureGymDefaults(gym || {});
  if (!gym || !requireMinPackage(gym, 'pro_plus')) return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });

  const members = (db.members || []).filter(m => m.gymKey === gymKey);
  const payments = (db.payments || []).filter(p => p.gymKey === gymKey);
  const dueMembers = members.filter(m => calculateMemberStatus(m) === 'Dues');
  const expectedOutstanding = dueMembers.reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const monthStr = new Date().toISOString().slice(0, 7);
  const thisMonthPayments = payments.filter(p => (p.paymentDate || '').startsWith(monthStr));
  const collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const expectedThisMonth = expectedOutstanding + collectedThisMonth;
  const collectionRate = expectedThisMonth > 0 ? Math.round((collectedThisMonth / expectedThisMonth) * 100) : 100;

  const alerts = [];
  const recentCutoff = Date.now() - 40 * 24 * 60 * 60 * 1000;
  const paymentsByMember = new Map();
  payments.forEach(p => { if (!paymentsByMember.has(p.memberId)) paymentsByMember.set(p.memberId, []); paymentsByMember.get(p.memberId).push(p); });

  const activeNoRecent = members.filter(m => {
    if (calculateMemberStatus(m) !== 'Active') return false;
    const pays = paymentsByMember.get(m.id) || [];
    const latest = pays.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
    return !latest?.paymentDate || new Date(latest.paymentDate).getTime() < recentCutoff;
  });
  if (activeNoRecent.length > 0) alerts.push({ id: 'active_no_recent_payment', title: 'Active members without recent payment', detail: `${activeNoRecent.length} members show Active but no payment in last 40 days.` });

  const txMap = new Map();
  payments.forEach(p => { if (!p.transactionHash) return; txMap.set(p.transactionHash, (txMap.get(p.transactionHash) || 0) + 1); });
  const dupTx = [...txMap.entries()].filter(([, c]) => c > 1).length;
  if (dupTx > 0) alerts.push({ id: 'duplicate_tx_hash', title: 'Duplicate transaction reference detected', detail: `${dupTx} duplicated transaction references found.` });

  const todayStr = new Date().toISOString().slice(0, 10);
  const cashToday = payments.filter(p => (p.paymentDate || '').startsWith(todayStr) && String(p.method || '').toLowerCase().includes('cash'));
  if (cashToday.length >= 10) alerts.push({ id: 'cash_spike', title: 'Cash spike today', detail: `${cashToday.length} cash payments recorded today.` });

  const riskScore = Math.min(100, (activeNoRecent.length * 10) + (dupTx * 25) + (cashToday.length >= 10 ? 15 : 0) + (expectedOutstanding > 0 ? 10 : 0));
  const topDefaulters = [...dueMembers].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 8).map(m => ({ id: m.id, name: m.name, phone: m.phone, amount: m.amount }));

  res.json({ gymKey, month: monthStr, dueMembersCount: dueMembers.length, expectedOutstanding, paymentsThisMonth: thisMonthPayments.length, collectedThisMonth, expectedThisMonth, collectionRate, riskScore, alerts, topDefaulters });
}