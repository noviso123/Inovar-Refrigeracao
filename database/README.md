# Database - Inovar Refrigeração

## Estrutura

O sistema utiliza PostgreSQL como banco principal, gerenciado via SQLAlchemy.

## Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `companies` | Empresas/prestadores |
| `clients` | Clientes das empresas |
| `equipments` | Equipamentos dos clientes |
| `service_orders` | Ordens de serviço |
| `whatsapp_instances` | Instâncias WhatsApp |
| `messages` | Mensagens enviadas |
| `subscription_plans` | Planos de assinatura |
| `subscriptions` | Assinaturas ativas |
| `nfse` | Notas fiscais emitidas |

## Migrações

As migrações são gerenciadas via Alembic:

```bash
cd backend_python

# Criar nova migração
alembic revision --autogenerate -m "descricao"

# Aplicar migrações
alembic upgrade head

# Reverter última migração
alembic downgrade -1
```

## Scripts Auxiliares

- `scripts/create-admin.sql` - Criar usuário admin
- `scripts/fix-admin.ps1` - Corrigir permissões admin
