const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { readDB, writeDB, defaultData } = require('./db');
const { initWhatsApp, getQR, sendMessage, disconnect, activeSockets } = require('./whatsapp');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

function ensureSystem(db) {
  if (!db.system) {
    db.system = { ...defaultData.system };
  } else {
    if (typeof db.system.globalShutdown !== 'boolean') db.system.globalShutdown = false;
    if (!db.system.masterPassword) db.system.masterPassword = defaultData.system.masterPassword;
  }
}

function getSecurityKey() {
  // Keep key out of source control in production.
  return process.env.PAYMENT_SECRET || 'Nexora-Payment-Secret-Change-Now-2026';
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
  } catch {
    return '';
  }
}

function hashTransactionId(input) {
  return crypto.createHash('sha256').update(String(input).trim().toUpperCase()).digest('hex');
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

const PACKAGE_RANK = { starter: 1, growth: 2, pro: 3, pro_plus: 4 };

function getPackageRank(pkg) {
  const v = String(pkg || 'starter').toLowerCase();
  return PACKAGE_RANK[v] || PACKAGE_RANK.starter;
}

function ensureGymDefaults(gym) {
  if (typeof gym.isActive !== 'boolean') gym.isActive = true;
  if (!gym.package) gym.package = 'starter';
  if (gym.deviceLimit === undefined) gym.deviceLimit = 5;
  if (gym.isProfileLocked === undefined) gym.isProfileLocked = false;
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

function requireMinPackage(gym, minPackage) {
  return getPackageRank(gym?.package) >= getPackageRank(minPackage);
}

// Helper to update DB
async function updateDB(collection, filterFn, updateFn) {
  const db = await readDB();
  const index = db[collection].findIndex(filterFn);
  if (index !== -1) {
    db[collection][index] = updateFn(db[collection][index]);
  } else {
    // Treat updateFn as push new item if it doesn't try to reuse existing
    db[collection].push(updateFn({}));
  }
  await writeDB(db);
}

// ========================
// AUTHENTICATION & ADMIN
// ========================

app.post('/api/auth/login', async (req, res) => {
  const { gymKey, password } = req.body;
  const db = await readDB();
  ensureSystem(db);
  let dbTouched = false;

  // 1. Check for Master Admin Login
  if (gymKey === 'ADMIN') {
    if (password === db.system.masterPassword) {
      return res.json({ message: 'Welcome, Master Admin', gymKey: 'ADMIN', role: 'admin' });
    } else {
      return res.status(401).json({ error: 'Invalid Master Password' });
    }
  }

  // 2. Enforce Global Kill Switch
  if (db.system.globalShutdown) {
    return res.status(403).json({ error: 'SYSTEM_OFFLINE', message: 'Platform is completely offline. Please contact the provider.' });
  }

  // 3. Normal Gym Login
  let gym = db.gyms.find(g => g.gymKey === gymKey);

  // Secure: Reject random keys. Keys must be generated via Admin UI.
  if (!gym) {
    return res.status(401).json({ error: 'Gym Key not found. Contact your provider.' });
  } else if (gym.password !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const before = JSON.stringify(gym);
  ensureGymDefaults(gym);
  if (before !== JSON.stringify(gym)) {
    dbTouched = true;
  }

  // 4. Enforce Device Login Limit (Task 4)
  if (!db.activeSessions) db.activeSessions = [];
  
  // Clean up old sessions (> 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.activeSessions = db.activeSessions.filter(s => s.lastActive > oneDayAgo);
  
  const gymSessions = db.activeSessions.filter(s => s.gymKey === gymKey);
  const deviceId = req.headers['x-device-id'] || req.ip;
  const existingSession = gymSessions.find(s => s.deviceId === deviceId);

  if (!existingSession && gymSessions.length >= (gym.deviceLimit || 5)) {
    return res.status(403).json({ 
      error: 'DEVICE_LIMIT_REACHED', 
      message: `Device limit reached (${gym.deviceLimit || 5}). Log out from another device first.` 
    });
  }

  // Update or create session
  const sessionId = uuidv4();
  if (existingSession) {
    existingSession.lastActive = new Date().toISOString();
  } else {
    db.activeSessions.push({
      id: sessionId,
      gymKey,
      deviceId,
      loginTime: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });
  }
  dbTouched = true;

  if (dbTouched) await writeDB(db);

  // 5. Enforce Ban (Suspension)
  if (gym.isActive === false) {
    return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Please contact the provider to resolve this.' });
  }

  res.json({ 
    message: 'Login successful', 
    gymKey, 
    role: 'gym', 
    package: gym.package || 'starter',
    sessionId: existingSession ? existingSession.id : sessionId 
  });
});

// Middleware for Admin validation (Simplified for this architecture)
const verifyAdmin = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const db = await readDB();
    ensureSystem(db);
    if (adminKey && adminKey === db.system.masterPassword) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (e) {
    next(e);
  }
};

// Enforce global shutdown across all gym endpoints
app.use('/api', async (req, res, next) => {
  try {
    const db = await readDB();
    ensureSystem(db);
    if (!db.system.globalShutdown) return next();

    if (req.path === '/auth/login') return next();
    if (req.path.startsWith('/admin')) return next();

    return res.status(503).json({ error: 'SYSTEM_OFFLINE', message: 'Platform is completely offline. Please contact the provider.' });
  } catch (e) {
    next(e);
  }
});

// Admin Endpoints
app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
  const db = await readDB();
  res.json({
    system: db.system || { globalShutdown: false },
    gyms: db.gyms.map(g => ({
      gymKey: g.gymKey,
      name: g.name || 'Unnamed Gym',
      isActive: g.isActive !== false, // Default to true
      package: g.package || 'starter',
      deviceLimit: g.deviceLimit || 5, // Task 4
      isProfileLocked: g.isProfileLocked === true,
      whatsappStatus: g.whatsappStatus,
      memberCount: db.members.filter(m => m.gymKey === g.gymKey).length
    }))
  });
});

app.get('/api/admin/gyms', verifyAdmin, async (req, res) => {
  const db = await readDB();
  res.json({
    gyms: db.gyms.map(g => ({
      gymKey: g.gymKey,
      name: g.name || 'Unnamed Gym',
      isActive: g.isActive !== false,
      package: g.package || 'starter',
      deviceLimit: g.deviceLimit || 5,
      isProfileLocked: g.isProfileLocked === true,
      whatsappStatus: g.whatsappStatus,
      memberCount: db.members.filter(m => m.gymKey === g.gymKey).length
    }))
  });
});

app.post('/api/admin', verifyAdmin, async (req, res) => {
  const { action } = req.query;
  const { gymKey, field, value, password, package: pkg, limit } = req.body;
  const db = await readDB();

  if (action === 'create') {
    if (db.gyms.find(g => g.gymKey === gymKey)) return res.status(400).json({ error: 'Gym Key already exists' });
    const newGym = { 
        gymKey, password, isActive: true, package: pkg || 'starter', 
        autoMessagingEnabled: false, whatsappStatus: 'disconnected', 
        paymentSettings: { methods: ['easypaisa'], easypaisaNumberEncrypted: '', jazzcashNumberEncrypted: '', bankTitle: '', bankIbanEncrypted: '' } 
    };
    db.gyms.push(newGym);
    await writeDB(db);
    return res.json({ message: 'Gym Key created successfully', gym: newGym });
  }

  if (action === 'update') {
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    if (field === 'deviceLimit') db.gyms[gymIndex].deviceLimit = parseInt(value, 10) || 5;
    else db.gyms[gymIndex][field] = value;
    await writeDB(db);
    return res.json({ message: `Updated ${field} successfully` });
  }

  if (action === 'toggle') {
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    db.gyms[gymIndex].isActive = !(db.gyms[gymIndex].isActive !== false);
    await writeDB(db);
    return res.json({ message: `Gym ${db.gyms[gymIndex].isActive ? 'Activated' : 'Suspended'}` });
  }

  if (action === 'package') {
    const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
    if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
    db.gyms[gymIndex].package = pkg || 'starter';
    await writeDB(db);
    return res.json({ message: `Package updated to ${db.gyms[gymIndex].package.toUpperCase()}` });
  }

  if (action === 'shutdown') {
    if (!db.system) db.system = { globalShutdown: false };
    db.system.globalShutdown = !db.system.globalShutdown;
    await writeDB(db);
    return res.json({ message: `Global platform is now ${db.system.globalShutdown ? 'OFFLINE' : 'ONLINE'}` });
  }

  res.status(400).json({ error: 'Invalid action' });
});

// ========================
// WHATSAPP API
// ========================
app.get('/api/whatsapp/status', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  const sessionActive = activeSockets?.has(gymKey);
  const status = gym && gym.whatsappStatus === 'connected' && sessionActive ? 'connected' : 'disconnected';
  res.json({ status });
});

app.post('/api/whatsapp/connect', async (req, res) => {
  const { gymKey } = req.body;
  try {
    const onStatusChange = async (key, status) => {
      await updateDB('gyms', g => g.gymKey === key, g => ({ ...g, whatsappStatus: status }));
    };
    await onStatusChange(gymKey, 'initializing');
    await initWhatsApp(gymKey, onStatusChange);
    res.json({ message: 'Initializing WhatsApp connection' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/qr', async (req, res) => {
  const { gymKey } = req.query;
  const qr = getQR(gymKey);
  if (qr) {
    const qrcode = require('qrcode');
    const qrDataURL = await qrcode.toDataURL(qr);
    return res.json({ qr: qrDataURL });
  }
  res.json({ qr: null });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  const { gymKey } = req.body;
  const onStatusChange = async (key, status) => {
    await updateDB('gyms', g => g.gymKey === key, g => ({ ...g, whatsappStatus: status }));
  };
  await disconnect(gymKey, onStatusChange);
  res.json({ message: 'Disconnected' });
});

// ========================
// MEMBERS && UPLOAD
// ========================
const { addMonths, isBefore, parseISO, startOfDay } = require('date-fns');

function calculateMemberStatus(member) {
  if (!member.subscriptionEndDate) return 'Dues';
  const end = parseISO(member.subscriptionEndDate);
  return isBefore(startOfDay(new Date()), end) ? 'Active' : 'Dues';
}

function getMemberDueDate(member) {
  if (member.dueDate) return member.dueDate;
  if (!member.subscriptionEndDate) return 'N/A';
  const date = new Date(member.subscriptionEndDate);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

app.get('/api/members', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const members = db.members.filter(m => m.gymKey === gymKey).map(m => ({
    ...m,
    status: calculateMemberStatus(m),
    dueDate: getMemberDueDate(m)
  }));
  res.json({ members });
});

app.post('/api/members', async (req, res) => {
  const { gymKey, name, phone, email, joiningDate, subscriptionType, amount } = req.body;
  const db = await readDB();
  
  const newMember = {
    id: uuidv4(),
    gymKey,
    name,
    phone,
    email: email || '',
    joiningDate: joiningDate || new Date().toISOString(),
    subscriptionType: subscriptionType || 'monthly',
    subscriptionEndDate: '', // No payment yet
    amount: amount || 0
  };
  
  db.members.push(newMember);
  await writeDB(db);
  res.json({ message: 'Member added successfully', member: newMember });
});

app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const { gymKey, name, phone, email, amount, packageName, packageId } = req.body;
  const db = await readDB();
  const index = db.members.findIndex(m => m.id === id && m.gymKey === gymKey);
  if (index === -1) return res.status(404).json({ error: 'Member not found' });

  const updatedMember = {
    ...db.members[index],
    name: name || db.members[index].name,
    phone: phone || db.members[index].phone,
    email: email || db.members[index].email,
    amount: amount !== undefined ? amount : db.members[index].amount,
    packageName: packageName !== undefined ? packageName : db.members[index].packageName,
    packageId: packageId !== undefined ? packageId : db.members[index].packageId
  };

  db.members[index] = updatedMember;
  await writeDB(db);
  res.json({ message: 'Member updated successfully', member: updatedMember });
});

app.post('/api/members/upload', upload.single('file'), async (req, res) => {
  const { gymKey } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const workbook = xlsx.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const db = await readDB();
  // Don't overwrite, just append new ones for Phase 2
  let addedCount = 0;

  for (let row of data) {
    const keys = Object.keys(row);
    const nameKey = keys.find(k => k.toLowerCase().includes('name'));
    const phoneKey = keys.find(k => k.toLowerCase().includes('phone'));
    const amountKey = keys.find(k => k.toLowerCase().includes('amount'));

    if (nameKey && phoneKey) {
      db.members.push({
        id: uuidv4(),
        gymKey,
        name: String(row[nameKey]),
        phone: String(row[phoneKey]),
        email: '',
        joiningDate: new Date().toISOString(),
        subscriptionType: 'monthly',
        subscriptionEndDate: '',
        amount: amountKey ? String(row[amountKey]) : '0'
      });
      addedCount++;
    }
  }

  await writeDB(db);
  res.json({ message: 'Upload successful', count: addedCount });
});

app.delete('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  
  // Task 6.4: Cascading deletion
  db.members = db.members.filter(m => m.id !== id);
  if (db.payments) db.payments = db.payments.filter(p => p.memberId !== id);
  if (db.attendance) db.attendance = db.attendance.filter(a => a.memberId !== id);
  if (db.pendingPayments) db.pendingPayments = db.pendingPayments.filter(p => p.memberId !== id);
  
  await writeDB(db);
  res.json({ message: 'Member and related records deleted' });
});

app.put('/api/members/:id/status', async (req, res) => {
  const { id } = req.params;
  const { gymKey, status } = req.body;
  const db = await readDB();
  
  const memberIndex = db.members.findIndex(m => m.id === id && m.gymKey === gymKey);
  if (memberIndex === -1) return res.status(404).json({ error: 'Member not found' });
  
  const member = db.members[memberIndex];
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  
  if (status === 'Active') {
    // Phase 4: Starter Package Bypass Logic
    if (gym && gym.package === 'starter') {
      const result = createPaymentRecord(db, {
        gymKey,
        memberId: id,
        amount: String(member.amount || 0),
        method: 'Direct (Starter)',
        monthsCovered: 1
      });
      if (result.error) return res.status(404).json({ error: result.error });
      await writeDB(db);
      return res.json({ 
        message: 'Marked as Paid. Dashboard tracking updated.', 
        member: { ...db.members[memberIndex], status: 'Active' } 
      });
    }

    // Growth/Pro: Traditional Verification Queue
    if (!db.pendingPayments) db.pendingPayments = [];
    const alreadyPending = db.pendingPayments.some(p => p.memberId === id && p.status === 'pending');
    if (alreadyPending) return res.status(400).json({ error: 'Verification already pending for this member' });

    const pending = {
      id: uuidv4(),
      gymKey,
      memberId: id,
      memberName: member.name,
      amount: String(member.amount || 0),
      packageName: member.packageName || 'Monthly',
      method: 'Manual Toggle',
      transactionHash: 'INTERNAL-' + uuidv4().slice(0, 8),
      transactionLast4: 'OFFLINE',
      proofNote: 'Marked as Paid by Owner',
      status: 'pending',
      verificationStrength: 'high',
      isInternal: true,
      createdAt: new Date().toISOString()
    };
    
    db.pendingPayments.unshift(pending);
    await writeDB(db);
    res.json({ message: 'Added to verification queue', member: { ...member, status: 'Due' } });
  } else {
    // Mark as Dues (Unpaid) immediately
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    member.subscriptionEndDate = yesterday.toISOString();
    db.members[memberIndex] = member;
    await writeDB(db);
    res.json({ message: 'Marked as Unpaid', member: { ...member, status: 'Due' } });
  }
});

// ========================
// PAYMENTS
// ========================
function createPaymentRecord(db, { gymKey, memberId, amount, method, monthsCovered }) {
  const memberIndex = db.members.findIndex(m => m.id === memberId && m.gymKey === gymKey);
  if (memberIndex === -1) return { error: 'Member not found' };

  const member = db.members[memberIndex];
  let currentEnd = member.subscriptionEndDate ? parseISO(member.subscriptionEndDate) : new Date();
  if (isBefore(currentEnd, new Date())) currentEnd = new Date();

  const newEndDate = addMonths(currentEnd, parseInt(monthsCovered, 10) || 1).toISOString();
  member.subscriptionEndDate = newEndDate;
  db.members[memberIndex] = member;

  if (!db.payments) db.payments = [];
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq = String(db.payments.length + 1).padStart(4, '0');
  const receiptNumber = `INV-${todayStr}-${seq}`;
  const paymentDate = new Date().toISOString();

  const payment = {
    id: uuidv4(),
    gymKey,
    memberId,
    amount,
    method: method || 'Cash',
    paymentDate,
    monthsCovered: parseInt(monthsCovered, 10) || 1,
    periodCovered: `${currentEnd.toISOString().split('T')[0]} to ${newEndDate.split('T')[0]}`,
    receiptNumber,
    isAdvance: parseInt(monthsCovered, 10) > 1
  };

  db.payments.push(payment);
  return { payment, newEndDate };
}

app.get('/api/payments', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const payments = (db.payments || []).filter(p => p.gymKey === gymKey);
  res.json({ payments });
});

// ========================
// FINANCE GUARD (PRO PLUS)
// ========================
app.get('/api/finance/guard', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  ensureGymDefaults(gym || {});
  if (!gym || !requireMinPackage(gym, 'pro_plus')) {
    return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
  }

  const members = (db.members || []).filter(m => m.gymKey === gymKey);
  const payments = (db.payments || []).filter(p => p.gymKey === gymKey);

  const dueMembers = members.filter(m => calculateMemberStatus(m) === 'Dues');
  const expectedOutstanding = dueMembers.reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const monthStr = new Date().toISOString().slice(0, 7);
  const thisMonthPayments = payments.filter(p => (p.paymentDate || '').startsWith(monthStr));
  const collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Heuristic: expected this month = outstanding dues + (payments this month) to approximate monthly target
  const expectedThisMonth = expectedOutstanding + collectedThisMonth;
  const collectionRate = expectedThisMonth > 0 ? Math.round((collectedThisMonth / expectedThisMonth) * 100) : 100;

  // Leak alerts (heuristics that catch common cash-leak behavior)
  const alerts = [];

  // 1) Active members without a recent payment (likely manually toggled paid)
  // This is the primary "Ghost Active" detection
  const now = Date.now();
  const recentWindowDays = 40;
  const recentCutoff = now - recentWindowDays * 24 * 60 * 60 * 1000;
  
  const paymentsByMember = new Map();
  payments.forEach(p => {
    if (!paymentsByMember.has(p.memberId)) paymentsByMember.set(p.memberId, []);
    paymentsByMember.get(p.memberId).push(p);
  });

  const attendanceByMember = new Map();
  if (db.attendance) {
    db.attendance.filter(a => a.gymKey === gymKey).forEach(a => {
        if (!attendanceByMember.has(a.memberId)) attendanceByMember.set(a.memberId, []);
        attendanceByMember.get(a.memberId).push(a);
    });
  }

  const activeNoRecentPayment = members.filter(m => {
    if (calculateMemberStatus(m) !== 'Active') return false;
    const memberPays = paymentsByMember.get(m.id) || [];
    const latest = memberPays.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
    if (!latest?.paymentDate) return true;
    return new Date(latest.paymentDate).getTime() < recentCutoff;
  });

  if (activeNoRecentPayment.length > 0) {
    alerts.push({
      id: 'active_no_recent_payment',
      title: 'Ghost Actives Detected',
      detail: `${activeNoRecentPayment.length} members are set to 'Active' but haven't paid in 40+ days. This indicates status overrides or missed billing entries.`
    });
  }

  // 2) Attendance/Status Mismatch (Dues but still coming?)
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const duesStillAttending = members.filter(m => {
    if (calculateMemberStatus(m) !== 'Dues') return false;
    const memberAtt = attendanceByMember.get(m.id) || [];
    return memberAtt.some(a => new Date(a.timestamp).getTime() > sevenDaysAgo);
  });

  if (duesStillAttending.length > 0) {
    alerts.push({
      id: 'dues_attending',
      title: 'Dues Mismatch (Leak Alert)',
      detail: `${duesStillAttending.length} members are marked as 'Dues' but have checked in this week. This is a primary source of immediate revenue leak.`
    });
  }

  // 3) Stale Dues (>60 days unpaid)
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  const staleDues = members.filter(m => {
    if (calculateMemberStatus(m) !== 'Dues') return false;
    if (!m.subscriptionEndDate) return false;
    return new Date(m.subscriptionEndDate).getTime() < sixtyDaysAgo;
  });

  if (staleDues.length > 0) {
    alerts.push({
      id: 'stale_dues',
      title: 'Stale Dues (Lost Revenue)',
      detail: `${staleDues.length} members have been outstanding for over 2 months. Consider official suspension or recovery reach-out.`
    });
  }

  // 4) Duplicate transaction hash occurrences (should not happen)
  const txMap = new Map();
  payments.forEach(p => {
    if (!p.transactionHash) return;
    txMap.set(p.transactionHash, (txMap.get(p.transactionHash) || 0) + 1);
  });
  const dupTx = [...txMap.entries()].filter(([, c]) => c > 1).length;
  if (dupTx > 0) {
    alerts.push({
      id: 'duplicate_tx_hash',
      title: 'Transaction Reference Collision',
      detail: `${dupTx} duplicate transaction hashes found. Investigate for potential fraud or double-entry.`
    });
  }

  // 5) Cash spike detection
  const todayStr = new Date().toISOString().slice(0, 10);
  const cashToday = payments.filter(p => (p.paymentDate || '').startsWith(todayStr) && String(p.method || '').toLowerCase().includes('cash'));
  if (cashToday.length >= 10) {
    alerts.push({
      id: 'cash_spike',
      title: 'Cash Flow Anomaly',
      detail: `${cashToday.length} cash entries recorded today. Ensure cash drawer matches records to prevent leakage.`
    });
  }

  // Risk score (0-100)
  const riskScore = Math.min(
    100,
    (activeNoRecentPayment.length * 12) +
      (duesStillAttending.length * 15) +
      (staleDues.length * 5) +
      (dupTx * 25) +
      (cashToday.length >= 10 ? 10 : 0)
  );

  const topDefaulters = [...dueMembers]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 8)
    .map(m => ({ id: m.id, name: m.name, phone: m.phone, amount: m.amount }));

  res.json({
    gymKey,
    month: monthStr,
    dueMembersCount: dueMembers.length,
    expectedOutstanding,
    paymentsThisMonth: thisMonthPayments.length,
    collectedThisMonth,
    expectedThisMonth,
    collectionRate,
    riskScore,
    alerts,
    topDefaulters
  });
});

app.post('/api/payments', async (req, res) => {
  const { gymKey, memberId, amount, method, monthsCovered } = req.body;
  const db = await readDB();
  const result = createPaymentRecord(db, { gymKey, memberId, amount, method, monthsCovered });
  if (result.error) return res.status(404).json({ error: result.error });
  await writeDB(db);
  
  res.json({ message: 'Payment recorded', payment: result.payment, newEndDate: result.newEndDate });
});

app.get('/api/payments/pending', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  ensureGymDefaults(gym || {});
  if (!requireMinPackage(gym, 'growth')) {
    return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
  }
  const pending = (db.pendingPayments || [])
    .filter(p => p.gymKey === gymKey && p.status === 'pending')
    .map(p => ({
      ...p,
      transactionHash: undefined
    }));
  res.json({ pendingPayments: pending });
});

app.post('/api/payments/proof', async (req, res) => {
  const { gymKey, memberId, amount, method, transactionId, proofNote } = req.body;
  if (!gymKey || !memberId || !amount || !method || !transactionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  ensureGymDefaults(gym || {});
  if (!requireMinPackage(gym, 'growth')) {
    return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
  }
  const member = db.members.find(m => m.id === memberId && m.gymKey === gymKey);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (!db.pendingPayments) db.pendingPayments = [];

  const transactionHash = hashTransactionId(transactionId);
  const duplicateCount = db.pendingPayments.filter(p => p.transactionHash === transactionHash).length
    + (db.payments || []).filter(p => p.transactionHash === transactionHash).length;
  if (duplicateCount > 0) {
    return res.status(409).json({ error: 'Transaction ID already exists' });
  }

  const pending = {
    id: uuidv4(),
    gymKey,
    memberId,
    amount: String(amount),
    memberName: member.name,
    packageName: member.packageName || 'Monthly',
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

  res.json({
    message: 'Payment proof submitted. Ready for owner verification.',
    pendingPayment: { ...pending, transactionHash: undefined }
  });
});


app.post('/api/payments/pending/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { gymKey, approved, monthsCovered } = req.body;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  ensureGymDefaults(gym || {});
  if (!requireMinPackage(gym, 'growth')) {
    return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
  }
  if (!db.pendingPayments) db.pendingPayments = [];

  const pendingIndex = db.pendingPayments.findIndex(p => p.id === id && p.gymKey === gymKey && p.status === 'pending');
  if (pendingIndex === -1) return res.status(404).json({ error: 'Pending payment not found' });
  const pending = db.pendingPayments[pendingIndex];

  if (!approved) {
    pending.status = 'rejected';
    pending.verifiedAt = new Date().toISOString();
    db.pendingPayments[pendingIndex] = pending;
    await writeDB(db);
    return res.json({ message: 'Payment proof rejected' });
  }

  const result = createPaymentRecord(db, {
    gymKey,
    memberId: pending.memberId,
    amount: pending.amount,
    method: `${pending.method} (Verified)`,
    monthsCovered: monthsCovered || 1
  });
  if (result.error) return res.status(404).json({ error: result.error });

  result.payment.transactionHash = pending.transactionHash;
  const verificationCode = `VER-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

  pending.status = 'verified';
  pending.verifiedAt = new Date().toISOString();
  pending.verificationCode = verificationCode;
  pending.receiptNumber = result.payment.receiptNumber;
  db.pendingPayments[pendingIndex] = pending;
  await writeDB(db);

  const member = db.members.find(m => m.id === pending.memberId);
  if (member && gym && gym.whatsappStatus === 'connected') {
    const confirmationMsg = `Payment confirmed ✅\nVerification Code: ${verificationCode}\nAmount: Rs ${pending.amount}\nThank you for your payment.`;
    try {
      await sendMessage(gymKey, member.phone, confirmationMsg);
    } catch {
      // Keep success status even if confirmation message fails.
    }
  }

  res.json({
    message: 'Payment verified successfully',
    confirmation: {
      verificationCode,
      receiptNumber: result.payment.receiptNumber,
      paymentDate: result.payment.paymentDate,
      strength: 'high'
    },
    payment: result.payment
  });
});

app.post('/api/payments/pending/bulk-verify', async (req, res) => {
  const { gymKey } = req.body;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  if (!gym || !requireMinPackage(gym, 'growth')) return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
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
        try { sendMessage(gymKey, member.phone, msg); } catch {}
      }
    }
  }

  await writeDB(db);
  res.json({ message: `Bulk verification complete. ${verifiedCount} payments processed.` });
});

app.post('/api/payments/pending/bulk-clear', async (req, res) => {
  const { gymKey } = req.body;
  const db = await readDB();
  if (!db.pendingPayments) db.pendingPayments = [];
  
  const originalCount = db.pendingPayments.length;
  db.pendingPayments = db.pendingPayments.filter(p => !(p.gymKey === gymKey && p.status === 'pending'));
  const clearedCount = originalCount - db.pendingPayments.length;
  
  await writeDB(db);
  res.json({ message: `Queue cleared. ${clearedCount} pending payments removed.` });
});

// ========================
// SETTINGS / TEMPLATE
// ========================
app.get('/api/template', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  res.json({ template: gym ? gym.template : '' });
});

app.post('/api/template', async (req, res) => {
  const { gymKey, template } = req.body;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  ensureGymDefaults(gym || {});
  if (!gym || !requireMinPackage(gym, 'pro')) {
    return res.status(403).json({ error: 'FEATURE_NOT_ENABLED' });
  }
  await updateDB('gyms', g => g.gymKey === gymKey, g => ({ ...g, template }));
  res.json({ message: 'Template updated successfully' });
});

// ========================
// REMINDERS
// ========================
const delay = ms => new Promise(res => setTimeout(res, ms));

app.post('/api/messages/send', async (req, res) => {
  const { gymKey } = req.body;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  const sessionActive = activeSockets?.has(gymKey);
  if (!gym || gym.whatsappStatus !== 'connected' || !sessionActive) {
    return res.status(403).json({ error: 'WhatsApp session not active. Please reconnect WhatsApp.' });
  }

  // Only send reminders to members currently in Dues
  const members = db.members.filter(m => m.gymKey === gymKey && calculateMemberStatus(m) === 'Dues');
  const template = gym.template;
  
  // Return early, process in background
  res.json({ message: `Sending started for ${members.length} due members. Check logs for progress.` });

  for (let member of members) {
    let msg = template
      .replace('{name}', member.name)
      .replace('{amount}', member.amount || '0')
      .replace('{date}', getMemberDueDate(member));

    if (requireMinPackage(gym, 'growth')) {
      const paymentSettings = gym.paymentSettings || {};
      const methods = Array.isArray(paymentSettings.methods) ? paymentSettings.methods : [];
      const paymentLines = [];
      if (methods.includes('easypaisa') && paymentSettings.easypaisaNumberEncrypted) {
        paymentLines.push(`EasyPaisa: ${decryptSensitive(paymentSettings.easypaisaNumberEncrypted)}`);
      }
      if (methods.includes('jazzcash') && paymentSettings.jazzcashNumberEncrypted) {
        paymentLines.push(`JazzCash: ${decryptSensitive(paymentSettings.jazzcashNumberEncrypted)}`);
      }
      if (methods.includes('bank') && paymentSettings.bankIbanEncrypted) {
        const title = paymentSettings.bankTitle ? ` (${paymentSettings.bankTitle})` : '';
        paymentLines.push(`Bank IBAN${title}: ${decryptSensitive(paymentSettings.bankIbanEncrypted)}`);
      }
      if (paymentLines.length) {
        msg += `\n\nPayment Options:\n${paymentLines.join('\n')}\n\nAfter payment, share transaction ID / screenshot for verification.`;
      }
    }

    let status = 'Sent ✅';
    let errMessage = null;
    try {
      await sendMessage(gymKey, member.phone, msg);
    } catch (err) {
      status = 'Failed ❌';
      errMessage = err.message;
    }

    // Append Log
    const currentDB = await readDB();
    currentDB.logs.unshift({
      id: uuidv4(),
      gymKey,
      memberName: member.name,
      memberPhone: member.phone,
      message: msg,
      status,
      error: errMessage,
      timestamp: new Date().toISOString()
    });
    await writeDB(currentDB);

    // Sleep 5 to 10 seconds to avoid spam
    const waitTime = Math.floor(Math.random() * 5000) + 5000;
    await delay(waitTime);
  }
});

// ========================
// LOGS
// ========================
app.get('/api/logs', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const logs = (db.logs || []).filter(l => l.gymKey === gymKey);
  res.json({ logs });
});

// ========================
// PROFILE
// ========================
app.get('/api/profile', async (req, res) => {
  const { gymKey } = req.query;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  if (!gym) return res.status(404).json({ error: 'Not found' });
  
  // Return everything except password
  const { password, ...profileData } = gym;
  profileData.package = gym.package || 'starter';
  const raw = gym.paymentSettings || {};
  profileData.paymentSettings = {
    methods: Array.isArray(raw.methods) ? raw.methods : ['easypaisa'],
    easypaisaNumber: decryptSensitive(raw.easypaisaNumberEncrypted || ''),
    jazzcashNumber: decryptSensitive(raw.jazzcashNumberEncrypted || ''),
    bankTitle: raw.bankTitle || '',
    bankIban: decryptSensitive(raw.bankIbanEncrypted || ''),
    autoConfirm: !!raw.autoConfirm
  };
  res.json({ profile: profileData });
});

app.post('/api/profile', async (req, res) => {
  const { gymKey, profile } = req.body;
  const db = await readDB();
  const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
  if (gymIndex === -1) return res.status(404).json({ error: 'Not found' });
  
  const gym = db.gyms[gymIndex];
  ensureGymDefaults(gym);
  const rank = getPackageRank(gym.package);

  const safeProfile = { ...profile };

  // Security: Enforce Profile Lock
  if (gym.isProfileLocked) {
    // Revert critical fields if they were modified in the request
    delete safeProfile.name;
    delete safeProfile.address;
    delete safeProfile.contact;
    delete safeProfile.email;
  }

  // Gate features strictly by package.
  if (rank < PACKAGE_RANK.growth) {
    delete safeProfile.paymentSettings;
  } else if (safeProfile.paymentSettings) {
    const normalized = normalizePaymentSettings(safeProfile.paymentSettings || {});
    safeProfile.paymentSettings = {
      methods: normalized.methods,
      easypaisaNumberEncrypted: normalized.easypaisaNumber ? encryptSensitive(normalized.easypaisaNumber) : '',
      jazzcashNumberEncrypted: normalized.jazzcashNumber ? encryptSensitive(normalized.jazzcashNumber) : '',
      bankTitle: normalized.bankTitle,
      bankIbanEncrypted: normalized.bankIban ? encryptSensitive(normalized.bankIban) : '',
      autoConfirm: normalized.autoConfirm
    };
  }

  if (rank < PACKAGE_RANK.pro) {
    delete safeProfile.template;
  }

  db.gyms[gymIndex] = { ...gym, ...safeProfile };
  await writeDB(db);
  res.json({ message: 'Profile updated successfully', isLocked: gym.isProfileLocked });
});

// ========================
// BACKGROUND CRON JOBS
// ========================
const cron = require('node-cron');
const { differenceInCalendarDays } = require('date-fns');

// Run daily at 10:00 AM
cron.schedule('0 10 * * *', async () => {
  console.log('Running daily automated reminder checks...');
  const db = await readDB();
  
  for (const gym of db.gyms) {
    if (gym.autoMessagingEnabled && gym.whatsappStatus === 'connected') {
      const intervals = gym.reminderIntervals || [1, 3, 7];
      const members = db.members.filter(m => m.gymKey === gym.gymKey);
      
      for (const member of members) {
        if (!member.subscriptionEndDate) continue;
        
        const endDate = parseISO(member.subscriptionEndDate);
        const diffDays = differenceInCalendarDays(new Date(), endDate);
        
        // If expired and days passed matches an interval
        if (diffDays > 0 && intervals.includes(diffDays)) {
           const msg = (gym.template || '')
            .replace('{name}', member.name)
            .replace('{amount}', member.amount || '0')
            .replace('{date}', new Date(member.subscriptionEndDate).toLocaleDateString());

           try {
             await sendMessage(gym.gymKey, member.phone, msg);
             // Append Log
             const currentDB = await readDB();
             currentDB.logs.unshift({
               id: uuidv4(),
               gymKey: gym.gymKey,
               memberName: member.name,
               memberPhone: member.phone,
               message: msg,
               status: 'Sent ✅ (Auto)',
               error: null,
               timestamp: new Date().toISOString()
             });
             await writeDB(currentDB);
           } catch (err) {
             const currentDB = await readDB();
             currentDB.logs.unshift({
               id: uuidv4(),
               gymKey: gym.gymKey,
               memberName: member.name,
               memberPhone: member.phone,
               message: msg,
               status: 'Failed ❌ (Auto)',
               error: err.message,
               timestamp: new Date().toISOString()
             });
             await writeDB(currentDB);
           }
           // Delay between messages strictly for safety
           await delay(Math.floor(Math.random() * 5000) + 5000);
        }
      }
    }
  }
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Quick hygiene on startup: reset any stuck 'initializing' states
  const db = await readDB();
  let modified = false;
  db.gyms.forEach(g => {
    if (g.whatsappStatus === 'initializing') {
       g.whatsappStatus = 'disconnected';
       modified = true;
    }
  });
  if (modified) await writeDB(db);
});
