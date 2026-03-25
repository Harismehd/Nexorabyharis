const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

async function test() {
  console.log("Starting Baileys test...");
  try {
    const { state } = await useMultiFileAuthState('./test-auth');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['GymFlow', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
      console.log("UPDATE:", update);
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
