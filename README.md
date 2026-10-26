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

As tabelas são criadas automaticamente na primeira requisição (ver `lib/db-schema.ts`).

## Deploy na Hostinger

1. hPanel → Bancos de Dados → MySQL: crie o banco e o usuário.
2. hPanel → Sites → Adicionar site → Node.js → importe `abner-lucas/missao-osi` (branch `master`).
3. Configure: Node 22, gerenciador `npm`, build `npm run build`, start `npm start`.
4. Cadastre as variáveis acima em Variáveis de ambiente e faça um novo deploy.

Cada `git push` na `master` gera um novo deploy. Mudanças em variáveis de ambiente só valem após um novo build.
