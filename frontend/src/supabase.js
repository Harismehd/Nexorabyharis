import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zktkocvpuusulwkkcowa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprdGtvY3ZwdXVzdWx3a2tjb3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjMyNzMsImV4cCI6MjA5MDAzOTI3M30.TGXMW9Y8bs2I-VE_bxbdkIpcl-yqvpUio3t0DCHUSX4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)