import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - fetch active broadcasts for a gym
  if (req.method === 'GET') {
    const { gymKey } = req.query;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // Filter for this gym
    const filtered = (data || []).filter(b => {
      if (!b.recipients || b.recipients.includes('ALL')) return true;
      return b.recipients.includes(gymKey);
    });
    return res.json({ broadcasts: filtered });
  }

  // POST - create broadcast (admin only)
  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    const { message, type, recipients, durationHours } = req.body;

    // Verify admin
    const { data: stateData } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
    const masterPassword = stateData?.payload?.system?.masterPassword;
    if (!adminKey || adminKey !== masterPassword) return res.status(403).json({ error: 'Forbidden' });

    if (!message || !durationHours) return res.status(400).json({ error: 'Missing fields' });

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('broadcasts').insert([{
      message,
      type: type || 'info',
      recipients: recipients || ['ALL'],
      expires_at: expiresAt
    }]).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: 'Broadcast sent', broadcast: data });
  }

  // DELETE - delete broadcast (admin only)
  if (req.method === 'DELETE') {
    const adminKey = req.headers['x-admin-key'];
    const { id } = req.body;

    const { data: stateData } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
    const masterPassword = stateData?.payload?.system?.masterPassword;
    if (!adminKey || adminKey !== masterPassword) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: 'Broadcast deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
