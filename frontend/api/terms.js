import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - check if gym has accepted
  if (req.method === 'GET') {
    const { gymKey } = req.query;
    const { data, error } = await supabase
      .from('acceptances')
      .select('id, accepted_at')
      .eq('gym_key', gymKey)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ accepted: !!data, acceptedAt: data?.accepted_at || null });
  }

  // POST - save acceptance
  if (req.method === 'POST') {
    const { gymKey } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

    const { error } = await supabase.from('acceptances').insert([{
      gym_key: gymKey,
      user_agent: userAgent,
      ip_address: String(ip).split(',')[0].trim(),
      terms_version: 'v1.0'
    }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: 'Terms accepted successfully' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}