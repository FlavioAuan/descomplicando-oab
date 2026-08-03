# DescomplicandOAB

Plataforma SaaS completa para preparação da OAB com Inteligência Artificial.

## Stack Tecnológica

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Server Actions, API Routes, Supabase
- **Banco de Dados**: PostgreSQL via Supabase + Drizzle ORM
- **IA**: Claude API (Anthropic)
- **Deploy**: Vercel

## Funcionalidades

### Super Admin
- Importação histórica de provas da OAB
- Classificação automática de questões com IA
- Geração de previsões para próximos exames
- Gerenciamento completo do sistema

### Admin
- Criação e gestão de treinamentos
- Fluxo de aprovação pedagógica (Rascunho → Revisão → Aprovado)
- Upload de materiais e legislação (RAG)
- Editor completo de treinamentos
- Versionamento automático

### Aluno
- Dashboard com progresso e estimativa de aprovação
- Treinamentos personalizados com cronograma
- Simulados adaptativos (Geral, Disciplina, Previsto)
- Flashcards com repetição espaçada (algoritmo SM-2)
- Tutor IA jurídico com RAG (chat em tempo real)
- Caderno de erros com revisões programadas
- Gamificação: XP, níveis, conquistas, sequência diária
- Certificados digitais

## Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
DATABASE_URL=postgresql://postgres:senha@db.seu-projeto.supabase.co:5432/postgres
ANTHROPIC_API_KEY=sua-chave-claude
CLAUDE_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurar Supabase

#### 3.1 Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie novo projeto
3. Copie as credenciais para `.env.local`

#### 3.2 Executar migration SQL
No SQL Editor do Supabase, execute o arquivo:
```
src/lib/db/migrations/0000_initial.sql
```

Isso cria todas as tabelas, índices, RLS e insere as 19 disciplinas padrão.

#### 3.3 Criar Storage Buckets
No painel do Supabase, crie os buckets:
- `exam-pdfs` (público)
- `materials` (público)
- `videos` (público)
- `certificates` (público)

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## Fluxo de Setup Inicial

### Passo 1: Criar Super Admin
1. Registre uma conta em `/register`
2. No SQL Editor do Supabase, execute:
```sql
UPDATE users SET role = 'super_admin' 
WHERE email = 'seu@email.com';
```

### Passo 2: Importação Histórica
1. Acesse `/super-admin/import`
2. Clique em "Iniciar Importação Histórica"
3. Aguarde o processo (monitoramento em tempo real)

### Passo 3: Classificação com IA
1. Acesse `/super-admin/classify`
2. Execute a classificação em lotes de 20 questões
3. O Claude classificará cada questão em Disciplina > Subtema > Microtema

### Passo 4: Gerar Previsões
1. Acesse `/super-admin/predictions`
2. Clique em "Gerar Novas Previsões"
3. O Claude analisará os dados históricos e gerará o TOP 50

### Passo 5: Criar Primeiro Treinamento
1. Crie um Admin em `/admin/users`
2. O Admin cria treinamento em `/admin/trainings`
3. IA gera cronograma completo automaticamente
4. Admin revisa e aprova
5. Alunos podem acessar

## Arquitetura

```
src/
├── app/
│   ├── (auth)/          # Login, Register
│   ├── (dashboard)/     # Área autenticada
│   │   ├── admin/       # Painel Admin
│   │   ├── super-admin/ # Super Admin
│   │   └── student/     # Área do Aluno
│   └── api/             # API Routes
├── components/
│   ├── ui/              # Shadcn/UI components
│   ├── auth/            # Formulários de auth
│   ├── admin/           # Componentes admin
│   ├── student/         # Componentes aluno
│   └── super-admin/     # Componentes super admin
├── lib/
│   ├── db/              # Schema + migrations Drizzle
│   ├── supabase/        # Clientes Supabase
│   ├── ai/              # Claude AI (classify, generate, RAG)
│   └── utils.ts         # Utilitários
├── server/
│   ├── actions/         # Server Actions (auth, trainings, student)
│   ├── repositories/    # Camada de dados
│   └── services/        # Lógica de negócio
└── types/               # TypeScript types
```

## Deploy na Vercel

### 1. Conectar repositório
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/descomplicando-oab.git
git push -u origin main
```

### 2. Importar no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. "Add New Project" → selecione o repositório
3. Configure as variáveis de ambiente (mesmo do `.env.local`)
4. Deploy!

### 3. Variáveis de ambiente na Vercel
Adicione todas as variáveis do `.env.example` no painel da Vercel.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:generate` | Gerar migrations Drizzle |
| `npm run db:migrate` | Aplicar migrations |
| `npm run db:studio` | Interface visual do banco |
| `npm run db:push` | Push schema (dev) |
| `npm test` | Executar testes |

## Banco de Dados

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários (alunos, admins) |
| `subjects` | 19 disciplinas da OAB |
| `subsubjects` | Subtemas |
| `microtopics` | Microtemas |
| `exams` | Exames da OAB |
| `exam_questions` | Questões classificadas |
| `trainings` | Planos de treinamento |
| `training_days` | Dias do cronograma |
| `training_topics` | Tópicos por dia |
| `apostilas` | Apostilas geradas por IA |
| `flashcards` | Flashcards para revisão |
| `simulations` | Configurações de simulados |
| `student_answers` | Respostas dos alunos |
| `error_notebook` | Caderno de erros |
| `predictions` | Previsões TOP 50 |
| `knowledge_files` | Base jurídica (RAG) |
| `knowledge_chunks` | Chunks indexados |
| `ai_generations` | Log de gerações IA |
| `certificates` | Certificados emitidos |
| `achievements` | Sistema de conquistas |

### Row Level Security (RLS)
- Alunos acessam apenas seus próprios dados
- Conteúdo aprovado é público
- Service role para operações administrativas

## API Routes

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/import/historical` | POST | Importação histórica (SSE) |
| `/api/classify` | POST/GET | Classificação com IA |
| `/api/predictions` | POST/GET | Gerar/listar previsões |
| `/api/tutor` | POST | Chat IA com streaming |
| `/api/generate/apostila` | POST | Gerar apostila |
| `/api/rag/upload` | POST | Upload base jurídica |
| `/api/simulations/:id/questions` | GET | Questões do simulado |

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role para operações admin | ✅ |
| `DATABASE_URL` | String de conexão PostgreSQL | ✅ |
| `ANTHROPIC_API_KEY` | Chave da API Claude | ✅ |
| `CLAUDE_MODEL` | Modelo Claude a usar | `claude-sonnet-4-6` |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação | ✅ |

## Licença

MIT
