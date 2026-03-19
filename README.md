# Quadra Show de Bola

Sistema web para gestao de quadra de futebol society com controle de jogos, copa, caixa, estoque e indicadores.

## Stack
- Backend: Node.js + Express + MySQL/MariaDB + JWT
- Frontend: HTML/CSS/JS
- Banco: MySQL 8 / MariaDB

## Execucao imediata (1 comando)
1. Na raiz do projeto, rode:
   - `.\scripts\bootstrap_local.bat`
2. Acesse:
   - `http://localhost:3000`
3. Login inicial:
   - Email: `admin@society.local`
   - Senha: `admin123`

Esse bootstrap faz:
- sobe o MariaDB local (inicializa datadir se necessario)
- cria/garante database e usuario da aplicacao
- aplica o schema `database/001_init.sql`
- instala dependencias do backend (se faltar)
- sobe a API
- executa smoke test dos endpoints principais

## Scripts principais
- Bootstrap completo:
  - `.\scripts\bootstrap_local.bat`
- Subir banco:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start_local_db.ps1`
- Aplicar schema/manual:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\init_database.ps1`
- Subir API:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start_api.ps1`
- Teste rapido de saude:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1`
- Parar banco + API:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\stop_local_stack.ps1`

## Variaveis opcionais dos scripts
Voce pode sobrescrever com variaveis de ambiente:
- `QUADRA_DB_HOST` (padrao `127.0.0.1`)
- `QUADRA_DB_PORT` (padrao `3306`)
- `QUADRA_DB_ROOT_USER` (padrao `root`)
- `QUADRA_DB_ROOT_PASS` (padrao `root`)
- `QUADRA_DB_APP_USER` (padrao `society_user`)
- `QUADRA_DB_APP_PASS` (padrao `society_pass`)
- `QUADRA_DB_NAME` (padrao `society_db`)
- `QUADRA_DB_DATADIR` (padrao `C:\mariadb-data`)

## Modulos implementados
- Login JWT (admin e atendente)
- Dashboard de jogos (filtro, criar, editar, excluir com regra)
- PDV por jogo (resumo, clientes, lancamento de item e pagamentos)
- Estoque (CRUD produto, ajuste e historico de movimentacoes)
- Caixa (abertura diaria e resumo do dia)
- Indicadores (por jogo, mensal, estoque, comissao)
- Gestao de usuarios (somente admin)

## Banco de dados
- Script SQL principal: `database/001_init.sql`
- Inclui tabelas, chaves estrangeiras e seeds obrigatorios.

## Backup automatico (.bat)
- Script: `scripts/backup_database.bat`
- Faz `mysqldump` com timestamp e salva em `scripts/backups`.
- Configure credenciais no arquivo antes de usar.
- Para agendamento 00:00, use o Agendador de Tarefas do Windows apontando para esse `.bat`.

## Observacoes
- O projeto foi criado para execucao local em uma maquina.
- Se voce preferir Docker, pode usar o `docker-compose.yml` com MySQL.
