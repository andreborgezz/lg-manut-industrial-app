# Guia de Operação — L.G. Manutenção Industrial

## Comandos do dia a dia

### Ver logs em tempo real
```bash
# todos os containers
docker compose -f docker-compose.prod.yml logs -f

# só o back
docker compose -f docker-compose.prod.yml logs -f back

# só o Caddy (acesso HTTP)
docker compose -f docker-compose.prod.yml logs -f caddy

# últimas 100 linhas do backup
docker compose -f docker-compose.prod.yml logs --tail=100 backup
```

### Reiniciar um serviço
```bash
# reiniciar o back sem derrubar os outros
docker compose -f docker-compose.prod.yml restart back

# reiniciar tudo
docker compose -f docker-compose.prod.yml restart
```

### Ver status e saúde dos containers
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Backup

### Onde os backups ficam
No bucket R2 definido em `R2_BACKUP_BUCKET` (separado dos PDFs).  
Arquivos: `AAAA-MM-DD_HHMM.dump` (formato custom do pg_dump, comprimido).

### Retenção automática
- **14 diários** (qualquer dia exceto domingo)
- **8 semanais** (domingos)
- O script apaga os mais antigos automaticamente e registra no log o que foi removido.

### Horário de execução
O container `backup` roda cron às **06:00 UTC = 03:00 BRT** todos os dias.

### Forçar um backup manualmente
```bash
docker compose -f docker-compose.prod.yml exec backup \
  npx tsx scripts/backup.ts
```

### Conferir o último backup
```bash
# log do último ciclo
docker compose -f docker-compose.prod.yml logs --tail=50 backup

# listar objetos no bucket R2 via AWS CLI (se configurado)
aws s3 ls s3://${R2_BACKUP_BUCKET}/ --endpoint-url=${R2_ENDPOINT}
```

---

## Restauração

> **IMPORTANTE:** A restauração cria um banco NOVO. Nunca sobrescreve o banco em uso.

### Passo a passo

1. No servidor (ou localmente com `DATABASE_URL` apontando para o Postgres):

```bash
cd /caminho/do/projeto
npx tsx lg-app-core/scripts/restaurar.ts lg_manut_db_restaurado
```

2. O script vai:
   - Listar os backups disponíveis no R2
   - Pedir para escolher um pelo número
   - Confirmar a operação (digitar "confirmo")
   - Criar o banco `lg_manut_db_restaurado`, baixar e restaurar o dump

3. Verificar:
```bash
psql -U lg-manutencao -d lg_manut_db_restaurado \
  -c "SELECT COUNT(*) FROM orcamentos"
```

4. Se tudo ok e precisar trocar o banco em produção, edite `DATABASE_URL` em `.env.prod` e reinicie o back.

---

## Monitoramento

### UptimeRobot — alerta se o sistema cair

1. Acesse [uptimerobot.com](https://uptimerobot.com) → **Add New Monitor**
2. Tipo: **HTTPS**
3. URL: `https://SEU_DOMINIO.COM/api/health`
4. Intervalo: **5 minutos**
5. Alerta: e-mail para Leonardo
6. Espera resposta `200 OK` com `{"ok":true}` — qualquer outro código (incluindo 503 se o banco cair) dispara alerta.

### healthchecks.io — alerta se o backup falhar

1. Acesse [healthchecks.io](https://healthchecks.io) → **Add Check**
2. Nome: `lg-backup-diario`
3. Schedule: **Cron** `0 6 * * *` (06:00 UTC)
4. Grace period: **30 minutos**
5. Copie a URL de ping gerada (ex: `https://hc-ping.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
6. Adicione ao `lg-app-core/.env.prod`:
   ```
   BACKUP_PING_URL=https://hc-ping.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
7. Reinicie o container de backup:
   ```bash
   docker compose -f docker-compose.prod.yml restart backup
   ```
8. Se o backup não pingar em até 30 minutos após às 06:00 UTC, você recebe e-mail.

---

## Primeira implantação (VPS zerada)

```bash
# 1. Clonar o repo
git clone https://github.com/SEU_USUARIO/REPO.git /opt/lg-app
cd /opt/lg-app

# 2. Configurar variáveis
cp .env.example .env
cp lg-app-core/.env.prod.example lg-app-core/.env.prod
# editar .env e lg-app-core/.env.prod com os valores reais

# 3. Subir tudo
docker compose -f docker-compose.prod.yml up -d --build

# 4. Rodar migration de usuários (primeira vez)
docker compose -f docker-compose.prod.yml exec backup \
  npx tsx scripts/migration-usuarios.ts

# 5. Criar o usuário do Leonardo
# (rodar localmente com DATABASE_URL apontando para o Postgres de prod)
DATABASE_URL=postgresql://USER:PASS@IP_VPS:5432/lg_manut_db \
  npx tsx lg-app-core/scripts/criar-usuario.ts
```

---

## Estrutura de arquivos relevantes

```
/opt/lg-app/
├── docker-compose.prod.yml   # composição de produção
├── .env                      # DOMAIN, ACME_EMAIL, POSTGRES_*
├── lg-app-core/
│   ├── .env.prod             # segredos do back (JWT, R2, backup)
│   └── scripts/
│       ├── backup.ts         # executado pelo cron
│       └── restaurar.ts      # restauração manual
├── caddy/
│   └── Caddyfile             # roteamento HTTPS
└── docs/
    └── OPERACAO.md           # este arquivo
```
