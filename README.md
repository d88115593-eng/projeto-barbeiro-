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

## Diagnóstico do aplicativo publicado
- `GET /api/health` retorna status 200 quando a aplicação consegue consultar PostgreSQL, ou 503 quando não consegue. Não expõe credenciais.
- O agendamento verifica novamente o limite diário de reservas e os bloqueios dentro da transação com o profissional bloqueado, evitando ultrapassar o limite em chamadas simultâneas.
- Execute o banco atualizado antes de publicar uma nova versão da aplicação. Uma CI verde só valida uma instância de teste com o schema atualizado; não corrige automaticamente o banco da hospedagem real.


## Versão em revisão: metas individuais, sinais e checkout configurável
- O dono da barbearia pode definir metas mensais por profissional, consultar ranking de faturamento e comparar com os valores recebidos de serviços concluídos e pagos.
- Em **/admin#sinal**, cada barbearia escolhe **sem sinal**, **sinal opcional** ou **sinal obrigatório**. Configura valor fixo/percentual, desconto ou taxa adicional, prazo e mensagem personalizada. O Pix usado é o da barbearia em **Meu site**, e não o do Master.
- Com sinal obrigatório, o sistema coloca o agendamento como **aguardando pagamento**, bloqueia o horário até o vencimento e libera o horário automaticamente nas buscas após expirar. O barbeiro só pode marcar o sinal recebido manualmente após **conferir no banco**. O estado aguardando sinal **não equivale a reserva confirmada**.
- O Master escolhe Pix e/ou um endereço HTTPS de checkout **separado por plano** (mensal, trimestral e semestral) em **/master#vendas**. O link da GATE é um redirecionamento; **não há conciliação nem ativação automática** sem implementar webhook específico do fornecedor.
- Faturamento de serviços e sinais são apresentados separadamente para não confundir adiantamentos com receita integral.
- **Limitação:** QR Pix estático não permite validação automática. Não ativar uma assinatura ou confirmar sinal por comprovante enviado pelo cliente; confira a entrada efetiva na instituição financeira.

### Instalação nova com banco vazio (Node 22 e PostgreSQL 16)
1. Crie banco PostgreSQL **vazio** na sua hospedagem (não restaure dados de testes). Use conexões protegidas e armazenamento de backups.
2. Configure as variáveis privadas **DATABASE_URL**, **MASTER_USERNAME** e **MASTER_PASSWORD** no painel da hospedagem. Nunca grave senhas/chaves no GitHub.
3. Execute `npm ci` (ou `npm install` se ainda não houver package-lock), `npx prisma generate`, `npx prisma db push` **somente na criação inicial de um banco vazio** e `npm run master:create`.
4. Execute `npm run build` e `npm start`, mantenha `/api/health` retornando `database: connected`.
5. Defina **UPLOAD_DIR** para volume permanente com backup, HTTPS obrigatório e um domínio público. Em hospedagem sem volume, imagens desaparecerão entre reinícios.
6. Teste cadastros, horários, bloqueios, sinal obrigatório e aprovação manual, financeiro e e-mails/webhooks **com contas de teste**, antes de cadastrar clientes reais.
7. Configure os links de checkout para o valor de cada plano; ative assinaturas manualmente somente após confirmar pagamento no provedor. Configure as chaves Pix somente no painel autorizado.
8. Planeje migrações versionadas, rotina de backups/restore, logs e controle antiabuso antes de comercializar.

### Testes automatizados no GitHub
A workflow executa PostgreSQL temporário, valida/instala o schema, testa isolamento de lojas, concorrência de agendamentos, sinal e expiração, cálculo financeiro de sinal, TypeScript, build e verificações HTTP em rotas reais. **CI verde não substitui homologação** de pagamentos ou entrega final de notificações externas.
