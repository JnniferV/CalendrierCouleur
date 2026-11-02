import { createClient } from '@supabase/supabase-js'

// Clé secrète (service_role) : utilisée uniquement côté serveur, elle passe outre la RLS qui ferme les tables au public
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY, {
  auth: { persistSession: false },
})
