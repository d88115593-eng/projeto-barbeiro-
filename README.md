# Projeto Barbeiro — Plataforma SaaS

Sistema multi-barbearias para gestão, agenda e sites personalizáveis.

> Estado: fundação inicial do repositório. **Não está pronto para produção**. A integração com gateway será posterior.

## Rotas planejadas
- `/`: landing page comercial da plataforma
- `/master`: painel exclusivo do proprietário da plataforma
- `/admin`: painel administrativo de cada barbearia
- `/b/[slug]`: site público individual de cada barbearia

## Requisitos funcionais
- Login por usuário/senha, papéis MASTER/OWNER/STAFF e autorização server-side.
- Multi-tenancy: toda consulta deve ser isolada por barbearia; suporte Master auditado.
- Master: assinantes, planos (30 dias R$19,90, 90 dias R$29,90, 180 dias R$59,90), suspensão, credenciais e auditoria.
- Admin: serviços, barbeiros, jornadas e bloqueios, clientes, agenda, atendimentos avulsos, caixa, despesas, comissões, relatórios, estoque.
- Editor: marca, logo, fotos reais, vídeos, avaliações moderadas, redes, localização, seções e prévia.
- Cliente: serviços, profissional, disponibilidade, reserva persistida e confirmação opcional por WhatsApp.
- Pagamento na loja, Pix manual (sem confirmação automática) e integração futura com gateway.
- Financeiro: distinguir agendado, realizado, pago, cancelado; avulsos entram no faturamento somente quando efetivamente recebidos.
- Reservas devem ser criadas com transação e proteção contra sobreposição.
- Não inserir senhas, chaves Pix privadas ou segredos no GitHub.

## Arquitetura proposta
Next.js App Router + TypeScript + PostgreSQL + ORM, autenticação segura, armazenamento de mídia, testes automatizados, CI e deploy com variáveis de ambiente.

## Antes de produção
Implementar e validar autenticação, autorização, migrações, persistência, antifraude, isolamento entre barbearias, uploads, LGPD, backups, testes de concorrência e monitoramento.

## Status
Primeiro commit de estrutura e escopo. Os painéis e APIs operacionais ainda precisam ser implementados e testados.
