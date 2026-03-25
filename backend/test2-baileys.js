const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');

async function test() {
  console.log("Starting Baileys test with Browsers.ubuntu('Chrome')...");
  try {
    const { state } = await useMultiFileAuthState('./test-auth-2');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: Browsers.ubuntu('Chrome'),
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
