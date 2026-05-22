-- ============================================================
-- MEDISYSTEM — Attendance Control System
-- Schema inicial para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. SEDES / LOCALES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 75,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sede inicial: El Cementerio
INSERT INTO locations (name, address, latitude, longitude, radius_meters)
VALUES ('El Cementerio', 'El Cementerio, Caracas', 10.483875, -66.912834, 75);

-- Sede: Las Mercedes
INSERT INTO locations (name, address, latitude, longitude, radius_meters)
VALUES ('Las Mercedes', 'Las Mercedes, Caracas', 10.478840, -66.858765, 75);

-- ── 2. PERFILES DE EMPLEADOS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_code TEXT UNIQUE,
  department TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. REGISTROS DE ASISTENCIA ───────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  check_in_lat DOUBLE PRECISION NOT NULL,
  check_in_lon DOUBLE PRECISION NOT NULL,
  check_out_lat DOUBLE PRECISION,
  check_out_lon DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  duration_minutes INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. ÍNDICES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- ── 5. FUNCIÓN: actualizar updated_at ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. FUNCIÓN: calcular duración al hacer checkout ──────────
CREATE OR REPLACE FUNCTION calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_calculate_duration
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION calculate_duration();

-- ── 7. TRIGGER: crear perfil al registrar usuario ────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 8. ROW LEVEL SECURITY ────────────────────────────────────

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- locations: todos los autenticados pueden leer
CREATE POLICY "Locations visible to all authenticated" ON locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins manage locations" ON locations
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- profiles: empleados ven su propio perfil; admins ven todos
CREATE POLICY "Users see own profile" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins full access profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- attendance_records: empleados ven los suyos; admins ven todos
CREATE POLICY "Employees see own records" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Employees insert own records" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees update own active records" ON attendance_records
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid() AND status = 'active');

CREATE POLICY "Admins full access attendance" ON attendance_records
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ── 9. SUPABASE REALTIME ─────────────────────────────────────
-- Habilitar publicación realtime en attendance_records
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
