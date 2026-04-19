import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const defaultData = { system: { globalShutdown: false, masterPassword: 'SAdmin#2026!Nexora' } };

async function getMasterPassword() {
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
  if (error) return 'SAdmin#2026!Nexora';
  return data?.payload?.system?.masterPassword || 'SAdmin#2026!Nexora';
}

export const config = {
  api: {
    bodyParser: false, // Handle multipart/form-data manually
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. POST: New Registration (Public)
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const contentType = req.headers['content-type'] || '';
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) return res.status(400).json({ error: 'Invalid request' });

      // Manual multipart parsing (Standard for this project's Vercel setup)
      const parts = buffer.toString('binary').split(`--${boundary}`);
      const formData = {};
      let fileBuffer = null;
      let fileType = 'image/png';
      let fileName = 'proof.png';

      for (const part of parts) {
        if (part.includes('name="')) {
          const nameMatch = part.match(/name="([^"]+)"/);
          const name = nameMatch ? nameMatch[1] : null;

          if (part.includes('filename="')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            fileName = filenameMatch ? filenameMatch[1] : fileName;
            
            const typeMatch = part.match(/Content-Type: ([^\r\n]+)/);
            fileType = typeMatch ? typeMatch[1] : fileType;

            const dataStart = part.indexOf('\r\n\r\n') + 4;
            const dataEnd = part.lastIndexOf('\r\n');
            fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
          } else if (name) {
            formData[name] = part.split('\r\n\r\n')[1]?.replace(/\r\n$/, '').trim();
          }
        }
      }

      if (!fileBuffer) return res.status(400).json({ error: 'Payment proof is required' });

      // Upload to Supabase Storage
      const fileExt = fileName.split('.').pop() || 'png';
      const storagePath = `proofs/${uuidv4()}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('registration-proofs')
        .upload(storagePath, fileBuffer, { contentType: fileType });

      if (uploadError) throw new Error('Storage failed: ' + uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('registration-proofs').getPublicUrl(storagePath);

      // Insert into registrations table
      const { error: insertError } = await supabase.from('registrations').insert([{
        gym_name: formData.gymName,
        owner_name: formData.ownerName,
        phone: formData.businessPhone,
        email: formData.emailAddress,
        package_name: formData.packageName,
        gym_key_choice: formData.gymKeyChoice,
        payment_proof_url: publicUrl,
        status: 'pending'
      }]);

      if (insertError) throw new Error('Database insert failed: ' + insertError.message);

      return res.status(200).json({ message: 'Registration submitted successfully' });
    }

    // AUTH REQUIRED FOR GET/PUT
    const adminKey = req.headers['x-admin-key'];
    const masterPassword = await getMasterPassword();
    if (!adminKey || adminKey !== masterPassword) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 2. GET: List Applications (Admin Only)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // 3. PUT: Update Status (Admin Only)
    if (req.method === 'PUT') {
      const { id, status } = req.body;
      const { error } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ message: 'Status updated' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[REGISTRATIONS_API_ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
}
