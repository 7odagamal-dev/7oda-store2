-- ============================================================
-- OG Store — إنشاء جدول جلسات الأدمن (admin_sessions)
-- شغّل هذا الملف في Supabase: Dashboard → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_sessions IS 'HttpOnly admin login sessions; accessed only via Next.js API + service_role key.';

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- لا حاجة لسياسات عامة: مفتاح service_role في Supabase يتجاوز RLS افتراضياً.
-- إذا كان الإدراج ما زال يفشل، غالباً SUPABASE_SERVICE_ROLE_KEY ليس مفتاح service_role (انظر رسالة الخطأ في التيرمنال).

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_sessions TO postgres, service_role;
