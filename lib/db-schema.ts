// MySQL / MariaDB schema (Hostinger). Created automatically on first request by lib/db.ts.
// Dates are stored in UTC.
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS student_profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  class_name VARCHAR(255) NOT NULL DEFAULT '1º Ano Informática',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS activity_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  activity_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  current_stage INT NOT NULL DEFAULT 1,
  completed_missions JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'em_andamento',
  started_at DATETIME(3) NOT NULL,
  last_activity_at DATETIME(3) NOT NULL,
  completed_at DATETIME(3) NULL,
  INDEX idx_sessions_student (student_id),
  CONSTRAINT fk_sessions_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS mission_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  mission_number INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel',
  simulation_state JSON NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_progress (session_id, mission_number),
  CONSTRAINT fk_progress_session FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS investigation_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  mission_number INT NOT NULL,
  entry_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  related_concepts JSON NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_entries_session (session_id, mission_number),
  CONSTRAINT fk_entries_session FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS test_executions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  mission_number INT NOT NULL,
  test_key VARCHAR(100) NOT NULL,
  predicted_result TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  interpretation TEXT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  executed_at DATETIME(3) NOT NULL,
  INDEX idx_tests_session (session_id, mission_number),
  CONSTRAINT fk_tests_session FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS student_responses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  mission_number INT NOT NULL,
  question_key VARCHAR(100) NOT NULL,
  answer_data JSON NULL,
  submitted_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_responses (session_id, mission_number, question_key),
  CONSTRAINT fk_responses_session FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS assessment_scores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  criterion_key VARCHAR(64) NOT NULL,
  score DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
  max_score DECIMAL(4, 2) NOT NULL,
  grading_source VARCHAR(30) NOT NULL DEFAULT 'auto',
  teacher_feedback TEXT NULL,
  reviewed_by VARCHAR(255) NULL,
  reviewed_at DATETIME(3) NULL,
  UNIQUE KEY uq_assessment (session_id, criterion_key),
  CONSTRAINT fk_assessment_session FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS simulation_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  mission_number INT NOT NULL,
  event_key VARCHAR(64) NOT NULL,
  payload JSON NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_events_session (session_id),
  CONSTRAINT fk_events_session FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];
