const { default: makeWASocket, useMultiFileAuthState, Browsers, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');

async function test() {
  console.log("Starting Baileys test with fetchLatestWaWebVersion...");
  try {
    const { state } = await useMultiFileAuthState('./test-auth-4');
    const { version, isLatest } = await fetchLatestWaWebVersion();
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false
    });

    sock.ev.on('connection.update', (update) => {
      if (update.qr) {
         console.log(">>> QR IS EMITTED SUCCESSFULLY <<<");
         setTimeout(() => process.exit(0), 1000);
      }
      if (update.connection === 'close') {
          console.log(">>> CONNECTION CLOSED <<<");
          setTimeout(() => process.exit(1), 1000);
      }
    });
  } catch(e) {
      console.error(e);
      process.exit(1);
  }
}
test();
