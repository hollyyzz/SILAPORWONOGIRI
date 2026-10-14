// Inisialisasi Supabase (Aktif)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://veoffgsgciokwfgkwcqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2ZmZ3NnY2lva3dmZ2t3Y3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTE4MzEsImV4cCI6MjEwNzQ2NzgzMX0.rAKx07Weiil-Ut0PBl_ZnTtqMcAjbyrAwz8k_DoMjPU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);