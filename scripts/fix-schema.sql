-- ============================================================
-- FIX SCRIPT: Run this ONCE in Supabase SQL Editor
-- يمسح الجداول القديمة وينشئ كل الجداول من جديد
-- ============================================================

-- 1. Drop old admin_sessions (will be recreated with correct columns)
DROP TABLE IF EXISTS admin_sessions CASCADE;

-- 2. Now run the full schema.sql (paste it here)
