# Plano de Migração — Supabase ➜ VPS (Easypanel + MySQL)

> Todo o código já está pronto na branch `migracao-mysql`.
> Aqui estão **só os passos que você faz** nos painéis (Supabase, domínio e Easypanel).
> Quando aparecer 💬, é só me avisar aqui no Claude Code que eu faço a minha parte.
> Marque `[x]` em cada item concluído.

**Como vai ficar:** no Easypanel, **3 serviços** — o site (`web`), o banco (`mysql`) e o **phpMyAdmin** (painel para ver e importar dados do banco pelo navegador).
O login usa o próprio banco e os arquivos ficam numa pasta (volume) do site. Nada de Supabase.

---

## Passo 1 — Dados do Supabase ✅ pronto

- [x] O arquivo **`supabase-dados.sql.gz`** já foi gerado na pasta do projeto (3.680 questões, 46 provas, 3 usuários com senha, treinamento, apostila etc.). Ele fica só no seu computador, fora do GitHub.
- [ ] Separe as chaves de IA que você usa hoje: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`.

> Se entrarem dados novos no site antigo antes da troca, 💬 me peça um arquivo atualizado.

---

## Passo 2 — Domínio (~5 min + espera)

- [ ] No painel onde seu domínio está registrado (Registro.br, Cloudflare, Hostinger…), crie dois registros **A**:
  - Nome: `app` (ou o que preferir) ➜ Valor: **IP do seu VPS**
  - Nome: `pma` ➜ Valor: **IP do seu VPS** (para o phpMyAdmin)
- [ ] Aguarde a propagação (de minutos a algumas horas).

---

## Passo 3 — Publicar o código no GitHub

- [ ] 💬 Me diga: **"pode fazer commit e push da branch migracao-mysql"**.

---

## Passo 4 — Criar o banco MySQL e o phpMyAdmin no Easypanel (~20 min)

### MySQL

- [ ] Easypanel ➜ **Create Project** ➜ nome: `descomplicando-oab`.
- [ ] Dentro do projeto ➜ **+ Service ➜ MySQL**:
  - Service name: `mysql`
  - Image: `mysql:8`
  - Database: `descomplicando`
  - User: `app` — crie uma senha forte e **anote**
  - Root password: outra senha forte, **anote**
- [ ] Clique em **Create / Deploy** e espere ficar verde.
- [ ] Na aba **Credentials/Overview** do MySQL, copie a **Internal Connection URL**
  (algo como `mysql://app:SENHA@descomplicando-oab_mysql:3306/descomplicando`).

---

### phpMyAdmin

- [ ] No projeto ➜ **+ Service ➜ App** ➜ nome: `phpmyadmin` (ou use **Templates ➜ phpMyAdmin**, se aparecer).
- [ ] **Source ➜ Docker Image** ➜ imagem: `phpmyadmin:5`
- [ ] **Environment**:
  ```
  PMA_HOST=<nome interno do MySQL, ex.: descomplicando-oab_mysql>
  PMA_PORT=3306
  UPLOAD_LIMIT=512M
  ```
- [ ] **Domains ➜ Add Domain**: `pma.SEUDOMINIO.com.br` ➜ porta **80** ➜ HTTPS ligado.
- [ ] **Deploy** e abra `https://pma.SEUDOMINIO.com.br`. Entre com o usuário `app` e a senha do Passo 4.
  > 🔒 O phpMyAdmin fica aberto na internet: use sempre senhas fortes. Depois da migração você pode **parar** o serviço e ligá-lo só quando precisar.

---

## Passo 5 — Criar o site no Easypanel (~15 min)

- [ ] No projeto ➜ **+ Service ➜ App** ➜ nome: `web`.
- [ ] **Source ➜ GitHub** ➜ repositório `FlavioAuan/descomplicando-oab` ➜ branch **`migracao-mysql`**.
- [ ] **Build ➜ Dockerfile** (arquivo: `Dockerfile`).
- [ ] **Environment** ➜ cole e troque os valores:
  ```
  DATABASE_URL=<Internal Connection URL do Passo 4>
  AUTH_SECRET=<uma frase longa e aleatória, ex.: 40 letras e números misturados>
  NEXT_PUBLIC_APP_URL=https://app.SEUDOMINIO.com.br
  STORAGE_DIR=/app/storage
  GROQ_API_KEY=...
  OPENROUTER_API_KEY=...
  OPENAI_API_KEY=...
  ```
- [ ] **Mounts ➜ Add Volume**:
  - Name: `storage`
  - Mount path: `/app/storage`
  > ⚠️ Sem esse volume, os arquivos enviados **somem a cada deploy**.
- [ ] **Domains ➜ Add Domain**: `app.SEUDOMINIO.com.br` ➜ porta **3000** ➜ HTTPS ligado.
- [ ] Clique em **Deploy**. O primeiro build leva alguns minutos.
- [ ] Abra **Logs** e confirme que aparece `[db] migrations up to date` (as tabelas foram criadas sozinhas).
  > Se der erro, copie o log e cole aqui.

---

## Passo 6 — Importar os dados pelo phpMyAdmin (~10 min)

Só faça depois do Passo 5 (o site precisa ter criado as tabelas).

- [ ] Abra `https://pma.SEUDOMINIO.com.br` e entre com o usuário `app`.
- [ ] Na coluna da esquerda, clique no banco **`descomplicando`** (deve mostrar umas 36 tabelas).
- [ ] Clique na aba **Importar**.
- [ ] Em **Arquivo para importar**, escolha o `supabase-dados.sql.gz` (está na pasta do projeto no seu computador).
- [ ] Deixe o resto como está e clique em **Importar/Executar** no fim da página. Aguarde a mensagem verde de sucesso.
  > Se der erro de tamanho do arquivo, confira `UPLOAD_LIMIT=512M` no phpMyAdmin e faça Deploy dele de novo.
  > Se der outro erro, tire um print e me mande.
- [ ] Confira: clique na tabela `users` e veja se seus alunos aparecem.

Os usuários continuam com **as mesmas senhas** de hoje.

---

## Passo 7 — Trazer os arquivos (PDFs, materiais) (~5 min)

- [ ] Abra `https://app.SEUDOMINIO.com.br` e entre com sua conta de **super-admin** (mesma senha de sempre).
- [ ] Vá em **Configurações** (menu do super-admin).
- [ ] No quadro **Arquivos do Supabase**, clique em **Importar arquivos do Supabase** e aguarde.
  - O próprio servidor baixa os arquivos e grava no volume.
  - Se aparecer alguma falha na lista, clique de novo; se persistir, me mande a lista.

---

## Passo 8 — Testar (~20 min)

- [ ] Entrar com um usuário antigo (senha de sempre)
- [ ] Senha errada mostra "Credenciais inválidas"
- [ ] Criar um usuário novo pela tela de cadastro
- [ ] Sair e tentar abrir `/dashboard` (deve voltar para o login)
- [ ] Aluno: simulados, exercícios, flashcards, caderno de erros, progresso
- [ ] Admin: treinamentos, conteúdos, enviar um PDF/material
- [ ] Tutor de IA e geração de conteúdo
- [ ] Botão **Imprimir Apostila**
- [ ] PDFs antigos abrindo
- [ ] **Deploy** de novo no `web` e confirmar que o arquivo enviado **continua lá**
- [ ] Testar no celular

Se algo falhar, me descreva o que aconteceu (ou cole o log) e eu corrijo.

---

## Passo 9 — Finalizar

- [ ] 💬 Me diga: **"pode juntar na master"**. Depois, no Easypanel ➜ `web` ➜ Source, troque a branch para **`master`** e faça **Deploy**.
- [ ] Se entrou gente nova ou dados novos no site antigo durante os testes: 💬 me peça um **arquivo novo** e refaça o **Passo 6** (e o 7) logo antes de liberar. A importação substitui os dados anteriores. Se quiser evitar isso, avise os alunos e pare de usar o site antigo durante a troca.
- [ ] Se o domínio principal apontava para o site antigo, aponte-o para o IP do VPS e adicione-o em **Domains** do `web`.
- [ ] **Backups:**
  - MySQL ➜ **Backups** ➜ ative backup automático. (No phpMyAdmin, aba **Exportar**, você também pode baixar uma cópia manual quando quiser.)
  - Arquivos: ative **snapshots** do VPS no painel do seu provedor (o volume `storage` não está no banco).
- [ ] Use por **1–2 semanas**. Tudo certo? Pause/apague o projeto no Supabase e o hosting antigo.

---

## Se algo der errado

| Problema | O que fazer |
|---|---|
| Site não sobe | `web` ➜ **Logs** ➜ copie e cole aqui |
| Erro de banco nos logs | Confira `DATABASE_URL` (usuário, senha e o nome interno do MySQL) |
| Ninguém consegue entrar / volta sempre para o login | Confira se `AUTH_SECRET` está preenchido e faça **Deploy** |
| Arquivos somem após deploy | Confira o volume em `/app/storage` (Passo 5) |
| Usuário esqueceu a senha | 💬 Me diga o e-mail; eu te mando um comando SQL para colar no phpMyAdmin (aba **SQL**) |
| phpMyAdmin não conecta no banco | Confira `PMA_HOST` (nome interno do MySQL) e se o MySQL está verde |
| Quero voltar atrás | O Supabase continua intacto até o Passo 9: aponte o domínio de volta para o site antigo |
