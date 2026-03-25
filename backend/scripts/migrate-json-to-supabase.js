/**
 * One-time: copy database.json into Supabase app_state.payload
 *
 * Run from backend folder:
 *   node scripts/migrate-json-to-supabase.js
 *
 * Requires backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * and supabase/schema.sql applied in Supabase SQL Editor first.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const jsonPath = path.join(__dirname, '../database.json');
if (!fs.existsSync(jsonPath)) {
  console.error('No file at', jsonPath);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const supabase = createClient(url, key);

(async () => {
  const { error } = await supabase.from('app_state').upsert(
    { id: 1, payload, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }
  console.log('OK: app_state row id=1 updated from database.json');
})();
