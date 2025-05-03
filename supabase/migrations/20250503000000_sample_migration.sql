
CREATE TABLE IF NOT EXISTS public.demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.demo IS 'Demo table for Bright Bots Initiative';

CREATE INDEX IF NOT EXISTS demo_name_idx ON public.demo (name);
