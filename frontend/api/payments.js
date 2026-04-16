import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, isBefore, parseISO } from 'date-fns';
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
function hashTx(input) { return crypto.createHash('sha256').update(String(input).trim().toUpperCase()).digest('hex'); }
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
function requireMinPackage(gym, min) { return (PACKAGE_RANK[gym?.package] || 1) >= (PACKAGE_RANK[min] || 1); }
function ensureGymDefaults(gym) {
  if (typeof gym.isActive !== 'boolean') gym.isActive = true;
  if (!gym.package) gym.package = 'starter';
  if (!gym.paymentSettings) gym.paymentSettings = { methods: ['easypaisa'], easypaisaNumberEncrypted: '', jazzcashNumberEncrypted: '', bankTitle: '', bankIbanEncrypted: '' };
}

function createPaymentRecord(db, { gymKey, memberId, amount, method, monthsCovered }) {
  const memberIndex = db.members.findIndex(m => m.id === memberId && m.gymKey === gymKey);
  if (memberIndex === -1) return { error: 'Member not found' };
  const member = db.members[memberIndex];
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  const isPro = gym?.package === 'pro' || gym?.package === 'pro_plus';

  let appliedDiscount = 0;
  let finalAmount = parseFloat(amount || 0);

  // Apply Referral Discount if Pro and Balance exists
  if (isPro && member.discountBalance > 0) {
    const maxDiscount = gym.referralSettings?.maxMonthlyDiscount || 1000;
    appliedDiscount = Math.min(member.discountBalance, maxDiscount, finalAmount);
    finalAmount -= appliedDiscount;
    member.discountBalance -= appliedDiscount;
  }

  let currentEnd = member.subscriptionEndDate ? parseISO(member.subscriptionEndDate) : new Date();
  if (isBefore(currentEnd, new Date())) currentEnd = new Date();
  const newEndDate = addMonths(currentEnd, parseInt(monthsCovered, 10) || 1).toISOString();
  member.subscriptionEndDate = newEndDate;
  
  db.members[memberIndex] = member;

  if (!db.payments) db.payments = [];
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const receiptNumber = `INV-${todayStr}-${String(db.payments.length + 1).padStart(4, '0')}`;
  
  const payment = { 
    id: uuidv4(), 
    gymKey, 
    memberId, 
    amount: String(finalAmount),
    originalAmount: String(amount),
    appliedDiscount: String(appliedDiscount),
    method: method || 'Cash', 
    paymentDate: new Date().toISOString(), 
    monthsCovered: parseInt(monthsCovered, 10) || 1, 
    periodCovered: `${currentEnd.toISOString().split('T')[0]} to ${newEndDate.split('T')[0]}`, 
    receiptNumber, 
    isAdvance: parseInt(monthsCovered, 10) > 1 
  };
  db.payments.push(payment);
  return { payment, newEndDate };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await readDB();
  const url = req.url || '';

  if (req.method === 'GET' && !url.includes('pending')) {
    const { gymKey } = req.query;
    return res.json({ payments: (db.payments || []).filter(p => p.gymKey === gymKey) });
  }

  if (req.method === 'GET' && url.includes('pending')) {
    const { gymKey } = req.query;
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    ensureGymDefaults(gym || {});
    if (!requireMinPackage(gym, 'growth')) return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
    return res.json({ pendingPayments: (db.pendingPayments || []).filter(p => p.gymKey === gymKey && p.status === 'pending').map(p => ({ ...p, transactionHash: undefined })) });
  }

  if (req.method === 'POST' && !url.includes('proof') && !url.includes('verify')) {
    const { gymKey, memberId, amount, method, monthsCovered } = req.body;
    const result = createPaymentRecord(db, { gymKey, memberId, amount, method, monthsCovered });
    if (result.error) return res.status(404).json({ error: result.error });
    await writeDB(db);
    return res.json({ message: 'Payment recorded', payment: result.payment, newEndDate: result.newEndDate });
  }

  if (req.method === 'POST' && url.includes('proof')) {
    const { gymKey, memberId, amount, method, transactionId, proofNote } = req.body;
    if (!gymKey || !memberId || !amount || !method || !transactionId) return res.status(400).json({ error: 'Missing required fields' });
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    ensureGymDefaults(gym || {});
    if (!requireMinPackage(gym, 'growth')) return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
    const member = db.members.find(m => m.id === memberId && m.gymKey === gymKey);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!db.pendingPayments) db.pendingPayments = [];
    const transactionHash = hashTx(transactionId);
    const dupCount = db.pendingPayments.filter(p => p.transactionHash === transactionHash).length + (db.payments || []).filter(p => p.transactionHash === transactionHash).length;
    if (dupCount > 0) return res.status(409).json({ error: 'Transaction ID already exists' });
    const pending = { 
      id: uuidv4(), 
      gymKey, 
      memberId, 
      memberName: member.name, 
      packageName: member.packageName || 'Monthly',
      amount: String(amount), 
      method, 
      transactionHash, 
      transactionLast4: String(transactionId).slice(-4), 
      proofNote: proofNote ? String(proofNote).slice(0, 500) : '', 
      status: 'pending', 
      verificationStrength: 'high', 
      createdAt: new Date().toISOString() 
    };
    db.pendingPayments.unshift(pending);
    await writeDB(db);
    return res.json({ message: 'Payment proof submitted.', pendingPayment: { ...pending, transactionHash: undefined } });
  }

  if (req.method === 'POST' && url.includes('verify')) {
    const urlParts = req.url.split('/');
    const pendingId = urlParts[urlParts.findIndex(p => p === 'pending') + 1];
    const { gymKey, approved, monthsCovered } = req.body;
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    ensureGymDefaults(gym || {});
    if (!requireMinPackage(gym, 'growth')) return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
    if (!db.pendingPayments) db.pendingPayments = [];
    const pendingIndex = db.pendingPayments.findIndex(p => p.id === pendingId && p.gymKey === gymKey && p.status === 'pending');
    if (pendingIndex === -1) return res.status(404).json({ error: 'Pending payment not found' });
    const pending = db.pendingPayments[pendingIndex];
    if (!approved) {
      pending.status = 'rejected';
      pending.verifiedAt = new Date().toISOString();
      db.pendingPayments[pendingIndex] = pending;
      await writeDB(db);
      return res.json({ message: 'Payment proof rejected' });
    }
    const result = createPaymentRecord(db, { gymKey, memberId: pending.memberId, amount: pending.amount, method: `${pending.method} (Verified)`, monthsCovered: monthsCovered || 1 });
    if (result.error) return res.status(404).json({ error: result.error });
    result.payment.transactionHash = pending.transactionHash;
    const verificationCode = `VER-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    pending.status = 'verified';
    pending.verifiedAt = new Date().toISOString();
    pending.verificationCode = verificationCode;
    pending.receiptNumber = result.payment.receiptNumber;
    db.pendingPayments[pendingIndex] = pending;
    await writeDB(db);

    // Handle Referral Reward Logic (Pro/Pro Plus only)
    if (isPro) {
      const member = db.members.find(m => m.id === pending.memberId);
      if (member && member.referredBy && !member.referralDiscountApplied) {
        const referrerIndex = db.members.findIndex(m => m.id === member.referredBy && m.gymKey === gymKey);
        if (referrerIndex !== -1) {
          const referrerReward = gym.referralSettings?.referrerDiscount || 500;
          db.members[referrerIndex].totalReferrals = (db.members[referrerIndex].totalReferrals || 0) + 1;
          db.members[referrerIndex].discountBalance = (db.members[referrerIndex].discountBalance || 0) + referrerReward;
          
          // Mark referral as rewarded
          member.referralDiscountApplied = true;
          const memberIndex = db.members.findIndex(m => m.id === member.id);
          db.members[memberIndex] = member;

          // Note: WhatsApp messages removed as per user request
        }
      }
    }

    return res.json({
      message: 'Payment verified successfully',
      confirmation: {
        verificationCode,
        receiptNumber: result.payment.receiptNumber,
        paymentDate: result.payment.paymentDate
      },
      payment: result.payment
    });
  }
  
  if (req.method === 'POST' && url.includes('bulk-verify')) {
    const { gymKey } = req.body;
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    ensureGymDefaults(gym || {});
    if (!requireMinPackage(gym, 'growth')) return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
    if (!db.pendingPayments) db.pendingPayments = [];

    const pendingList = db.pendingPayments.filter(p => p.gymKey === gymKey && p.status === 'pending');
    let verifiedCount = 0;

    for (const pending of pendingList) {
      const result = createPaymentRecord(db, {
        gymKey,
        memberId: pending.memberId,
        amount: pending.amount,
        method: `${pending.method} (Bulk Verified)`,
        monthsCovered: 1
      });

      if (!result.error) {
        result.payment.transactionHash = pending.transactionHash;
        const verificationCode = `VER-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
        pending.status = 'verified';
        pending.verifiedAt = new Date().toISOString();
        pending.verificationCode = verificationCode;
        pending.receiptNumber = result.payment.receiptNumber;
        verifiedCount++;

        const member = db.members.find(m => m.id === pending.memberId);
        if (member && gym.whatsappStatus === 'connected') {
          const msg = `Payment confirmed ✅\nVerification Code: ${verificationCode}\nAmount: Rs ${pending.amount}\nThank you for your payment.`;
          try {
            await supabase.from('message_jobs').insert([{
              id: crypto.randomUUID(),
              gym_key: gymKey,
              member_id: member.id,
              member_name: member.name,
              member_phone: member.phone,
              message: msg,
              status: 'pending',
              created_at: new Date().toISOString()
            }]);
          } catch {}
        }
      }
    }

    await writeDB(db);
    return res.json({ message: `Bulk verification complete. ${verifiedCount} payments processed.` });
  }

  if (req.method === 'POST' && url.includes('bulk-clear')) {
    const { gymKey } = req.body;
    if (!db.pendingPayments) db.pendingPayments = [];
    const originalCount = db.pendingPayments.length;
    db.pendingPayments = db.pendingPayments.filter(p => !(p.gymKey === gymKey && p.status === 'pending'));
    await writeDB(db);
    return res.json({ message: `Queue cleared. ${originalCount - db.pendingPayments.length} pending payments removed.` });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
