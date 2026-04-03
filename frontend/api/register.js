import nodemailer from 'nodemailer';
import Busboy from 'busboy';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const formData = {};
    let fileBuffer = null;
    let fileName = null;

    busboy.on('field', (fieldname, val) => {
      formData[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      fileName = filename;
      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('finish', async () => {
      try {
        const { gymName, ownerName, businessPhone, emailAddress, packageName, gymKeyChoice } = formData;

        if (!gymName || !ownerName || !businessPhone || !emailAddress || !packageName) {
          res.status(400).json({ error: 'Missing required information' });
          return resolve();
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'harismehmd1@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD || ''
          }
        });

        const mailOptions = {
          from: 'Nexora System <noreply@nexora.com>',
          to: 'harismehmd1@gmail.com',
          subject: `New Nexora Registration: ${gymName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; color: #333;">
              <h2 style="color: #00d4ff;">Nexora Gym Registration</h2>
              <hr />
              <p><strong>Gym Name:</strong> ${gymName}</p>
              <p><strong>Owner Name:</strong> ${ownerName}</p>
              <p><strong>WhatsApp/Phone:</strong> ${businessPhone}</p>
              <p><strong>Email:</strong> ${emailAddress}</p>
              <p><strong>Package selected:</strong> ${packageName}</p>
              <p><strong>Proposed Gym Key:</strong> ${gymKeyChoice || 'Not specified'}</p>
              <hr />
              <p style="font-size: 12px; color: #666;">This registration was submitted from the Nexora Login Page (Vercel Functions).</p>
            </div>
          `,
          attachments: fileBuffer ? [
            {
              filename: fileName,
              content: fileBuffer
            }
          ] : []
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Registration received successfully' });
        resolve();
      } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Failed to send registration email' });
        resolve();
      }
    });

    busboy.on('error', (err) => {
      console.error('Busboy Error:', err);
      res.status(500).json({ error: 'Failed to parse form data' });
      resolve();
    });

    req.pipe(busboy);
  });
}
