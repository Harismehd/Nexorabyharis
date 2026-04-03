import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, isBefore, parseISO, startOfDay } from 'date-fns';

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

function formatLastVisit(dateStr) {
  if (!dateStr) return '—';
  const visitDate = startOfDay(parseISO(dateStr));
  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);

  if (visitDate.getTime() === today.getTime()) return 'Today';
  if (visitDate.getTime() === yesterday.getTime()) return 'Yesterday';
  
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await readDB();

  if (req.method === 'GET') {
    const { gymKey } = req.query;
    const members = db.members.filter(m => m.gymKey === gymKey).map(m => ({ 
      ...m, 
      status: calculateMemberStatus(m), 
      dueDate: getMemberDueDate(m),
      lastVisitFormatted: formatLastVisit(m.lastVisit)
    }));
    return res.json({ members });
  }

  if (req.method === 'POST') {
    const { gymKey, name, phone, email, joiningDate, subscriptionType, amount, packageId, packageName } = req.body;
    const newMember = { 
      id: uuidv4(), gymKey, name, phone, 
      email: email || '', 
      joiningDate: joiningDate || new Date().toISOString(), 
      subscriptionType: subscriptionType || 'monthly', 
      subscriptionEndDate: '', 
      amount: amount || 0,
      packageId: packageId || null,
      packageName: packageName || null,
      lastVisit: null
    };
    db.members.push(newMember);
    await writeDB(db);
    return res.json({ message: 'Member added successfully', member: newMember });
  }

  if (req.method === 'PUT') {
    const urlParts = req.url.split('?')[0].split('/');
    const action = urlParts[urlParts.length - 1]; // 'status' or 'checkin'
    const memberId = urlParts[urlParts.length - 2];
    const { gymKey, status } = req.body;

    const memberIndex = db.members.findIndex(m => m.id === memberId && m.gymKey === gymKey);
    if (memberIndex === -1) return res.status(404).json({ error: 'Member not found' });
    const member = db.members[memberIndex];

    if (action === 'checkin') {
      member.lastVisit = new Date().toISOString();
      db.members[memberIndex] = member;
      await writeDB(db);
      return res.json({ message: 'Checked in successfully', lastVisit: member.lastVisit, lastVisitFormatted: 'Today' });
    }

    if (status === 'Active') {
      member.subscriptionEndDate = addMonths(new Date(), 1).toISOString();
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      member.subscriptionEndDate = yesterday.toISOString();
    }
    db.members[memberIndex] = member;
    await writeDB(db);
    return res.json({ message: 'Status updated', member: { ...member, status: calculateMemberStatus(member) } });
  }

  if (req.method === 'DELETE') {
    const urlParts = req.url.split('/');
    const memberId = urlParts[urlParts.length - 1];
    db.members = db.members.filter(m => m.id !== memberId);
    await writeDB(db);
    return res.json({ message: 'Member deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
