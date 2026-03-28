import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const defaultData = { system: { globalShutdown: false, masterPassword: 'SAdmin#2026!GymFlow' }, gyms: [], members: [], payments: [], pendingPayments: [], logs: [] };

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

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // Parse multipart manually to get gymKey and file
    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'No boundary found' });

    const parts = buffer.toString('binary').split(`--${boundary}`);
    let gymKey = '';
    let fileBuffer = null;

    for (const part of parts) {
      if (part.includes('name="gymKey"')) {
        gymKey = part.split('\r\n\r\n')[1]?.replace(/\r\n--$/, '').trim();
      }
      if (part.includes('filename=') && part.includes('name="file"')) {
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
      }
    }

    if (!gymKey || !fileBuffer) return res.status(400).json({ error: 'Missing gymKey or file' });

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const db = await readDB();
    let addedCount = 0;

    for (const row of data) {
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
    return res.json({ message: 'Upload successful', count: addedCount });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
}