-- ==============================================================================
-- MISSÃO OSI: INVESTIGADORES DA REDE - IFPA CAMPUS BREVES
-- Schema de Persistência Supabase (PostgreSQL) com RLS
-- ==============================================================================

-- 1. Tabela de Perfis de Estudantes
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL DEFAULT '1º Ano Informática',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Sessões de Atividade
CREATE TABLE IF NOT EXISTS public.activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  activity_version TEXT NOT NULL DEFAULT '1.0.0',
  current_stage INTEGER NOT NULL DEFAULT 1,
  completed_missions INTEGER[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

-- 3. Tabela de Progresso por Missão
CREATE TABLE IF NOT EXISTS public.mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  mission_number INTEGER NOT NULL CHECK (mission_number BETWEEN 1 AND 8),
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('bloqueada', 'disponivel', 'em_investigacao', 'concluida')),
  simulation_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(session_id, mission_number)
);

-- 4. Tabela de Caderno de Evidências e Hipóteses
CREATE TABLE IF NOT EXISTS public.investigation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  mission_number INTEGER NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('hipotese', 'evidencia', 'revisao', 'anotacao')),
  content TEXT NOT NULL,
  related_concepts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  revised_from_id UUID REFERENCES public.investigation_entries(id)
);

-- 5. Tabela de Execução de Testes
CREATE TABLE IF NOT EXISTS public.test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  mission_number INTEGER NOT NULL,
  test_key TEXT NOT NULL,
  hypothesis_id UUID REFERENCES public.investigation_entries(id),
  predicted_result TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  interpretation TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  state_before JSONB,
  state_after JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Respostas e Justificativas de Consolidação
CREATE TABLE IF NOT EXISTS public.student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  mission_number INTEGER NOT NULL,
  question_key TEXT NOT NULL,
  answer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(session_id, mission_number, question_key)
);

-- 7. Tabela de Rubrica e Avaliação Docente
CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  criterion_key TEXT NOT NULL,
  score NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
  max_score NUMERIC(4, 2) NOT NULL,
  grading_source TEXT NOT NULL DEFAULT 'auto' CHECK (grading_source IN ('auto', 'revisado_professor')),
  teacher_feedback TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  UNIQUE(session_id, criterion_key)
);

-- 8. Tabela de Eventos de Simulação (Auditoria)
CREATE TABLE IF NOT EXISTS public.simulation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  mission_number INTEGER NOT NULL,
  event_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_sessions_student ON public.activity_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_session ON public.mission_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_session ON public.investigation_entries(session_id, mission_number);
CREATE INDEX IF NOT EXISTS idx_tests_session ON public.test_executions(session_id, mission_number);
CREATE INDEX IF NOT EXISTS idx_responses_session ON public.student_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_session ON public.assessment_scores(session_id);

-- Habilitação de RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança permissivas para estudantes com sessão própria e professores autenticados
CREATE POLICY "Estudantes acessam seu perfil" ON public.student_profiles
  FOR ALL USING (true);

CREATE POLICY "Estudantes acessam suas sessões" ON public.activity_sessions
  FOR ALL USING (true);

CREATE POLICY "Estudantes gerenciam seu progresso" ON public.mission_progress
  FOR ALL USING (true);

CREATE POLICY "Estudantes gerenciam seu caderno" ON public.investigation_entries
  FOR ALL USING (true);

CREATE POLICY "Estudantes registram seus testes" ON public.test_executions
  FOR ALL USING (true);

CREATE POLICY "Estudantes gravam respostas" ON public.student_responses
  FOR ALL USING (true);

CREATE POLICY "Leitura de avaliações pelos estudantes" ON public.assessment_scores
  FOR SELECT USING (true);

CREATE POLICY "Professores ou sistema atualizam notas" ON public.assessment_scores
  FOR ALL USING (true);

CREATE POLICY "Registro de eventos de auditoria" ON public.simulation_events
  FOR ALL USING (true);
