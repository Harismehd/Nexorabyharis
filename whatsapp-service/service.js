require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GYM_KEY = process.env.GYM_KEY;
const POLL_INTERVAL = 10000; // 10 seconds

if (!SUPABASE_URL || !SUPABASE_KEY || !GYM_KEY) {
  console.error('ERROR: Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GYM_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sessionsDir = path.join(process.cwd(), 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

let activeSock = null;
let isConnected = false;

// ── DB helpers ───────────────────────────────────────────
async function readDB() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data?.payload || {};
}

async function writeDB(payload) {
  const { error } = await supabase.from('app_state').upsert({ id: 1, payload, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

async function updateWhatsAppStatus(status) {
  try {
    const db = await readDB();
    const gymIndex = (db.gyms || []).findIndex(g => g.gymKey === GYM_KEY);
    if (gymIndex !== -1) {
      db.gyms[gymIndex].whatsappStatus = status;
      await writeDB(db);
      console.log(`WhatsApp status updated: ${status}`);
    }
  } catch (err) {
    console.error('Failed to update status:', err.message);
  }
}

// ── WhatsApp ─────────────────────────────────────────────
async function initWhatsApp() {
  const sessionPath = path.join(sessionsDir, GYM_KEY);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestWaWebVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n── SCAN THIS QR CODE IN WHATSAPP ──');
      // Print QR in terminal as ASCII
      const qrcode = require('qrcode');
      const ascii = await qrcode.toString(qr, { type: 'terminal', small: true });
      console.log(ascii);
      console.log('────────────────────────────────────\n');
    }

    if (connection === 'close') {
      isConnected = false;
      activeSock = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      await updateWhatsAppStatus('disconnected');
      if (shouldReconnect) {
        console.log('Connection lost. Reconnecting in 5s...');
        setTimeout(initWhatsApp, 5000);
      } else {
        console.log('Logged out. Delete sessions folder and restart to reconnect.');
        const sessionPath = path.join(sessionsDir, GYM_KEY);
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } else if (connection === 'open') {
      isConnected = true;
      activeSock = sock;
      await updateWhatsAppStatus('connected');
      console.log(`✅ WhatsApp connected for ${GYM_KEY}`);
    }
  });

  activeSock = sock;
  return sock;
}

// ── Message sender ────────────────────────────────────────
async function sendMessage(phoneRaw, message) {
  if (!activeSock || !isConnected) throw new Error('WhatsApp not connected');
  let phone = phoneRaw.replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '92' + phone.substring(1);
  const jid = `${phone}@s.whatsapp.net`;
  const [result] = await activeSock.onWhatsApp(jid);
  if (!result?.exists) throw new Error('Number is not registered on WhatsApp');
  await activeSock.sendMessage(jid, { text: message });
  return true;
}

// ── Job processor ─────────────────────────────────────────
async function processPendingJobs() {
  if (!isConnected) return;

  try {
    const { data: jobs, error } = await supabase
      .from('message_jobs')
      .select('*')
      .eq('gym_key', GYM_KEY)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error || !jobs || jobs.length === 0) return;

    console.log(`Found ${jobs.length} pending message(s) to send...`);

    for (const job of jobs) {
      // Mark as processing
      await supabase.from('message_jobs').update({ status: 'processing' }).eq('id', job.id);

      try {
        await sendMessage(job.member_phone, job.message);
        await supabase.from('message_jobs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id);

        // Log to app_state
        const db = await readDB();
        if (!db.logs) db.logs = [];
        db.logs.unshift({ id: job.id, gymKey: GYM_KEY, memberName: job.member_name, memberPhone: job.member_phone, message: job.message, status: 'Sent ✅', error: null, timestamp: new Date().toISOString() });
        await writeDB(db);

        console.log(`✅ Sent to ${job.member_name} (${job.member_phone})`);
      } catch (err) {
        await supabase.from('message_jobs').update({ status: 'failed', error: err.message }).eq('id', job.id);

        const db = await readDB();
        if (!db.logs) db.logs = [];
        db.logs.unshift({ id: job.id, gymKey: GYM_KEY, memberName: job.member_name, memberPhone: job.member_phone, message: job.message, status: 'Failed ❌', error: err.message, timestamp: new Date().toISOString() });
        await writeDB(db);

        console.log(`❌ Failed to send to ${job.member_name}: ${err.message}`);
      }

      // Wait 5-10 seconds between messages
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 5000) + 5000));
    }
  } catch (err) {
    console.error('Job processor error:', err.message);
  }
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log(`🏋️ GymFlow WhatsApp Service`);
  console.log(`Gym: ${GYM_KEY}`);
  console.log(`Connecting to WhatsApp...`);
  console.log(`────────────────────────────────────`);

  await initWhatsApp();

  // Poll for pending jobs every 10 seconds
  setInterval(processPendingJobs, POLL_INTERVAL);
}

main().catch(console.error);