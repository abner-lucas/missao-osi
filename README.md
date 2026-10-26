# Missão OSI: Investigadores da Rede

Simulador investigativo das sete camadas do modelo OSI, com laboratório de diagnóstico, mapa mental interativo e caderno de evidências. Desenvolvido para o IFPA Campus Breves.

Em produção: https://missao-osi.profabnerlucas.com

## Stack

- Next.js 15 (App Router) + React 19 + Tailwind CSS 4
- MySQL (Hostinger) acessado apenas pelas rotas de API em `app/api/`
- Hospedagem: Hostinger Node.js, com deploy automático a partir deste repositório (branch `master`)

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha os dados do MySQL e a chave do professor
npm run dev
```

Sem as variáveis `DB_*`, o site funciona normalmente e o progresso fica salvo só no navegador do aluno.

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DB_HOST` | `127.0.0.1` na Hostinger |
| `DB_PORT` | `3306` |
| `DB_NAME` | Nome do banco MySQL |
| `DB_USER` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |
| `TEACHER_ACCESS_KEY` | Chave do Painel do Professor (`/professor/login`) |


## Banco de dados (análise no phpMyAdmin)

Tabelas e colunas em português; datas no horário de Brasília. As tabelas são criadas sozinhas (`lib/db-schema.ts`).

| Tabela | Conteúdo |
| --- | --- |
| `alunos` | Nome e turma |
| `sessoes` | Andamento da atividade (etapa, missões concluídas, situação) |
| `missoes` | Catálogo das 8 missões |
| `progresso_missoes` | Situação de cada missão por aluno |
| `hipoteses` | Momento C: hipóteses formuladas |
| `testes_executados` | Momento D: previsão, resultado e interpretação |
| `intervencoes` | Momento E: correções aplicadas |
| `consolidacoes` | Momento F: causa identificada e justificativa |
| `conceitos_salvos` | Conceitos do Atlas guardados no caderno |
| `notas_rubrica` | Nota automática e nota do professor por critério |
| `avaliacoes_professor` | Parecer geral do professor |

Visões prontas para análise:

- `vw_resumo_alunos`: uma linha por aluno com contagens, nota automática, nota final e se houve atividade após a revisão.
- `vw_notas_por_criterio`: notas de cada critério da rubrica.
- `vw_registro_missoes`: o que cada aluno fez em cada missão.
- `vw_linha_do_tempo`: todas as ações em ordem cronológica.

## Deploy na Hostinger

1. hPanel → Bancos de Dados → MySQL: crie o banco e o usuário.
2. hPanel → Sites → Adicionar site → Node.js → importe `abner-lucas/missao-osi` (branch `master`).
3. Configure: Node 22, gerenciador `npm`, build `npm run build`, start `npm start`.
4. Cadastre as variáveis acima em Variáveis de ambiente e faça um novo deploy.

Cada `git push` na `master` gera um novo deploy. Mudanças em variáveis de ambiente só valem após um novo build.
