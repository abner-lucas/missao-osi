'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Download, Edit3, LogOut, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Dialog from '@/components/Dialog';
import {
  getAllStudentEvaluations,
  fetchAllStudentEvaluationsFromCloud,
  updateTeacherEvaluation,
  deleteStudentEvaluation
} from '@/lib/storage';
import { Turma, fetchClasses, createClass, renameClass, deleteClass } from '@/lib/classes';
import { StudentFullEvaluation, RubricCriteriaScore } from '@/lib/types';
import { getTotalScore, MISSIONS_CONFIG } from '@/lib/simulation-engine';
import { fetchMissionAvailability, setMissionAvailability } from '@/lib/mission-availability';
import { wireBackground } from '@/lib/wires';

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<StudentFullEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('todas');
  const [selectedStudent, setSelectedStudent] = useState<StudentFullEvaluation | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState(false);

  // Grading form state inside modal
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [feedbackGeneral, setFeedbackGeneral] = useState('');
  const [teacherName, setTeacherName] = useState('Prof. Me. Ábner Lucas - IFPA Breves');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [closedMissions, setClosedMissions] = useState<Set<number>>(new Set());
  const [availabilityControlled, setAvailabilityControlled] = useState(false);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentFullEvaluation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [listNotice, setListNotice] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [classesControlled, setClassesControlled] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<{ id: number; nome: string } | null>(null);
  const [classToDelete, setClassToDelete] = useState<Turma | null>(null);
  const [classNotice, setClassNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    // Verify auth
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('missao_osi_teacher_auth');
      if (!auth) {
        router.push('/professor/login');
        return;
      }
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setSyncing(true);
    const localList = getAllStudentEvaluations();
    setEvaluations(localList);
    const cloud = await fetchAllStudentEvaluationsFromCloud();
    if (cloud.unauthorized) {
      // Server session (cookie) expired or missing
      localStorage.removeItem('missao_osi_teacher_auth');
      router.push('/professor/login');
      return;
    }
    setEvaluations(cloud.evaluations);
    setDatabaseConnected(cloud.databaseConnected);
    const availability = await fetchMissionAvailability();
    setClosedMissions(availability.closed);
    setAvailabilityControlled(availability.controlled);
    await loadClasses();
    setSyncing(false);
  };

  const loadClasses = async () => {
    const result = await fetchClasses();
    setTurmas(result.turmas);
    setClassesControlled(result.controlled);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const ok = await deleteStudentEvaluation(studentToDelete.sessionId);
    setDeleting(false);
    if (!ok) {
      setDeleteError('Não foi possível excluir agora. Verifique a conexão e tente de novo.');
      return;
    }
    const name = studentToDelete.student.fullName;
    setEvaluations((list) => list.filter((e) => e.sessionId !== studentToDelete.sessionId));
    setStudentToDelete(null);
    setListNotice(`${name} e todas as suas respostas foram excluídos.`);
    loadClasses();
  };

  const showClassResult = async (error: string | null, success: string) => {
    setClassNotice(error ? { text: error, error: true } : { text: success, error: false });
    if (!error) await loadData();
    return !error;
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = newClassName.trim();
    if (nome.length < 2) {
      setClassNotice({ text: 'Informe o nome da turma.', error: true });
      return;
    }
    if (await showClassResult(await createClass(nome), `Turma "${nome}" criada.`)) setNewClassName('');
  };

  const handleRenameClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const nome = editingClass.nome.trim();
    if (await showClassResult(await renameClass(editingClass.id, nome), `Turma renomeada para "${nome}".`)) setEditingClass(null);
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    const target = classToDelete;
    setClassToDelete(null);
    await showClassResult(await deleteClass(target.id), `Turma "${target.nome}" excluída.`);
  };

  const handleToggleMission = async (numero: number) => {
    const open = !closedMissions.has(numero);
    const next = new Set(closedMissions);
    if (open) next.add(numero);
    else next.delete(numero);
    setClosedMissions(next);
    setAvailabilityNotice(null);
    const saved = await setMissionAvailability(numero, !open);
    if (!saved) {
      setClosedMissions(closedMissions);
      setAvailabilityNotice(`Não foi possível alterar a missão ${numero}. Tente de novo.`);
      return;
    }
    setAvailabilityNotice(`Missão ${numero} ${open ? 'fechada' : 'liberada'} para a turma.`);
  };

  const handleOpenEvaluationModal = (item: StudentFullEvaluation) => {
    setSelectedStudent(item);
    const initialScores: Record<string, number> = {};
    for (const [k, v] of Object.entries(item.rubric)) {
      initialScores[k] = v.teacherScore !== undefined ? v.teacherScore : v.autoScore;
    }
    setRubricScores(initialScores);
    setFeedbackGeneral(item.teacherFeedbackGeneral || '');
    if (item.reviewedBy) setTeacherName(item.reviewedBy);
    setSaveNotice(null);
  };

  const handleSaveEvaluation = () => {
    if (!selectedStudent) return;
    updateTeacherEvaluation({
      sessionId: selectedStudent.sessionId,
      rubricScores,
      feedbackGeneral,
      teacherName
    });
    setSaveNotice('Avaliação e parecer pedagógico salvos com sucesso!');
    setTimeout(() => {
      setSaveNotice(null);
      setSelectedStudent(null);
      loadData();
    }, 1200);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('missao_osi_teacher_auth');
    }
    void fetch('/api/professor/login', { method: 'DELETE' }).finally(() => router.push('/'));
  };

  // CSV Export for class registry
  const handleExportCSV = () => {
    if (evaluations.length === 0) return;
    const headers = ['Nome do Estudante', 'Turma', 'Etapa', 'Concluidas', 'Nota Evidencias', 'Nota Hipoteses', 'Nota Testes', 'Nota Conceitos OSI', 'Nota Justificativas', 'Nota Desafio Final', 'Nota Final (10)', 'Parecer Docente'];
    const rows = evaluations.map((e) => {
      const r = e.rubric;
      return [
        `"${e.student.fullName}"`,
        `"${e.student.className}"`,
        e.session.currentStage,
        e.session.completedMissions.length,
        (r.evidencias?.teacherScore ?? r.evidencias?.autoScore ?? 0).toFixed(1),
        (r.hipoteses?.teacherScore ?? r.hipoteses?.autoScore ?? 0).toFixed(1),
        (r.testes?.teacherScore ?? r.testes?.autoScore ?? 0).toFixed(1),
        (r.conceitos_osi?.teacherScore ?? r.conceitos_osi?.autoScore ?? 0).toFixed(1),
        (r.justificativas?.teacherScore ?? r.justificativas?.autoScore ?? 0).toFixed(1),
        (r.desafio_final?.teacherScore ?? r.desafio_final?.autoScore ?? 0).toFixed(1),
        e.finalTotalScore.toFixed(1),
        `"${e.teacherFeedbackGeneral || 'Sem parecer'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notas_missao_osi_ifpa_breves_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalStudents = evaluations.length;
  const completedSessions = evaluations.filter(e => e.session.status === 'concluido' || e.session.completedMissions.length >= 8).length;
  const inProgressSessions = totalStudents - completedSessions;
  const averageScore = totalStudents > 0
    ? (evaluations.reduce((acc, curr) => acc + curr.finalTotalScore, 0) / totalStudents).toFixed(1)
    : '0.0';

  // Filtered
  const filteredList = evaluations.filter((item) => {
    const matchesSearch = item.student.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'todas' || item.student.className === filterClass;
    return matchesSearch && matchesClass;
  });

  // Registered classes plus any class name still used by students (e.g. demo students)
  const classFilterOptions = Array.from(new Set([...turmas.map((t) => t.nome), ...evaluations.map((e) => e.student.className)])).sort(
    (a, b) => a.localeCompare(b, 'pt-BR')
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-grafite-2" title={databaseConnected ? 'Sincronização com o banco MySQL da Hostinger ativa' : 'Configure DB_NAME, DB_USER e DB_PASSWORD no servidor para sincronizar entre máquinas'}>
              <span aria-hidden="true" className={`led ${databaseConnected ? 'led-verde' : 'led-ambar'}`} />
              {databaseConnected ? 'MySQL Conectado' : 'Persistência Local (Navegador)'}
            </p>
            <h1 className="mt-2 text-[clamp(2rem,5vw,3rem)] font-extrabold [font-stretch:78%] leading-[1.04]">Acompanhamento da turma</h1>
            <p className="mt-1 text-lg text-grafite-2">Redes de Computadores, Prof. Me. Ábner Lucas, IFPA Campus Breves</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadData} disabled={syncing} className="btn btn-secundario" title="Atualizar dados da turma">
              <RefreshCw className={`w-[18px] h-[18px] ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {syncing ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button type="button" onClick={handleExportCSV} className="btn btn-primario" title="Exportar notas da turma em formato CSV para diário eletrônico">
              <Download className="w-[18px] h-[18px]" aria-hidden="true" />
              Exportar notas (CSV)
            </button>
            <button type="button" onClick={handleLogout} className="btn btn-discreto">
              <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
              Sair
            </button>
          </div>
        </header>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-linha bg-linha">
          {[
            { label: 'Alunos inscritos', value: String(totalStudents), note: '1º Ano Informática Integrado' },
            { label: 'Em andamento', value: String(inProgressSessions), note: 'Ainda investigando' },
            { label: 'Concluíram tudo', value: String(completedSessions), note: 'As 8 etapas finalizadas' },
            { label: 'Média da turma', value: `${averageScore}`, note: 'de 10, pelo processo' },
          ].map((m) => (
            <div key={m.label} className="bg-folha p-5">
              <dt className="text-grafite-2">{m.label}</dt>
              <dd className="font-display font-extrabold text-4xl leading-none mt-2">{m.value}</dd>
              <dd className="text-sm text-grafite-2 mt-2">{m.note}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="titulo-liberacao" className="folha p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 id="titulo-liberacao" className="text-2xl font-extrabold">
                Missões liberadas para a turma
              </h2>
              <p className="text-grafite-2 mt-1">
                Uma missão fechada não pode ser feita, mesmo por quem já chegou nela. O progresso dos alunos fica salvo.
              </p>
            </div>
            <p className="text-grafite-2 shrink-0">
              {8 - closedMissions.size} de 8 liberadas
            </p>
          </div>

          {!availabilityControlled ? (
            <p className="mt-4 rounded-xl bg-alerta-fundo text-alerta p-4">
              Sem conexão com o banco de dados: todas as missões ficam liberadas e não é possível fechá-las agora.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((numero) => {
                const open = !closedMissions.has(numero);
                const config = MISSIONS_CONFIG[numero];
                return (
                  <li key={numero}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={open}
                      onClick={() => handleToggleMission(numero)}
                      className={`w-full h-full text-left rounded-xl border-2 p-3.5 flex items-start gap-3 transition-colors ${
                        open ? 'border-ok/40 bg-ok-fundo/60' : 'border-linha bg-papel'
                      }`}
                    >
                      <span aria-hidden="true" className="w-2 self-stretch rounded-full shrink-0" style={{ background: wireBackground(config.layerNumber || 0, 'vertical') }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-grafite-2">
                          Missão {numero}
                          {config.layerNumber ? `, camada ${config.layerNumber}` : ', integradora'}
                        </span>
                        <span className="block font-bold leading-snug">{config.title}</span>
                        <span className={`mt-1.5 flex items-center gap-2 text-sm font-semibold ${open ? 'text-ok' : 'text-grafite-2'}`}>
                          <span aria-hidden="true" className={`relative w-9 h-5 rounded-full transition-colors ${open ? 'bg-ok' : 'bg-linha-forte'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${open ? 'translate-x-4' : ''}`} />
                          </span>
                          {open ? 'Liberada' : 'Fechada'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p role="status" className="mt-3 min-h-6 text-grafite-2">
            {availabilityNotice}
          </p>
        </section>

        <section aria-labelledby="titulo-turmas" className="folha p-4 sm:p-6">
          <h2 id="titulo-turmas" className="text-2xl font-extrabold">
            Turmas
          </h2>
          <p className="text-grafite-2 mt-1">Os alunos escolhem uma destas turmas ao se identificar.</p>

          {!classesControlled ? (
            <p className="mt-4 rounded-xl bg-alerta-fundo text-alerta p-4">
              Sem conexão com o banco de dados: as turmas padrão estão em uso e não podem ser alteradas agora.
            </p>
          ) : (
            <>
              <form onSubmit={handleCreateClass} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl">
                <label htmlFor="nova-turma" className="sr-only">
                  Nome da nova turma
                </label>
                <input
                  id="nova-turma"
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: 1º Ano Informática B - 2027"
                  className="campo"
                />
                <button type="submit" className="btn btn-primario shrink-0">
                  <Plus className="w-[18px] h-[18px]" aria-hidden="true" />
                  Criar turma
                </button>
              </form>

              {turmas.length === 0 ? (
                <p className="mt-4 text-grafite-2">Nenhuma turma cadastrada. Crie a primeira acima.</p>
              ) : (
                <ul className="mt-4 divide-y divide-linha border-y border-linha">
                  {turmas.map((t) => (
                    <li key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      {editingClass?.id === t.id ? (
                        <form onSubmit={handleRenameClass} className="flex-1 flex flex-col sm:flex-row gap-2">
                          <label htmlFor={`renomear-${t.id}`} className="sr-only">
                            Novo nome para {t.nome}
                          </label>
                          <input
                            id={`renomear-${t.id}`}
                            type="text"
                            value={editingClass.nome}
                            onChange={(e) => setEditingClass({ id: t.id, nome: e.target.value })}
                            className="campo"
                            autoFocus
                          />
                          <span className="flex gap-2 shrink-0">
                            <button type="submit" className="btn btn-primario">
                              Salvar
                            </button>
                            <button type="button" onClick={() => setEditingClass(null)} className="btn btn-discreto">
                              Cancelar
                            </button>
                          </span>
                        </form>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold">{t.nome}</p>
                            <p className="text-sm text-grafite-2">
                              {t.alunos === 0 ? 'Nenhum aluno' : t.alunos === 1 ? '1 aluno' : `${t.alunos} alunos`}
                            </p>
                          </div>
                          <span className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setClassNotice(null);
                                setEditingClass({ id: t.id, nome: t.nome });
                              }}
                              className="btn btn-secundario !min-h-10 !py-1.5"
                              aria-label={`Renomear a turma ${t.nome}`}
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                              Renomear
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setClassNotice(null);
                                setClassToDelete(t);
                              }}
                              className="btn !min-h-10 !w-10 !p-0 text-erro hover:bg-erro-fundo"
                              aria-label={`Excluir a turma ${t.nome}`}
                              title="Excluir turma"
                            >
                              <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                            </button>
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p role="status" className={`mt-3 min-h-6 ${classNotice?.error ? 'text-erro font-semibold' : 'text-grafite-2'}`}>
            {classNotice?.text}
          </p>
        </section>

        <section aria-labelledby="titulo-dossies" className="folha overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-linha">
            <h2 id="titulo-dossies" className="text-2xl font-extrabold">
              Dossiês dos estudantes
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 md:w-auto w-full">
              <div className="relative sm:w-72">
                <label htmlFor="busca-aluno" className="sr-only">
                  Buscar aluno por nome
                </label>
                <Search className="w-5 h-5 text-grafite-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="busca-aluno"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar aluno por nome..."
                  className="campo !pl-10"
                />
              </div>
              <div>
                <label htmlFor="filtro-turma" className="sr-only">
                  Filtrar por turma
                </label>
                <select id="filtro-turma" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="campo sm:w-56">
                  <option value="todas">Todas as Turmas</option>
                  {classFilterOptions.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {listNotice && (
            <p role="status" className="px-4 sm:px-5 py-3 bg-ok-fundo text-ok font-semibold border-b border-linha">
              {listNotice}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <caption className="sr-only">Estudantes, progresso e nota de processo</caption>
              <thead className="bg-papel text-grafite-2">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Estudante</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Turma</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Etapa atual</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Missões</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Nota</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-grafite-2">
                      Nenhum estudante encontrado com o filtro atual.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const isReviewed = Boolean(item.reviewedBy);
                    return (
                      <tr key={item.sessionId} className="hover:bg-papel/70">
                        <th scope="row" className="px-4 py-3.5 font-bold">
                          {item.student.fullName}
                        </th>
                        <td className="px-4 py-3.5 text-grafite-2">{item.student.className}</td>
                        <td className="px-4 py-3.5">Etapa {item.session.currentStage}/8</td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1" role="img" aria-label={`${item.session.completedMissions.length} de 8 missões concluídas`}>
                            {Array.from({ length: 8 }).map((_, k) => (
                              <span
                                key={k}
                                aria-hidden="true"
                                className={`w-2 h-4 rounded-sm ${item.session.completedMissions.includes(k + 1) ? 'bg-caneta' : 'bg-linha'}`}
                              />
                            ))}
                            <span aria-hidden="true" className="ml-1.5 text-sm text-grafite-2">
                              {item.session.completedMissions.length}/8
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-lg">
                          {item.finalTotalScore.toFixed(1)}
                          <span className="text-sm text-grafite-2 font-normal"> / 10</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-2 font-semibold ${isReviewed ? 'text-ok' : 'text-alerta'}`}>
                            <span aria-hidden="true" className={`led ${isReviewed ? 'led-verde' : 'led-ambar'}`} />
                            {isReviewed ? 'Validado pelo Docente' : 'Revisão Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEvaluationModal(item)}
                              className="btn btn-secundario !min-h-10 !py-1.5 whitespace-nowrap"
                              aria-label={`Avaliar Dossiê de ${item.student.fullName}`}
                            >
                              <Edit3 className="w-4 h-4" aria-hidden="true" />
                              Avaliar Dossiê
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setStudentToDelete(item);
                              }}
                              className="btn !min-h-10 !w-10 !p-0 text-erro hover:bg-erro-fundo"
                              aria-label={`Excluir ${item.student.fullName} e suas respostas`}
                              title="Excluir aluno e respostas"
                            >
                              <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />

      <Dialog
        open={Boolean(studentToDelete)}
        onClose={() => !deleting && setStudentToDelete(null)}
        size="md"
        title="Excluir aluno?"
        description={studentToDelete ? `${studentToDelete.student.fullName}, ${studentToDelete.student.className}` : undefined}
        closeLabel="Cancelar exclusão"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <button type="button" onClick={() => setStudentToDelete(null)} disabled={deleting} className="btn btn-discreto" data-autofocus>
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmDeleteStudent} disabled={deleting} className="btn bg-erro text-white hover:bg-[#8f1c13]">
              <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
              {deleting ? 'Excluindo...' : 'Excluir aluno e respostas'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p>Serão apagados de forma definitiva:</p>
          <ul className="list-disc pl-6 space-y-1 text-grafite-2">
            <li>o cadastro do aluno e o progresso nas missões;</li>
            <li>suspeitas, testes, intervenções, conceitos salvos e justificativas;</li>
            <li>as notas da rubrica e o seu parecer.</li>
          </ul>
          <p className="font-semibold">Essa ação não pode ser desfeita.</p>
          {deleteError && (
            <p role="alert" className="rounded-xl bg-erro-fundo text-erro p-3 font-semibold">
              {deleteError}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={Boolean(classToDelete)}
        onClose={() => setClassToDelete(null)}
        size="md"
        title="Excluir turma?"
        description={classToDelete?.nome}
        closeLabel="Cancelar exclusão"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <button type="button" onClick={() => setClassToDelete(null)} className="btn btn-discreto" data-autofocus>
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmDeleteClass} className="btn bg-erro text-white hover:bg-[#8f1c13]">
              <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
              Excluir turma
            </button>
          </div>
        }
      >
        <p>
          {classToDelete && classToDelete.alunos > 0
            ? `Esta turma tem ${classToDelete.alunos === 1 ? '1 aluno' : `${classToDelete.alunos} alunos`}. Exclua os alunos ou renomeie a turma antes de apagá-la.`
            : 'A turma deixa de aparecer na tela de identificação dos alunos.'}
        </p>
      </Dialog>

      <Dialog
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        size="xl"
        title={selectedStudent ? `Avaliação: ${selectedStudent.student.fullName}` : ''}
        description={selectedStudent ? `${selectedStudent.student.className}. Sessão ${selectedStudent.sessionId}` : undefined}
        closeLabel="Fechar avaliação"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <button type="button" onClick={() => setSelectedStudent(null)} className="btn btn-discreto">
              Cancelar
            </button>
            <button type="button" onClick={handleSaveEvaluation} className="btn btn-primario">
              <CheckCircle2 className="w-[18px] h-[18px]" aria-hidden="true" />
              Salvar Avaliação Docente
            </button>
          </div>
        }
      >
        {selectedStudent && (
          <div className="space-y-8">
            {saveNotice && (
              <div role="status" className="rounded-xl bg-ok-fundo border border-ok/25 p-4 text-ok font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                {saveNotice}
              </div>
            )}

            <section aria-labelledby="titulo-just-aluno">
              <h3 id="titulo-just-aluno" className="text-xl font-extrabold">
                Justificativas escritas pelo estudante
              </h3>
              {Object.keys(selectedStudent.notebook.consolidations).length === 0 ? (
                <p className="mt-3 text-grafite-2">Nenhuma consolidação enviada ainda.</p>
              ) : (
                <ol className="mt-3 space-y-4">
                  {Object.values(selectedStudent.notebook.consolidations).map((c) => (
                    <li key={c.missionNumber} className="border-l-4 border-caneta pl-4">
                      <p className="font-bold">
                        {c.missionNumber === 8 ? 'Desafio Integrador' : `Missão ${c.missionNumber} (Camada ${c.missionNumber})`}
                      </p>
                      <p className="text-grafite-2">
                        <strong className="text-grafite">Causa apontada:</strong> {c.identifiedCause || 'não informada'}
                      </p>
                      <p className="mt-1 leading-relaxed">{c.justificationText}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <fieldset>
              <legend className="text-xl font-extrabold">Notas por critério (total 10 pontos)</legend>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {Object.values(selectedStudent.rubric).map((crit) => {
                  const currentScore = rubricScores[crit.criterionKey] !== undefined ? rubricScores[crit.criterionKey] : crit.autoScore;
                  const inputId = `nota-${crit.criterionKey}`;
                  return (
                    <div key={crit.criterionKey} className="rounded-xl border border-linha p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <label htmlFor={inputId} className="font-bold">
                          {crit.title}
                        </label>
                        <span className="text-sm text-grafite-2 whitespace-nowrap">máx. {crit.maxScore.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          id={inputId}
                          type="range"
                          min="0"
                          max={crit.maxScore}
                          step="0.1"
                          value={currentScore}
                          onChange={(e) => {
                            setRubricScores({
                              ...rubricScores,
                              [crit.criterionKey]: parseFloat(e.target.value)
                            });
                          }}
                          aria-valuetext={`${currentScore.toFixed(1)} de ${crit.maxScore.toFixed(1)}`}
                          className="flex-1 h-11 accent-caneta"
                        />
                        <output htmlFor={inputId} className="font-display font-extrabold text-2xl w-12 text-right">
                          {currentScore.toFixed(1)}
                        </output>
                      </div>
                      <p className="text-sm text-grafite-2">Automática: {crit.autoScore.toFixed(1)}</p>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="parecer-geral" className="text-xl font-extrabold block">
                Parecer geral
              </label>
              <p id="parecer-ajuda" className="text-grafite-2 mb-2">
                Aparece no relatório do aluno.
              </p>
              <textarea
                id="parecer-geral"
                aria-describedby="parecer-ajuda"
                value={feedbackGeneral}
                onChange={(e) => setFeedbackGeneral(e.target.value)}
                rows={4}
                placeholder="Ex: Demonstrou excelente raciocínio ao relacionar o endereço MAC à comutação local e diferenciar do roteamento por IP..."
                className="campo leading-relaxed"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
