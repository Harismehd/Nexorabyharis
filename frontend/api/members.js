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

function triggerReferralReward(db, gymKey, refereeId) {
  const referee = db.members.find(m => m.id === refereeId && m.gymKey === gymKey);
  if (!referee || !referee.referredBy || referee.referralDiscountApplied) return;

  const referrer = db.members.find(m => m.id === referee.referredBy && m.gymKey === gymKey);
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  
  if (referrer && gym) {
    const rewardAmount = gym.referralSettings?.referrerDiscount || 500;
    referrer.discountBalance = (Number(referrer.discountBalance) || 0) + Number(rewardAmount);
    referrer.totalReferrals = (Number(referrer.totalReferrals) || 0) + 1;
    
    referee.referralDiscountApplied = true;
    referee.referralStatus = 'VERIFIED';
  }
}

function triggerReferralReward(db, gymKey, refereeId) {
  const referee = db.members.find(m => m.id === refereeId && m.gymKey === gymKey);
  if (!referee || !referee.referredBy || referee.referralDiscountApplied) return false;

  const referrer = db.members.find(m => m.id === referee.referredBy && m.gymKey === gymKey);
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  
  if (referrer && gym) {
    const rewardAmount = gym.referralSettings?.referrerDiscount || 500;
    referrer.discountBalance = (Number(referrer.discountBalance) || 0) + Number(rewardAmount);
    referrer.totalReferrals = (Number(referrer.totalReferrals) || 0) + 1;
    
    referee.referralDiscountApplied = true;
    referee.referralStatus = 'VERIFIED';
    return true;
  }
  return false;
}

function syncReferralRewards(db, gymKey) {
  let changed = false;
  db.members.forEach(m => {
    if (m.gymKey === gymKey && m.referredBy && !m.referralDiscountApplied) {
      if (calculateMemberStatus(m) === 'Active') {
        if (triggerReferralReward(db, gymKey, m.id)) {
          changed = true;
        }
      }
    }
  });
  return changed;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await readDB();

  if (req.method === 'GET') {
    const { gymKey, action, memberId, phone } = req.query;

    const dbChanged = syncReferralRewards(db, gymKey);
    if (dbChanged) await writeDB(db);

    // --- MEMBER PORTAL ACTIONS ---
    if (action === 'me') {
      const member = db.members.find(m => m.gymKey === gymKey && String(m.phone).trim() === String(phone).trim());
      if (!member) return res.status(404).json({ error: 'Profile not found' });
      const gym = db.gyms.find(g => g.gymKey === gymKey);
      const referrals = db.members
        .filter(m => m.gymKey === gymKey && m.referredBy === member.id)
        .map(m => ({ 
          name: m.name, 
          joiningDate: m.joiningDate, 
          rewardStatus: m.referralStatus || 'PENDING' 
        }));

      return res.json({
        profile: { ...member, status: calculateMemberStatus(member) },
        gymInfo: { name: gym?.name, address: gym?.address, contact: gym?.contact, package: gym?.package },
        referrals
      });
    }

    if (action === 'payments') {
      const confirmed = db.payments.filter(p => p.gymKey === gymKey && p.memberId === memberId);
      const pending = (db.pendingPayments || [])
                        .filter(p => p.gymKey === gymKey && p.memberId === memberId && p.status === 'pending')
                        .map(p => ({ ...p, method: `${p.method} (Pending Verification)`, isPending: true }));
      
      const combined = [...pending, ...confirmed].sort((a,b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
      return res.json({ payments: combined });
    }

    if (action === 'attendance') {
      // For now, use logs that match member checkins or mock from lastVisit
      // In a real scenario, you'd have an attendance table.
      // We'll return logs for this member.
      const logs = db.logs.filter(l => l.gymKey === gymKey && l.memberPhone === phone).slice(0, 20);
      return res.json({ attendance: logs });
    }

    const members = db.members.filter(m => m.gymKey === gymKey).map(m => {
      // Lazy generate referral code if missing
      if (!m.referralCode) {
        const cleanName = m.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        m.referralCode = `${cleanName}-${randomSuffix}`;
        dbChanged = true;
      }
      
      const referrer = db.members.find(rm => rm.id === m.referredBy);
      
      return { 
        ...m, 
        referredByName: referrer ? referrer.name : null,
        status: calculateMemberStatus(m), 
        dueDate: getMemberDueDate(m),
        lastVisitFormatted: formatLastVisit(m.lastVisit)
      };
    });

    if (dbChanged) {
      db.members = db.members.map(dm => {
        const updated = members.find(um => um.id === dm.id);
        return updated ? { ...dm, referralCode: updated.referralCode } : dm;
      });
      await writeDB(db);
    }

    return res.json({ members });
  }

  if (req.method === 'POST') {
    const { gymKey, name, phone, email, joiningDate, subscriptionType, amount, packageId, packageName, referredByCode } = req.body;
    
    const gym = db.gyms.find(g => g.gymKey === gymKey);
    const isPro = gym?.package === 'pro' || gym?.package === 'pro_plus';

    // 1. Generate referral code
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referralCode = `${cleanName}-${randomSuffix}`;

    let referredBy = null;
    let initialDiscount = 0;
    let referredByName = '';

    // 2. Validate referral code if provided and Pro/Pro Plus
    if (referredByCode && isPro) {
      const referrer = db.members.find(m => m.gymKey === gymKey && m.referralCode === referredByCode);
      if (referrer) {
        if (referrer.phone !== phone) { // Avoid self-referral
          referredBy = referrer.id;
          referredByName = referrer.name;
          initialDiscount = gym.referralSettings?.newMemberReward || 250; 
        }
      }
    }

    const newMember = { 
      id: uuidv4(), gymKey, name, phone, 
      email: email || '', 
      joiningDate: joiningDate || new Date().toISOString(), 
      subscriptionType: subscriptionType || 'monthly', 
      subscriptionEndDate: '', 
      amount: amount || 0,
      packageId: packageId || null,
      packageName: packageName || null,
      lastVisit: null,
      // Referral System Fields
      referralCode,
      referredBy,
      referredByName,
      referralStatus: referredBy ? 'PENDING' : '',
      referralDiscountApplied: false,
      totalReferrals: 0,
      discountBalance: initialDiscount
    };
    db.members.push(newMember);
    await writeDB(db);
    return res.json({ message: 'Member added successfully', member: newMember });
  }

  if (req.method === 'PUT') {
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    // URL patterns:
    // /api/members/:id/status -> action='status', memberId=urlParts[2]
    // /api/members/:id/checkin -> action='checkin', memberId=urlParts[2]
    // /api/members/:id -> action=undefined, memberId=urlParts[2]
    
    // Default structure for nexora-api/members/[id]/[action]
    // urlParts: ['api', 'members', 'id', 'action']
    const action = urlParts.length > 3 ? urlParts[3] : undefined;
    const memberId = urlParts[2];
    const { gymKey, status, name, phone, email, amount, packageName, packageId } = req.body;

    const memberIndex = db.members.findIndex(m => m.id === memberId && m.gymKey === gymKey);
    if (memberIndex === -1) return res.status(404).json({ error: 'Member not found' });
    const member = db.members[memberIndex];
    const gym = db.gyms.find(g => g.gymKey === gymKey);

    if (action === 'checkin') {
      member.lastVisit = new Date().toISOString();
      
      // Log attendance for history
      if (!db.logs) db.logs = [];
      db.logs.push({
        id: uuidv4(),
        gymKey,
        memberName: member.name,
        memberPhone: member.phone,
        message: 'Manual Check-in',
        status: 'Attendance',
        timestamp: member.lastVisit
      });

      db.members[memberIndex] = member;
      await writeDB(db);
      return res.json({ message: 'Checked in successfully', lastVisit: member.lastVisit, lastVisitFormatted: 'Today' });
    }

    if (action === 'status') {
      if (status === 'Active') {
        const isStarter = gym?.package === 'starter';
        if (isStarter) {
          // Direct update for Starter
          let currentEnd = member.subscriptionEndDate ? parseISO(member.subscriptionEndDate) : new Date();
          if (isBefore(currentEnd, new Date())) currentEnd = new Date();
          const newEndDate = addMonths(currentEnd, 1).toISOString();
          member.subscriptionEndDate = newEndDate;
          
          if (!db.payments) db.payments = [];
          const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
          const receiptNumber = `INV-${todayStr}-${String(db.payments.length + 1).padStart(4, '0')}`;
          
          let appliedDiscount = 0;
          let finalAmount = parseFloat(member.amount || 0);
          const isPro = gym?.package === 'pro' || gym?.package === 'pro_plus';
          
          if (isPro && member.discountBalance > 0) {
            const maxDisc = gym.referralSettings?.maxMonthlyDiscount || 1000;
            appliedDiscount = Math.min(member.discountBalance, maxDisc, finalAmount);
            finalAmount -= appliedDiscount;
            member.discountBalance -= appliedDiscount;
          }

          db.payments.push({
            id: uuidv4(), gymKey, memberId, 
            amount: String(finalAmount),
            originalAmount: String(member.amount || 0),
            appliedDiscount: String(appliedDiscount),
            method: 'Direct (Starter)', paymentDate: new Date().toISOString(),
            monthsCovered: 1, periodCovered: `${currentEnd.toISOString().split('T')[0]} to ${newEndDate.split('T')[0]}`,
            receiptNumber
          });
          
          db.members[memberIndex] = member;
          
          // Trigger referral reward
          triggerReferralReward(db, gymKey, memberId);

          await writeDB(db);
          return res.json({ message: 'Marked as Paid. Dashboard updated.', member: { ...member, status: 'Active' } });
        }

        // Queue for others
        if (!db.pendingPayments) db.pendingPayments = [];
        const alreadyPending = db.pendingPayments.some(p => p.memberId === memberId && p.status === 'pending');
        if (alreadyPending) return res.status(400).json({ error: 'Verification already pending' });

        const pending = {
          id: uuidv4(), gymKey, memberId, memberName: member.name, 
          amount: String(member.amount || 0), packageName: member.packageName || 'Monthly',
          method: 'Manual Toggle', transactionHash: 'INTERNAL-' + uuidv4().slice(0, 8),
          transactionLast4: 'OFFLINE', proofNote: 'Marked as Paid',
          status: 'pending', isInternal: true, createdAt: new Date().toISOString()
        };
        db.pendingPayments.unshift(pending);
        await writeDB(db);
        return res.json({ message: 'Added to verification queue', member: { ...member, status: 'Due' } });
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        member.subscriptionEndDate = yesterday.toISOString();
        db.members[memberIndex] = member;
        await writeDB(db);
        return res.json({ message: 'Marked as Unpaid', member: { ...member, status: 'Due' } });
      }
    }

    // Direct Edit
    if (!action) {
      db.members[memberIndex] = {
        ...member,
        name: name || member.name,
        phone: phone || member.phone,
        email: email || member.email,
        amount: amount !== undefined ? amount : member.amount,
        packageName: packageName !== undefined ? packageName : member.packageName,
        packageId: packageId !== undefined ? packageId : member.packageId
      };
      await writeDB(db);
      return res.json({ message: 'Member updated', member: db.members[memberIndex] });
    }
  }

  if (req.method === 'DELETE') {
    // Parse ID from URL, stripping query params
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const memberId = urlParts[urlParts.length - 1];
    db.members = db.members.filter(m => m.id !== memberId);
    await writeDB(db);
    return res.json({ message: 'Member deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
