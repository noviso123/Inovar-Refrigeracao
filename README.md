# Inovar Refrigeração - Sistema de Gestão

Sistema completo de gestão para empresas de refrigeração, incluindo gerenciamento de clientes, ordens de serviço, equipamentos, técnicos, e integração com WhatsApp.

## 🚀 Tecnologias

### Backend
- **Python 3.11+** com FastAPI
- **Supabase** (PostgreSQL) para banco de dados
- **Supabase Storage** para armazenamento de arquivos
- **APScheduler** para agendamento de tarefas
- **Redis** para cache e rate limiting (opcional)
- **WebSockets** para notificações em tempo real

### Frontend
- **SvelteKit** com JavaScript puro
- **TailwindCSS** para estilização
- **Vite** como bundler

## 📋 Pré-requisitos

- Python 3.11 ou superior
- Node.js 18 ou superior
- npm ou pnpm
- Conta Supabase (para banco de dados e storage)

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd "Inovar Refrigeracao"
```

### 2. Configure o Backend

```bash
cd backend_python

# Crie um ambiente virtual
python -m venv .venv

# Ative o ambiente virtual
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
```

### 3. Configure o Frontend

```bash
cd frontend-svelte

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com a URL da API
```

## ▶️ Executando Localmente

### Backend

```bash
cd backend_python
python main.py
```

O backend estará disponível em `http://localhost:8001`

- API Docs: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/health`

### Frontend

```bash
cd frontend-svelte
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
Inovar Refrigeracao/
├── backend_python/          # Backend FastAPI
│   ├── routers/            # Endpoints da API
│   ├── services/           # Lógica de negócio
│   ├── models.py           # Modelos do SQLAlchemy
│   ├── database.py         # Configuração do banco
│   ├── auth.py             # Autenticação
│   └── main.py             # Ponto de entrada
├── frontend-svelte/        # Frontend SvelteKit
│   ├── src/
│   │   ├── routes/        # Páginas
│   │   ├── lib/           # Componentes e serviços
│   │   └── stores/        # Svelte stores
│   └── static/            # Arquivos estáticos
├── scripts/               # Scripts utilitários
├── supabase/              # Configurações Supabase
├── Dockerfile             # Docker para deploy
└── README.md              # Este arquivo
```

## 🗃️ Configuração do Supabase

### Variáveis de Ambiente Necessárias

**Backend (.env):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
```

**Frontend (.env):**
```env
PUBLIC_API_URL=http://localhost:8001
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Inicialização do Banco de Dados

O backend irá criar as tabelas automaticamente na primeira execução. Certifique-se de que as credenciais do Supabase estão corretas.

## 🚀 Deploy

### Railway (Recomendado)

O projeto está configurado para deploy no Railway:

1. Conecte seu repositório ao Railway
 2. Configure as variáveis de ambiente
3. O Railway usará o `Dockerfile` na raiz do projeto
4. Deploy automático a cada push

### Docker

```bash
# Build da imagem
docker build -t inovar-refrigeracao .

# Execute o container
docker run -p 8001:8001 --env-file .env inovar-refrigeracao
```

## 🔑 Funcionalidades Principais

- ✅ **Gestão de Clientes** - CRUD completo com histórico
- ✅ **Ordens de Serviço** - Criação, edição, e acompanhamento
- ✅ **Gestão de Equipamentos** - Cadastro e manutenção
- ✅ **Técnicos** - Gerenciamento de equipe
- ✅ **Sistema de Notificações** - Notificações em tempo real via WebSocket
- ✅ **Dashboard** - Métricas e relatórios
- ✅ **Upload de Imagens** - Fotos de serviços e assinaturas
- ✅ **Notificações em Tempo Real** - Via WebSocket
- ✅ **Agendamento** - Lembretes de manutenção automáticos

## 🧪 Testes

```bash
# Backend
cd backend_python
pytest

# Frontend
cd frontend-svelte
npm run test
```

## 📝 API Documentation

Com o backend rodando, acesse:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário da Inovar Refrigeração.

## 🆘 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❄️ pela equipe Inovar Refrigeração**
