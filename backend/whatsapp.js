const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir);
}

// Store active sockets and QRs in memory
const activeSockets = new Map();
const qrCodes = new Map();

async function initWhatsApp(gymKey, onStatusChange) {
  if (activeSockets.has(gymKey)) {
    return activeSockets.get(gymKey);
  }

  const sessionPath = path.join(sessionsDir, gymKey);
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`Generated QR for ${gymKey}`);
      qrCodes.set(gymKey, qr);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      activeSockets.delete(gymKey);
      
      console.log(`Connection closed for ${gymKey}. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        // Reconnect automatically if not explicitly logged out
        setTimeout(() => initWhatsApp(gymKey, onStatusChange), 5000);
      } else {
        // Logged out entirely
        qrCodes.delete(gymKey);
        onStatusChange(gymKey, 'disconnected');
        // Clean session dir
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
    } else if (connection === 'open') {
      console.log(`Connection open for ${gymKey}`);
      qrCodes.delete(gymKey);
      onStatusChange(gymKey, 'connected');
    }
  });

  activeSockets.set(gymKey, sock);
  return sock;
}

function getQR(gymKey) {
  return qrCodes.get(gymKey);
}

async function sendMessage(gymKey, phoneRaw, message) {
  const sock = activeSockets.get(gymKey);
  if (!sock) {
    throw new Error('WhatsApp not connected for this gym');
  }
  
  // Format phone number (dumb formatting for now: 923... @s.whatsapp.net)
  let phone = phoneRaw.replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) {
    phone = '92' + phone.substring(1); // Default to Pakistan if starting with 0, a generic format
  }
  const jid = `${phone}@s.whatsapp.net`;

  try {
    const [result] = await sock.onWhatsApp(jid);
    if (!result || !result.exists) {
        throw new Error('Number is not registered on WhatsApp');
    }
    
    await sock.sendMessage(jid, { text: message });
    return true;
  } catch (err) {
    console.error('Error sending message:', err);
    throw err;
  }
}

async function disconnect(gymKey, onStatusChange) {
    const sock = activeSockets.get(gymKey);
    if (sock) {
        sock.logout('Logout requested');
        activeSockets.delete(gymKey);
        qrCodes.delete(gymKey);
    }
    
    const sessionPath = path.join(sessionsDir, gymKey);
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    onStatusChange(gymKey, 'disconnected');
}

module.exports = {
  initWhatsApp,
  getQR,
  sendMessage,
  disconnect,
  activeSockets
};
