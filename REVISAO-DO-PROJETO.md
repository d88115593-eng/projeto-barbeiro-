# BARBERNEX — revisão técnica e evolução de experiência
Atualização: 18/11/2026. Base: código do repositório `main`, testes de CI do GitHub Actions. **Não substitui testes na hospedagem real.**

## O que já existe
- SaaS multi-barbearia: isolamento por `shopId`, proprietários com login independente do Master.
- Site de reservas de cada barbearia com fotos dos cortes, profissional, serviço, horário e confirmação.
- Catálogo inicial de 17 serviços, valores e duração de 30 minutos; cada estabelecimento pode editar.
- Agenda com reagendamento, correção de serviço/valor, verificação de conflitos e histórico de alterações.
- Finanças: receitas concluídas e marcadas como pagas, despesas, metas, ranking de serviços e gráficos em 7/30 dias.
- Novo centro de operações na tela inicial: próximos atendimentos, indicadores do dia, meta e link compartilhável.
- Integração opcional via webhook HTTPS com aplicativos externos de notificação; teste, histórico de tentativas e reenvio manual para falhas.
- Checkout de assinatura e Pix de clientes são **manuais**. O app não comprova transferência bancária.

## Melhorias feitas nesta revisão
1. **Usabilidade:** resumo operacional, próximos clientes, compartilhamento do link e formulário público com etapas e resumo.
2. **Controle financeiro:** `paidAt` guarda a data da marcação de pagamento; relatórios usam essa data. Registros antigos sem `paidAt` usam a data do atendimento.
3. **Notificações:** eventos após reserva, edição e cancelamento; teste da URL, indicação de aceite HTTP e registro de falhas. Integração externa é necessária para enviar WhatsApp/push; HTTP 2xx não prova entrega final.
4. **Segurança:** URLs de webhook HTTPS são verificadas e destinos com endereços de rede privada são recusados; limitador por telefone e campo anti-bot nas reservas; transições de agendamento têm regras condicionais e auditoria.

## Pontos importantes antes de vender assinaturas
| Prioridade | Ponto | Motivo |
| --- | --- | --- |
| **Alta** | **O repositório está configurado como público no GitHub** | Revisar a intenção de visibilidade e confirmar que não há segredos/versionamento de dados sensíveis; tornar privado conforme sua estratégia de hospedagem. |
| **Alta** | Banco de produção | Criar migrações revisadas e backup antes de aplicar o schema; a CI usa `prisma db push` **somente em banco de teste**. Campos/tabelas novos: `paidAt`, `AppointmentChange`, `NotificationDelivery` e configurações da barbearia. |
| **Alta** | Armazenamento das fotos | O upload grava no disco local; usar diretório persistente com backup ou serviço S3/R2. Sem isso, fotos podem sumir em hospedagem serverless. |
| **Alta** | Segurança de acesso | Falta limitação centralizada das tentativas de login/cadastro, monitoramento de abuso e revisão de contas/sessões. |
| **Alta** | Privacidade e LGPD | Definir política/aviso de privacidade, retenção e exclusão de dados de clientes e regras de envio para aplicativos terceiros. |
| **Alta** | Entregabilidade das notificações | A entrega atual é tentativa síncrona de até 4 s; para maior escala implementar fila persistente, repetição controlada e canal alternativo. Webhooks customizados precisam de bloqueio de acesso a redes internas também na infraestrutura (risco residual de DNS rebinding). |
| **Média** | Arquivos enviados | Validar assinatura/magic bytes e ampliar proteção contra abuso de uploads. |
| **Média** | Testes | Acrescentar integração ponta a ponta em navegador, testes de permissão entre lojas e concorrência, testes de webhook e recuperação. |
| **Média** | Financeiro | Pagamentos são confirmados manualmente; não existe conciliação Pix, imposto/contabilidade ou emissão fiscal. |
| **Média** | UX | Validar em iPhone e Android reais, acompanhar acessibilidade, tempo de carregamento e informações de erro/sucesso ao salvar. |

## Próxima evolução sugerida
- **PWA instalável + push web** com consentimento explícito, para receber avisos sem manter a página aberta; depende da implantação HTTPS e de um serviço de push.
- **Alertas de retorno**: quantidade de clientes recorrentes, horários mais procurados e histórico de faltas.
- **Agenda proativa**: confirmação e lembrete de horário via aplicativo externo, respeitando consentimento e políticas do canal.
- **Plataforma Master** com gráficos de receita confirmada de assinaturas (manual), clientes ativos e vencimentos próximos.
- **Recuperação de senha segura** com expiração, confirmação de titularidade e rate limiting.
- **Auditoria/observabilidade**: indicadores de erro, alertas e backups automatizados.

## Checklist de publicação
1. Validar CI verde na última revisão.
2. Definir ambiente de produção com HTTPS, PostgreSQL gerenciado, backups e diretório de mídia persistente.
3. Aplicar migrações revisadas **antes** da versão que usa campos/tabelas novos.
4. Configurar Master via variáveis privadas, sem chave/senha no GitHub.
5. Testar reserva, conflito de horário, agendamento por celular, marcação de pagamento, atualização/cancelamento e webhook.
6. Configurar webhook apenas em serviço confiável; testar conexão e conferir recebimento final no aplicativo.
7. Habilitar proteção anti-abuso/monitoramento, disponibilizar política de privacidade e procedimentos de suporte.

**Situação:** projeto funcional em código, com testes automáticos; **não declarado pronto para produção** sem o checklist e validação externa.
