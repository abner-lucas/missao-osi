// Schema MySQL / MariaDB (Hostinger), em português para análise direta no phpMyAdmin.
// Criado automaticamente na primeira requisição por lib/db.ts.
// Datas gravadas no horário de Brasília (UTC-3, sem horário de verão no Pará).
export const SCHEMA_STATEMENTS: string[] = [
  // Catálogo das 8 missões (preenchido a partir de lib/simulation-engine.ts)
  `CREATE TABLE IF NOT EXISTS missoes (
  numero INT NOT NULL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  camada_numero INT NULL,
  camada_nome VARCHAR(100) NOT NULL,
  disponivel TINYINT(1) NOT NULL DEFAULT 1,
  disponibilidade_alterada_em DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Turmas cadastradas pelo professor (aparecem na tela de identificação do aluno)
  `CREATE TABLE IF NOT EXISTS turmas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  criada_em DATETIME(3) NOT NULL,
  UNIQUE KEY uq_turmas_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Sessões excluídas pelo professor: impede que o navegador do aluno recrie os dados apagados
  `CREATE TABLE IF NOT EXISTS sessoes_excluidas (
  sessao_id CHAR(36) NOT NULL PRIMARY KEY,
  aluno_nome VARCHAR(255) NULL,
  excluida_em DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS alunos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  turma VARCHAR(255) NOT NULL,
  criado_em DATETIME(3) NOT NULL,
  atualizado_em DATETIME(3) NOT NULL,
  INDEX idx_alunos_nome (nome_completo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS sessoes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  aluno_id CHAR(36) NOT NULL,
  versao_atividade VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  etapa_atual INT NOT NULL DEFAULT 1,
  missoes_concluidas JSON NULL,
  qtd_missoes_concluidas INT NOT NULL DEFAULT 0,
  situacao VARCHAR(20) NOT NULL DEFAULT 'em_andamento',
  iniciada_em DATETIME(3) NOT NULL,
  ultima_atividade_em DATETIME(3) NOT NULL,
  concluida_em DATETIME(3) NULL,
  INDEX idx_sessoes_aluno (aluno_id),
  CONSTRAINT fk_sessoes_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS progresso_missoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sessao_id CHAR(36) NOT NULL,
  missao INT NOT NULL,
  situacao VARCHAR(20) NOT NULL DEFAULT 'em_investigacao',
  problema_resolvido TINYINT(1) NOT NULL DEFAULT 0,
  estado_simulacao JSON NULL,
  iniciada_em DATETIME(3) NOT NULL,
  concluida_em DATETIME(3) NULL,
  atualizado_em DATETIME(3) NOT NULL,
  UNIQUE KEY uq_progresso (sessao_id, missao),
  CONSTRAINT fk_progresso_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Momento C: hipóteses formuladas
  `CREATE TABLE IF NOT EXISTS hipoteses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sessao_id CHAR(36) NOT NULL,
  missao INT NOT NULL,
  enunciado TEXT NOT NULL,
  conceitos_relacionados JSON NULL,
  situacao VARCHAR(20) NOT NULL DEFAULT 'ativa',
  criada_em DATETIME(3) NOT NULL,
  INDEX idx_hipoteses_sessao (sessao_id, missao),
  CONSTRAINT fk_hipoteses_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Momento D: previsão e execução de testes
  `CREATE TABLE IF NOT EXISTS testes_executados (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sessao_id CHAR(36) NOT NULL,
  missao INT NOT NULL,
  codigo_teste VARCHAR(100) NOT NULL,
  nome_teste VARCHAR(255) NOT NULL,
  resultado_previsto TEXT NOT NULL,
  resultado_obtido TEXT NOT NULL,
  interpretacao TEXT NULL,
  sucesso TINYINT(1) NOT NULL DEFAULT 0,
  executado_em DATETIME(3) NOT NULL,
  INDEX idx_testes_sessao (sessao_id, missao),
  CONSTRAINT fk_testes_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Momento E: intervenções aplicadas na simulação
  `CREATE TABLE IF NOT EXISTS intervencoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sessao_id CHAR(36) NOT NULL,
  missao INT NOT NULL,
  codigo_intervencao VARCHAR(100) NULL,
  nome_intervencao VARCHAR(255) NULL,
  problema_resolvido TINYINT(1) NOT NULL DEFAULT 0,
  estado_simulacao JSON NULL,
  aplicada_em DATETIME(3) NOT NULL,
  INDEX idx_intervencoes_sessao (sessao_id, missao),
  CONSTRAINT fk_intervencoes_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Momento F: consolidação (causa e justificativa técnica)
  `CREATE TABLE IF NOT EXISTS consolidacoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sessao_id CHAR(36) NOT NULL,
  missao INT NOT NULL,
  causa_identificada TEXT NULL,
  evidencias_utilizadas JSON NULL,
  camadas_relacionadas JSON NULL,
  justificativa TEXT NOT NULL,
  verificacao_confirmada TINYINT(1) NOT NULL DEFAULT 0,
  enviada_em DATETIME(3) NOT NULL,
  atualizada_em DATETIME(3) NOT NULL,
  UNIQUE KEY uq_consolidacao (sessao_id, missao),
  CONSTRAINT fk_consolidacoes_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Atlas OSI: conceitos salvos no caderno
  `CREATE TABLE IF NOT EXISTS conceitos_salvos (
  sessao_id CHAR(36) NOT NULL,
  conceito_id VARCHAR(100) NOT NULL,
  titulo_conceito VARCHAR(255) NULL,
  camada_numero INT NULL,
  salvo_em DATETIME(3) NOT NULL,
  PRIMARY KEY (sessao_id, conceito_id),
  CONSTRAINT fk_conceitos_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Rubrica: nota automática e nota do professor lado a lado
  `CREATE TABLE IF NOT EXISTS notas_rubrica (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sessao_id CHAR(36) NOT NULL,
  criterio VARCHAR(64) NOT NULL,
  titulo_criterio VARCHAR(255) NULL,
  nota_automatica DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
  nota_professor DECIMAL(4, 2) NULL,
  nota_maxima DECIMAL(4, 2) NOT NULL,
  origem VARCHAR(30) NOT NULL DEFAULT 'auto',
  atualizado_em DATETIME(3) NOT NULL,
  UNIQUE KEY uq_nota (sessao_id, criterio),
  CONSTRAINT fk_notas_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Parecer pedagógico geral do professor (um por sessão)
  `CREATE TABLE IF NOT EXISTS avaliacoes_professor (
  sessao_id CHAR(36) NOT NULL PRIMARY KEY,
  parecer TEXT NULL,
  avaliador VARCHAR(255) NULL,
  avaliado_em DATETIME(3) NOT NULL,
  CONSTRAINT fk_avaliacoes_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ---------------------------------------------------------------------------
  // Visões para análise (abra no phpMyAdmin como se fossem tabelas)
  // ---------------------------------------------------------------------------

  `CREATE OR REPLACE VIEW vw_resumo_alunos AS
SELECT
  a.nome_completo AS aluno,
  a.turma,
  s.situacao,
  s.qtd_missoes_concluidas AS missoes_concluidas,
  s.etapa_atual,
  (SELECT COUNT(*) FROM hipoteses h WHERE h.sessao_id = s.id) AS hipoteses,
  (SELECT COUNT(*) FROM testes_executados t WHERE t.sessao_id = s.id) AS testes,
  (SELECT COUNT(*) FROM testes_executados t WHERE t.sessao_id = s.id AND t.interpretacao IS NOT NULL AND t.interpretacao <> '') AS testes_interpretados,
  (SELECT COUNT(*) FROM intervencoes i WHERE i.sessao_id = s.id) AS intervencoes,
  (SELECT COUNT(*) FROM conceitos_salvos c WHERE c.sessao_id = s.id) AS conceitos_salvos,
  (SELECT COUNT(*) FROM consolidacoes c WHERE c.sessao_id = s.id) AS missoes_justificadas,
  (SELECT COALESCE(SUM(n.nota_automatica), 0) FROM notas_rubrica n WHERE n.sessao_id = s.id) AS nota_automatica,
  (SELECT COALESCE(SUM(COALESCE(n.nota_professor, n.nota_automatica)), 0) FROM notas_rubrica n WHERE n.sessao_id = s.id) AS nota_final,
  (SELECT COALESCE(SUM(n.nota_maxima), 0) FROM notas_rubrica n WHERE n.sessao_id = s.id) AS nota_maxima,
  IF(ap.sessao_id IS NULL, 'nao', 'sim') AS revisado_pelo_professor,
  IF(ap.sessao_id IS NOT NULL AND s.ultima_atividade_em > ap.avaliado_em, 'sim', 'nao') AS atividade_apos_revisao,
  ap.parecer,
  ap.avaliador,
  ap.avaliado_em,
  s.iniciada_em,
  s.ultima_atividade_em,
  s.concluida_em,
  s.id AS sessao_id
FROM sessoes s
JOIN alunos a ON a.id = s.aluno_id
LEFT JOIN avaliacoes_professor ap ON ap.sessao_id = s.id`,

  `CREATE OR REPLACE VIEW vw_notas_por_criterio AS
SELECT
  a.nome_completo AS aluno,
  a.turma,
  n.titulo_criterio AS criterio,
  n.nota_automatica,
  n.nota_professor,
  COALESCE(n.nota_professor, n.nota_automatica) AS nota_final,
  n.nota_maxima,
  n.origem,
  n.atualizado_em,
  n.sessao_id
FROM notas_rubrica n
JOIN sessoes s ON s.id = n.sessao_id
JOIN alunos a ON a.id = s.aluno_id`,

  `CREATE OR REPLACE VIEW vw_registro_missoes AS
SELECT
  a.nome_completo AS aluno,
  a.turma,
  p.missao,
  m.titulo AS titulo_missao,
  m.camada_nome AS camada,
  p.situacao,
  IF(p.problema_resolvido = 1, 'sim', 'nao') AS problema_resolvido,
  (SELECT COUNT(*) FROM hipoteses h WHERE h.sessao_id = p.sessao_id AND h.missao = p.missao) AS hipoteses,
  (SELECT COUNT(*) FROM testes_executados t WHERE t.sessao_id = p.sessao_id AND t.missao = p.missao) AS testes,
  (SELECT COUNT(*) FROM intervencoes i WHERE i.sessao_id = p.sessao_id AND i.missao = p.missao) AS intervencoes,
  c.causa_identificada,
  c.justificativa,
  p.iniciada_em,
  p.concluida_em,
  p.sessao_id
FROM progresso_missoes p
JOIN sessoes s ON s.id = p.sessao_id
JOIN alunos a ON a.id = s.aluno_id
LEFT JOIN missoes m ON m.numero = p.missao
LEFT JOIN consolidacoes c ON c.sessao_id = p.sessao_id AND c.missao = p.missao`,

  `CREATE OR REPLACE VIEW vw_linha_do_tempo AS
SELECT a.nome_completo AS aluno, h.missao, 'hipotese' AS tipo, h.enunciado AS descricao, NULL AS detalhe, h.criada_em AS momento, h.sessao_id
FROM hipoteses h JOIN sessoes s ON s.id = h.sessao_id JOIN alunos a ON a.id = s.aluno_id
UNION ALL
SELECT a.nome_completo, t.missao, 'teste', t.nome_teste,
  CONCAT('Previsto: ', t.resultado_previsto, ' | Interpretação: ', COALESCE(t.interpretacao, '')), t.executado_em, t.sessao_id
FROM testes_executados t JOIN sessoes s ON s.id = t.sessao_id JOIN alunos a ON a.id = s.aluno_id
UNION ALL
SELECT a.nome_completo, i.missao, 'intervencao', COALESCE(i.nome_intervencao, i.codigo_intervencao),
  IF(i.problema_resolvido = 1, 'Problema resolvido', 'Problema ainda presente'), i.aplicada_em, i.sessao_id
FROM intervencoes i JOIN sessoes s ON s.id = i.sessao_id JOIN alunos a ON a.id = s.aluno_id
UNION ALL
SELECT a.nome_completo, c.missao, 'consolidacao', c.causa_identificada, c.justificativa, c.enviada_em, c.sessao_id
FROM consolidacoes c JOIN sessoes s ON s.id = c.sessao_id JOIN alunos a ON a.id = s.aluno_id`
];

// Tabelas da versão anterior (nomes em inglês), migradas e removidas por lib/db-legacy-migration.ts
export const LEGACY_TABLES = [
  'simulation_events',
  'assessment_scores',
  'student_responses',
  'test_executions',
  'investigation_entries',
  'mission_progress',
  'activity_sessions',
  'student_profiles'
];
