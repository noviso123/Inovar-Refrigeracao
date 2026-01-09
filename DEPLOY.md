# 🚀 Deploy Guide - Inovar Refrigeração

Guia completo para deploy da aplicação com arquitetura híbrida.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                        │
│                    https://inovar.vercel.app                │
└─────────────────────────┬───────────────────────────────────┘
                          │ API Proxy
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER (Backend)                         │
│            https://inovar-backend.onrender.com              │
│                                                             │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │ Python/FastAPI  │◄──►│  WPPConnect     │               │
│   │    :$PORT       │    │    :8080        │               │
│   └─────────────────┘    └─────────────────┘               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Database)                      │
│                   PostgreSQL + Storage                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Deploy no Render (Backend)

### Passo a Passo

1. **Acesse** [render.com](https://render.com) e faça login
2. **Clique** em "New +" → "Blueprint"
3. **Conecte** seu repositório GitHub
4. **Selecione** o arquivo `render.yaml`
5. **Configure** as variáveis de ambiente (veja abaixo)
6. **Clique** em "Apply"

### Variáveis de Ambiente (Render Dashboard)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://...` | URL de conexão Supabase |
| `SUPABASE_URL` | `https://xxx.supabase.co` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Service Role Key do Supabase |
| `SECRET_KEY` | Auto-gerado | Chave JWT (auto) |
| `WPPCONNECT_SECRET` | Auto-gerado | Secret WPPConnect (auto) |

### Como obter DATABASE_URL do Supabase

1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. Vá em **Settings** → **Database**
3. Copie a **Connection String (URI)**
4. Substitua `[YOUR-PASSWORD]` pela senha do banco

---

## 2️⃣ Deploy no Vercel (Frontend)

### Passo a Passo

1. **Acesse** [vercel.com](https://vercel.com) e faça login
2. **Clique** em "Add New..." → "Project"
3. **Conecte** seu repositório GitHub
4. **Configure**:
   - **Framework Preset**: SvelteKit
   - **Root Directory**: `frontend-svelte`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.svelte-kit/output`

5. **Configure** as variáveis de ambiente (veja abaixo)
6. **Clique** em "Deploy"

### Variáveis de Ambiente (Vercel Dashboard)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | URL do Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Anon Key do Supabase |
| `VITE_API_URL` | `https://inovar-backend.onrender.com` | URL do backend no Render |

---

## 3️⃣ Configuração do Supabase

### Buckets de Storage Necessários

1. Acesse **Storage** no Supabase Dashboard
2. Crie os seguintes buckets:
   - `avatars` - Fotos de perfil
   - `signatures` - Assinaturas digitais
   - `os-photos` - Fotos das ordens de serviço

3. Configure políticas RLS (Row Level Security) para cada bucket

---

## ⚙️ Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `render.yaml` | Blueprint do Render |
| `Dockerfile.render` | Dockerfile para Backend + WPPConnect |
| `frontend-svelte/vercel.json` | Configuração do Vercel |
| `frontend-svelte/svelte.config.js` | Configuração SvelteKit |

---

## 🔧 Troubleshooting

### Backend não inicia no Render

1. Verifique os logs no Render Dashboard
2. Confirme que `DATABASE_URL` está correta
3. Verifique se o plano tem RAM suficiente (512MB mínimo)

### Frontend não conecta ao Backend

1. Verifique `VITE_API_URL` no Vercel
2. Confirme que o backend está rodando (acesse `/health`)
3. Verifique CORS nas configurações

### WhatsApp QR Code não aparece

1. Acesse `https://seu-backend.onrender.com/api/whatsapp/qr`
2. Verifique logs do WPPConnect no Render
3. O plano Starter pode precisar de upgrade para Standard

---

## 💰 Custos Estimados

| Serviço | Plano | Custo |
|---------|-------|-------|
| Render | Starter (512 MB) | ~$7/mês |
| Vercel | Hobby | **Grátis** |
| Supabase | Free | **Grátis** |
| **Total** | - | **~$7/mês** |

---

## 📞 Suporte

Em caso de dúvidas, verifique:
- [Documentação Render](https://render.com/docs)
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
