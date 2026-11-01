import { createClient } from '@supabase/supabase-js'
import { readClientEnv } from '@/lib/env'

const { supabaseUrl, supabaseAnonKey } = readClientEnv()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
