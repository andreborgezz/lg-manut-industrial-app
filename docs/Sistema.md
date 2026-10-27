# Sistema de Orçamentos — L.G. Manutenção Industrial

## Por que estamos fazendo

O Leonardo Gusmão tem a L.G. Manutenção Industrial em Sorocaba e faz manutenção de máquinas industriais. Hoje ele controla tudo numa planilha e monta cada PDF manualmente no Canva. Isso é lento, sujeito a erro (numeração, valores, dados repetidos) e difícil de consultar o histórico.

O objetivo é trocar a planilha por um sistema web onde ele cria o orçamento em segundos, o PDF sai idêntico ao modelo dele e todo o histórico fica pesquisável. O André (sobrinho) está construindo.

---

## O que o sistema faz hoje

### Orçamentos
- Tabela interativa com as mesmas colunas da planilha (empresa, solicitante, entrada, nº orçamento, nº pedido, máquina, mecânico, início, entrega, valor, status) com edição direta em cada célula.
- Busca por empresa, número ou máquina. Filtro por status (aberto, aprovado, recusado, entregue).
- Filtro por período: Hoje, Esta semana, Este mês, Mês passado, ou intervalo de datas customizado.
- Rodapé com total acumulado dos orçamentos filtrados e contagem de linhas.
- Numeração sequencial a partir do 185 (o último orçamento do Leonardo foi o 184).
- Status: `ABERTO`, `APROVADO`, `RECUSADO`, `ENTREGUE`. Célula de status tem badge colorido. Ao trocar, aparece toast com "Desfazer" por 5 segundos.
- Célula "Nº Pedido" fica destacada (lembrete visual) quando o status é APROVADO mas o pedido ainda não foi preenchido.
- Duplicar orçamento: abre o modal com os dados copiados.
- Editar orçamento: abre o modal preenchido.
- Exportar CSV: gera `.csv` com BOM UTF-8 e separador `;` (abre corretamente no Excel BR), respeitando os filtros ativos.
- Compartilhar por WhatsApp: busca a URL do PDF (assinada, expira em 5 min) e abre `wa.me` com o telefone do solicitante e o texto já preenchido.

### Modal de novo orçamento
- Empresa (combobox com criação inline), Solicitante (combobox, carrega após empresa, criação inline), Título, Escopo (textarea, uma linha por item), Valor (máscara BRL centavos), Prazo (stepper − / input / +, 1–365 dias), Mecânico, Data de entrada, Fim de semana.
- Preview do escopo como lista de bullets (coluna direita), igual ao PDF.
- Itens recentes: após selecionar a empresa, aparecem chips com os últimos 5 orçamentos. Clicar num chip preenche título, escopo e valor de uma vez.
- Salvar / Salvar e gerar PDF (PDF já abre numa nova aba imediatamente).
- Atalhos: `N` abre o modal, `Ctrl+Enter` salva de qualquer campo, `Enter` avança o campo, `Esc` fecha.
- O mecânico da última sessão é lembrado via `localStorage`.

### PDF
- Template HTML renderizado com Playwright (Chromium headless), A4, 2 páginas.
- Página 1: logo, dados da empresa, número, data, solicitante, mecânico, escopo em itens, valor, prazo, campo de assinatura.
- Página 2: termos e condições.
- Fontes: Kollektif (títulos), Open Sans (corpo), Alegreya (rodapé).
- Arquivo salvo no Cloudflare R2 e URL assinada gerada na hora (expira em 5 minutos).

### Empresas
- Tabela com edição inline de nome, CNPJ, e-mail, telefone.
- Contatos adicionais (ctt-empresas) por empresa.
- Página de detalhe da empresa (`/empresas/:id`): lista de solicitantes, últimos 10 orçamentos e total acumulado. Botão "Novo orçamento" com empresa já pré-selecionada.

### Mecânicos
- Tabela com edição inline de nome, telefone e status ativo/inativo.
- Mecânicos inativos não aparecem no modal de orçamento, mas continuam visíveis na linha já existente.

### Autenticação
- Login com e-mail e senha (JWT em cookie `httpOnly`, 7 dias).
- Rate limit no login: 5 tentativas por IP+e-mail a cada 15 minutos.
- Erro genérico "E-mail ou senha inválidos" (não revela qual campo está errado).
- Sessão expirada redireciona para `/login` com aviso.
- Logout pelo botão na sidebar.

### Atalhos globais
- `N` — Novo orçamento
- `?` — Abre modal com todos os atalhos listados
- `Esc` — Fecha modal ou toast mais recente
- `Ctrl+Enter` — Salva no modal
- `Enter` — Avança campo no modal

---

## Como está construído

### Back — `lg-app-core`
- **Runtime:** Node 22, TypeScript (CommonJS, build com `tsc -p tsconfig.build.json`)
- **Framework:** Express 4 com `helmet`, `cors`, `cookie-parser`
- **Banco:** Postgres 16 via `pg` com SQL puro (sem ORM)
- **Validação:** Zod — tanto nas rotas quanto nas variáveis de ambiente (`src/config/env.ts` falha na inicialização se faltar algo)
- **Auth:** `bcryptjs` (cost 12) + `jsonwebtoken` (7d) em cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção
- **Rate limit:** `express-rate-limit` v8 com `ipKeyGenerator` para IPv6
- **PDF:** `playwright-core` (Chromium), template em `src/pdf/orcamento.template.ts`
- **Storage:** `@aws-sdk/client-s3` compatível com Cloudflare R2
- **Erros:** `AppError` centralizado, handler em `src/middlewares/errorHandler.ts`

### Front — `lg-app-page`
- **Runtime:** React 19, Vite 8, TypeScript
- **Roteamento:** `react-router-dom` v7
- **Ícones:** `lucide-react`
- **CSS:** puro, um arquivo ao lado de cada componente, tokens globais em `index.css`
- **Identidade:** preto `#0A0A0A` e âmbar `#EE9C00`
- **Sem:** Redux, Zustand, Tailwind, qualquer lib de UI

### Infraestrutura
- Postgres em Docker local para desenvolvimento (`docker-compose.yml`)
- Produção: VPS com Docker, Caddy (HTTPS automático), back + Postgres em containers
- Backup diário às 03h BRT: `pg_dump -Fc` → Cloudflare R2 (bucket separado do de PDFs)
- Retenção: 14 diários + 8 semanais
- Monitoramento: UptimeRobot no `/api/health` + healthchecks.io no cron de backup

### Repositório
- `andreborgezz/lg-manut-industrial-app`
- Branch `dev` para desenvolvimento, `main` para produção

---

## Scripts utilitários (`lg-app-core/scripts/`)

Todos rodam com `npx tsx scripts/<nome>.ts` dentro de `lg-app-core`, lendo o `.env` automaticamente.

| Script | O que faz |
|---|---|
| `migration-usuarios.ts` | Cria a tabela `usuarios` (roda uma vez por ambiente) |
| `criar-usuario.ts` | Cadastra usuário interativamente, senha sem eco no terminal |
| `backup.ts` | pg_dump → R2, retenção automática, ping ao healthchecks.io |
| `restaurar.ts` | Lista backups no R2, você escolhe, cria banco novo e restaura |
| `testar-backup.ts` | Ciclo completo: dump → upload → restore → valida contagem |

---

## Decisões e pontos em aberto

**Prazo (dias) vs. data de entrega**
O campo "Prazo" no modal é o tempo prometido pro serviço (ex: 2 dias) e aparece no PDF como `Prazo 02 dias`. A planilha tinha uma coluna "Entrega" separada. Falta confirmar com o Leonardo: o prazo equivale à entrega? Se sim, a data de entrega pode ser calculada automaticamente (entrada + prazo dias úteis ou corridos).

**"Sábado 50%" e "M,O" no PDF**
O modelo original do Leonardo tinha essas linhas em alguns orçamentos. Ainda não foi confirmado quando exatamente aparecem. Hoje o campo "Fim de semana" no modal controla isso, mas a lógica de exibição precisa de confirmação.

**"Atenciosamente" com erro de digitação**
O modelo original escreve "Atensiosamente". O sistema está igual ao modelo hoje. Vale avisar o Leonardo para ele decidir se corrige.

**URL do PDF expira em 5 minutos**
A URL assinada do R2 tem TTL de 300 segundos. Para o compartilhamento por WhatsApp isso significa que o solicitante tem 5 minutos para abrir o link. Se o Leonardo precisar de mais tempo, é só aumentar o parâmetro `segundos` em `storage.service.ts` — mas URLs mais longas ficam acessíveis sem autenticação por mais tempo.

**Token do R2**
O token atual tem acesso amplo. Antes de ir a produção: criar um token restrito ao bucket de PDFs e outro ao bucket de backups.

**Dados de teste**
O orçamento de número 185 com valor R$ 2.131.231,23 foi criado nos testes. Antes de o Leonardo começar a usar de verdade: apagar esse registro e resetar a sequence do banco para 185.

```sql
DELETE FROM orcamentos WHERE numero = 185;
ALTER SEQUENCE orcamentos_numero_seq RESTART WITH 185;
```

---

## Próximos passos

1. **Testar com o Leonardo** — criar 3 orçamentos reais, cronometrar, colher feedback.
2. **Importar a planilha** — script que lê o Excel dele e mostra o que entraria antes de inserir de verdade.
3. **Deploy em produção** — VPS, HTTPS com Caddy, CI/CD simples na main.
4. **E-mail** — enviar o PDF por e-mail com histórico de envios por orçamento.
