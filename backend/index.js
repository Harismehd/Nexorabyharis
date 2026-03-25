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

const PACKAGE_RANK = { starter: 1, growth: 2, pro: 3 };

function getPackageRank(pkg) {
  const v = String(pkg || 'starter').toLowerCase();
  return PACKAGE_RANK[v] || PACKAGE_RANK.starter;
}

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
  if (dbTouched) await writeDB(db);

  // 4. Enforce Ban (Suspension)
  if (gym.isActive === false) {
    return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Please contact the provider to resolve this.' });
  }

  res.json({ message: 'Login successful', gymKey, role: 'gym' });
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
      whatsappStatus: g.whatsappStatus,
      memberCount: db.members.filter(m => m.gymKey === g.gymKey).length
    }))
  });
});

app.post('/api/admin/gyms/create', verifyAdmin, async (req, res) => {
  const { gymKey, password, package: pkg } = req.body;
  const db = await readDB();
  
  if (db.gyms.find(g => g.gymKey === gymKey)) {
    return res.status(400).json({ error: 'Gym Key already exists' });
  }

  const normalizedPkg = String(pkg || 'starter').toLowerCase();
  const allowedPackages = ['starter', 'growth', 'pro'];
  const selectedPackage = allowedPackages.includes(normalizedPkg) ? normalizedPkg : 'starter';
  
  const newGym = {
    gymKey,
    password,
    isActive: true,
    package: selectedPackage,
    autoMessagingEnabled: false,
    template: 'Hi {name}, your gym fee Rs {amount} is due on {date}. Please pay on time.',
    whatsappStatus: 'disconnected',
    paymentSettings: {
      methods: ['easypaisa'],
      easypaisaNumberEncrypted: '',
      jazzcashNumberEncrypted: '',
      bankTitle: '',
      bankIbanEncrypted: ''
    }
  };
  
  db.gyms.push(newGym);
  await writeDB(db);
  res.json({ message: 'Gym Key created successfully', gym: newGym });
});

app.post('/api/admin/gyms/package', verifyAdmin, async (req, res) => {
  const { gymKey, package: pkg } = req.body;
  const db = await readDB();
  const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
  if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });

  const normalizedPkg = String(pkg || 'starter').toLowerCase();
  const allowedPackages = ['starter', 'growth', 'pro'];
  const selectedPackage = allowedPackages.includes(normalizedPkg) ? normalizedPkg : 'starter';

  db.gyms[gymIndex].package = selectedPackage;
  ensureGymDefaults(db.gyms[gymIndex]);
  await writeDB(db);

  res.json({ message: `Package updated to ${selectedPackage.toUpperCase()}` });
});

app.post('/api/admin/gyms/toggle', verifyAdmin, async (req, res) => {
  const { gymKey } = req.body;
  const db = await readDB();
  const gymIndex = db.gyms.findIndex(g => g.gymKey === gymKey);
  
  if (gymIndex === -1) return res.status(404).json({ error: 'Gym not found' });
  
  const currentStatus = db.gyms[gymIndex].isActive !== false;
  db.gyms[gymIndex].isActive = !currentStatus;
  await writeDB(db);
  
  res.json({ message: `Gym ${db.gyms[gymIndex].isActive ? 'Activated' : 'Suspended'}` });
});

app.post('/api/admin/system/shutdown', verifyAdmin, async (req, res) => {
  const db = await readDB();
  if (!db.system) db.system = { globalShutdown: false };
  db.system.globalShutdown = !db.system.globalShutdown;
  await writeDB(db);
  
  res.json({ message: `Global platform is now ${db.system.globalShutdown ? 'OFFLINE' : 'ONLINE'}` });
});

app.post('/api/admin/shutdown', verifyAdmin, async (req, res) => {
  const db = await readDB();
  ensureSystem(db);
  db.system.globalShutdown = !db.system.globalShutdown;
  await writeDB(db);
  res.json({ message: `Global platform is now ${db.system.globalShutdown ? 'OFFLINE' : 'ONLINE'}` });
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
  db.members = db.members.filter(m => m.id !== id);
  await writeDB(db);
  res.json({ message: 'Member deleted' });
});

app.put('/api/members/:id/status', async (req, res) => {
  const { id } = req.params;
  const { gymKey, status } = req.body;
  const db = await readDB();
  
  const memberIndex = db.members.findIndex(m => m.id === id && m.gymKey === gymKey);
  if (memberIndex === -1) return res.status(404).json({ error: 'Member not found' });
  
  const member = db.members[memberIndex];
  
  // Quick toggle logic
  if (status === 'Active') {
    // Set expiry to 30 days from today
    member.subscriptionEndDate = addMonths(new Date(), 1).toISOString();
  } else {
    // Set expiry to yesterday to make it "Dues"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    member.subscriptionEndDate = yesterday.toISOString();
  }
  
  db.members[memberIndex] = member;
  await writeDB(db);
  res.json({ message: 'Status updated', member: { ...member, status: calculateMemberStatus(member) } });
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
    const confirmationMsg = `Payment confirmed ✅\nReceipt: ${result.payment.receiptNumber}\nVerification Code: ${verificationCode}\nAmount: Rs ${pending.amount}\nThank you for your payment.`;
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

  const members = db.members.filter(m => m.gymKey === gymKey);
  const template = gym.template;
  
  // Return early, process in background
  res.json({ message: 'Sending started. Check logs for progress.' });

  for (let member of members) {
    // Only send to those what arguably look like valid due ones, but for MVP we send to all members that the frontend requests or we filter here. Let's assume all in DB.
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
  const rawSettings = gym.paymentSettings || {};
  profileData.paymentSettings = {
    methods: Array.isArray(rawSettings.methods) ? rawSettings.methods : ['easypaisa'],
    easypaisaNumber: decryptSensitive(rawSettings.easypaisaNumberEncrypted || ''),
    jazzcashNumber: decryptSensitive(rawSettings.jazzcashNumberEncrypted || ''),
    bankTitle: rawSettings.bankTitle || '',
    bankIban: decryptSensitive(rawSettings.bankIbanEncrypted || '')
  };
  res.json({ profile: profileData });
});

app.post('/api/profile', async (req, res) => {
  const { gymKey, profile } = req.body;
  const db = await readDB();
  const gym = db.gyms.find(g => g.gymKey === gymKey);
  if (!gym) return res.status(404).json({ error: 'Not found' });
  ensureGymDefaults(gym);
  const rank = getPackageRank(gym.package);

  const safeProfile = { ...profile };

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
      bankIbanEncrypted: normalized.bankIban ? encryptSensitive(normalized.bankIban) : ''
    };
  }

  if (rank < PACKAGE_RANK.pro) {
    delete safeProfile.template;
  }

  await updateDB('gyms', g => g.gymKey === gymKey, g => ({ ...g, ...safeProfile }));
  res.json({ message: 'Profile updated successfully' });
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
