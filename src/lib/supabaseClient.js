
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
    console.warn('Missing Supabase credentials. check .env file')
}

// Create a client if configured, otherwise create a dummy safe object
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        from: () => ({ select: () => ({ data: [], error: { message: "Supabase not configured" } }), insert: () => ({ error: { message: "Supabase not configured" } }) }),
        auth: {
            signUp: () => ({ error: { message: "Supabase not configured" } }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signOut: () => Promise.resolve({ error: null })
        },
        storage: { from: () => ({ upload: () => ({ error: { message: "Supabase not configured" } }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
        channel: () => ({ on: () => ({ subscribe: () => { } }), unsubscribe: () => { } }),
        removeChannel: () => { }
    };
