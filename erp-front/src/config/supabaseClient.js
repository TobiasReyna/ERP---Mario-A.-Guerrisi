
import { createClient } from '@supabase/supabase-js'

// 1. Inicializar el cliente
const supabaseUrl = 'https://omcvdlbjnknxvznmwlct.supabase.co'
const supabaseAnonKey = 'sb_publishable_MrlRlf_a4onZ6jlflSuaUQ_wSKh0Xro'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
