const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_FILE = path.join(__dirname, 'database.json');

const defaultData = {
  system: {
    globalShutdown: false,
    masterPassword: 'SAdmin#2026!GymFlow'
  },
  gyms: [],
  members: [],
  payments: [],
  pendingPayments: [],
  logs: []
};

function useSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(defaultData));
  const data = {
    ...defaultData,
    ...raw,
    system: { ...defaultData.system, ...(raw.system || {}) },
    gyms: Array.isArray(raw.gyms) ? raw.gyms : [],
    members: Array.isArray(raw.members) ? raw.members : [],
    payments: Array.isArray(raw.payments) ? raw.payments : [],
    pendingPayments: Array.isArray(raw.pendingPayments) ? raw.pendingPayments : [],
    logs: Array.isArray(raw.logs) ? raw.logs : []
  };
  return data;
}

async function readDB() {
  if (useSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('app_state').select('payload').eq('id', 1).maybeSingle();
    if (error) {
      console.error('Supabase readDB error:', error);
      throw error;
    }
    if (!data || data.payload == null) {
      return JSON.parse(JSON.stringify(defaultData));
    }
    return normalizeState(data.payload);
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  }
  try {
    const text = fs.readFileSync(DB_FILE, 'utf8');
    return normalizeState(JSON.parse(text));
  } catch (err) {
    console.error('Error reading DB file', err);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

async function writeDB(data) {
  const normalized = normalizeState(data);
  if (useSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from('app_state').upsert(
      {
        id: 1,
        payload: normalized,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('Supabase writeDB error:', error);
      throw error;
    }
    return;
  }

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(normalized, null, 2));
  } catch (err) {
    console.error('Error writing DB file', err);
    throw err;
  }
}

module.exports = {
  readDB,
  writeDB,
  defaultData,
  useSupabase
};
