# BARBERNEX
**A nova era da gestão para barbearias.**

Plataforma SaaS (Next.js 15, React 19, TypeScript, PostgreSQL, Prisma) com marca **preto + azul elétrico**.

## Rotas
- `/` — apresentação da BARBERNEX e planos
- `/cadastro` — cadastro de barbearia e do proprietário
- `/login` — acesso por usuário e senha
- `/master` — console Master (exclusivo para papel MASTER)
- `/admin` — gestão do proprietário da barbearia
- `/b/[slug]` — site e agenda pública por barbearia
- `/b/[slug]/confirmacao/[reference]` — comprovante da reserva e link do WhatsApp

## Funcionalidades implementadas em código
- Modelo multi-barbearia no PostgreSQL e sessão com token aleatório armazenado por hash; senhas via bcrypt.
- Contas por barbearia, aprovação manual de planos pelo Master (30, 90, 180 dias); suspensão e redefinição de senha auditadas.
- Página pública com serviços, profissionais, fotos/vídeos, depoimentos, Pix manual/pagamento presencial e horários.
- Reservas protegidas contra sobreposição por transação com bloqueio do profissional no PostgreSQL. WhatsApp aberto com texto pronto depois da reserva (não envia automaticamente).
- Administrativo: dashboard, agenda, concluir/cancelar/registrar pagamento, cortes avulsos, despesas, receitas, comissões estimadas, clientes, equipe, jornadas, serviços, site e feedbacks.
- Upload de imagens (JPG, PNG, WEBP) e vídeos MP4 para diretório local persistente de servidor.
- Interface responsiva, identidade BARBERNEX preto e azul elétrico.

## Como executar em servidor com Node.js + PostgreSQL
Requisitos: Node.js 22+, npm, PostgreSQL 16+.

1. `npm install`
2. Copie `.env.example` para `.env` e altere `DATABASE_URL`.
3. `npx prisma generate`
4. `npx prisma db push` (ambiente de desenvolvimento; para produção, gerar e aplicar migrações revisadas).
5. Crie conta Master usando variáveis de ambiente `MASTER_USERNAME` e `MASTER_PASSWORD` (12+ caracteres) e execute `npm run master:create`.
6. `npm run dev` para desenvolvimento ou `npm run build && npm start` para execução Node.js tradicional.
7. Acesse `http://localhost:3000`.

Se usar o Compose local, defina `POSTGRES_PASSWORD` no terminal e execute `docker compose up -d`. O Compose disponibiliza PostgreSQL apenas em `127.0.0.1:5432`.

**Uploads:** configure `UPLOAD_DIR` para pasta persistente do servidor, com permissão de escrita e backup. Em serviços sem armazenamento persistente, configure um volume ou adapte para S3/R2 antes de vender assinaturas.

## Assinaturas
- Mensal 30 dias: R$ 19,90
- Trimestral 90 dias: R$ 29,90
- Semestral 180 dias: R$ 59,90

**O gateway de cobrança não está integrado.** O cadastro cria uma conta com status PENDENTE; o Master ativa/renova manualmente o período. Não existe confirmação automática de pagamento das assinaturas ou do Pix dos clientes.

## Segurança e limitações conhecidas
- Não colocar credenciais, senhas, tokens, chaves privadas ou dados reais em repositório público.
- O acesso Master é criado via script no servidor, não existe senha padrão.
- Nunca interpretar "valor agendado" como "faturamento": receitas mostram apenas serviços concluídos e pagos; despesas são registros manuais.
- Necessário implementar rate limiting de login e cadastro, proteção anti-spam de agendamentos, recuperação de senha com verificação, migrações versionadas, verificações de extensão real do arquivo, moderação ampliada de mídia, e revisão de conformidade LGPD antes de uso público comercial.
- O armazenamento local dos uploads exige persistência real, não é adequado a hospedagem serverless efêmera sem adaptação.
- Jornadas atualmente suportam um intervalo de abertura por dia; pausas intradiárias e bloqueio de férias são melhorias futuras.
- O painel não é um gateway financeiro; não emite NF nem baixa Pix automaticamente.
- O aplicativo não é considerado pronto para produção sem testes de integração, testes de concorrência das reservas e implantação com HTTPS, backups e monitoramento.

## Revisão contínua
A GitHub Action em `.github/workflows/ci.yml` instala dependências, valida o schema, executa verificação TypeScript e tenta compilar o Next.js. Verifique o resultado da Action antes de considerar o commit aprovado.


## Central Master separada e suporte editável
- Acesse `/master/login` para o Master; o login comum `/login` aceita **somente proprietários**.
- A autorização é validada no servidor em toda ação Master e a sessão Master usa cookie separado.
- Para configurar o usuário **ADMIN**, defina `MASTER_USERNAME=ADMIN` e `MASTER_PASSWORD` como variável privada no servidor, e rode `npm run master:create`. **Nunca salve a senha no GitHub**.
- Após alterar credenciais, reinicie sessões Master antigas conforme sua política de segurança.
- O Master edita o WhatsApp, e-mail e mensagem de suporte em `/master#suporte`. O proprietário visualiza os canais em `/admin#suporte`.
- Cada profissional pode ajustar o intervalo entre horários (15–120 minutos) e o limite diário de reservas. Um limite 0 significa ilimitado.
- Depois da atualização do código, sincronize o schema com `npx prisma db push` em desenvolvimento, ou migração revisada em produção.

## Navegação e configuração pré-ativação
- Painéis renovados com visão geral e cartões de acesso rápido; as funcionalidades anteriores permanecem nos módulos da barra lateral. Os painéis não devem ser importados parcialmente por geradores externos.
- Novas barbearias em estado PENDING podem configurar site, serviços, equipe, horários, bloqueios, galeria e feedbacks enquanto aguardam a assinatura. O agendamento público e operações de recebimento permanecem condicionados à assinatura ativa.
- Os responsáveis podem alterar seus contatos no módulo 'Minha conta' e sua senha na tela própria. O Master pesquisa por nome, WhatsApp, usuário e e-mail.
- Erros de banco ou ambiente exibem tela de recuperação em vez de tela quebrada. Antes de publicar, rodar migrações/esquema, configurar PostgreSQL e variáveis privadas, e monitorar logs.
- Base44 e GitHub não se sincronizam automaticamente. Esta aplicação exige um runtime Node.js com PostgreSQL e armazenamento persistente de mídia.
