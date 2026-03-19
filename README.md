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
- Publicar link gratuito temporario:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start_cloudflare_tunnel.ps1`
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

## Deixar no ar gratis (Cloudflare Tunnel)
Essa e a opcao 100% gratuita sem servidor pago. O site roda no seu PC e fica publico por um link HTTPS.

### 1. Instalar o Cloudflare Tunnel
- Windows (Winget):
  - `winget install Cloudflare.cloudflared`

### 2. Subir o sistema local
- `npm run bootstrap`

### 3. Publicar com link publico
- `npm run public`

O comando acima:
- valida se a API esta rodando em `http://localhost:3000`
- abre um tunel gratuito `trycloudflare`
- mostra uma URL publica como `https://xxxxx.trycloudflare.com`

Importante:
- Para continuar no ar, seu computador precisa ficar ligado e com esse terminal aberto.
- A URL do `trycloudflare` pode mudar a cada inicializacao.

## Deploy gratuito (Oracle VM + GitHub Actions)
Esse projeto ja esta preparado para deploy gratuito em uma VM Always Free da Oracle.

Arquivos usados:
- `deploy/bootstrap_oracle_vm.sh` (configuracao inicial da VM)
- `deploy/docker-compose.oracle.yml` (API + MySQL em producao)
- `.github/workflows/deploy-oracle-vm.yml` (deploy automatico a cada push na `main`)

### 1. Configurar a VM Oracle (uma unica vez)
1. Crie uma VM Ubuntu no Always Free.
2. Libere as portas `22` e `80` nas regras de rede da Oracle.
3. Conecte via SSH e execute:
   - `git clone https://github.com/GabrielSaraiva636/Quadra.git`
   - `cd Quadra`
   - `chmod +x deploy/bootstrap_oracle_vm.sh`
   - `./deploy/bootstrap_oracle_vm.sh`
4. Saia e entre novamente na VM para aplicar o grupo `docker`.

### 2. Configurar Secrets no GitHub
No repositório, em `Settings > Secrets and variables > Actions`, crie:
- `ORACLE_HOST` (IP publico da VM)
- `ORACLE_USER` (ex.: `ubuntu`)
- `ORACLE_SSH_PRIVATE_KEY` (chave privada SSH completa)
- `ORACLE_APP_DIR` (opcional, ex.: `/home/ubuntu/quadra`)
- `DB_PASSWORD` (senha do usuario `society_user`)
- `MYSQL_ROOT_PASSWORD` (senha root do MySQL)
- `JWT_SECRET` (segredo JWT em producao)

### 3. Publicar
- Faça push na branch `main`.
- O workflow `Deploy Oracle VM (Free)` executa automaticamente.
- URL final: `http://SEU_IP_PUBLICO`

## Deploy 1-clique no Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://dashboard.render.com/blueprint/new?repo=https://github.com/GabrielSaraiva636/Quadra)

Link direto:
- `https://dashboard.render.com/blueprint/new?repo=https://github.com/GabrielSaraiva636/Quadra`

Ao abrir o link:
1. Conecte sua conta GitHub na Render (se ainda nao estiver conectada).
2. Revise os servicos do `render.yaml`.
3. Clique em `Deploy Blueprint`.
