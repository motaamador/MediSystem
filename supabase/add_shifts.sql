-- ============================================================
-- MEDISYSTEM — Migración para Control de Turnos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. CREAR TABLA DE TURNOS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS para turnos
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para turnos
CREATE POLICY "Turnos visibles para todos los autenticados" ON public.shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores gestionan turnos" ON public.shifts
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Habilitar publicación realtime en turnos (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;

-- ── 2. INSERTAR LOS 4 TURNOS PREDEFINIDOS ──────────────────────
INSERT INTO public.shifts (name, start_time, end_time) VALUES
  ('1er Turno (7:00 AM - 4:00 PM)', '07:00:00', '16:00:00'),
  ('2do Turno (8:00 AM - 5:00 PM)', '08:00:00', '17:00:00'),
  ('3er Turno (7:00 AM - 1:00 PM)', '07:00:00', '13:00:00'),
  ('4to Turno (8:00 AM - 4:00 PM)', '08:00:00', '16:00:00')
ON CONFLICT DO NOTHING;

-- ── 3. ASOCIAR EMPLEADOS A TURNOS ──────────────────────────────
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL;

-- ── 4. AGREGAR MÉTRICAS A REGISTROS DE ASISTENCIA ────────────────
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS check_in_status TEXT NOT NULL DEFAULT 'on_time' CHECK (check_in_status IN ('on_time', 'late')),
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER NOT NULL DEFAULT 0;
