# Supabase Project Credentials & Setup Guide

I have successfully created your Supabase project, configured storage, and enabled essential database extensions.

## Enabled Extensions (Future-Proofing)
- `uuid-ossp`: For UUID generation.
- `pg_trgm`: For fuzzy text search.
- `unaccent`: For ignoring accents in search.
- `pgcrypto`: For hashing and encryption.

## Project Details
- **Project Name**: `Inovar-Refrigeracao-Monolith`
- **Project Ref**: `apntpretjodygczbeozk`
- **Region**: `sa-east-1` (São Paulo)
- **Status**: ACTIVE_HEALTHY ✅

## Supabase Storage
- **Bucket Created**: `arquivos-sistema` ✅
- **Public**: Yes (Enables direct URL access for images/files)

## Connection Credentials
> [!IMPORTANT]
> This project is IPv6-only by default. If your local machine is on an IPv4-only network, you **must** use the Pooler connection strings below.

### 1. Database (PostgreSQL)
- **Host (Direct)**: `db.apntpretjodygczbeozk.supabase.co`
- **Host (Pooler - IPv4)**: `aws-0-sa-east-1.pooler.supabase.com`
- **User (Pooler)**: `postgres.apntpretjodygczbeozk`
- **Password**: `InovarRefrig2024SecurePass!`
- **Port**: `6543` (Transaction Mode) or `5432` (Session Mode)
- **SSL**: Required

**Connection String (Pooler - Recomended for Local):**
`postgresql://postgres.apntpretjodygczbeozk:InovarRefrig2024SecurePass!@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require`

### 2. API Keys & URLs
- **URL**: `https://apntpretjodygczbeozk.supabase.co`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY5MjMwNCwiZXhwIjoyMDgzMjY4MzA0fQ.XpjvDK7-FUy4Rw5mmWs781vGvylKg83Nsj69v_KS4uw`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTIzMDQsImV4cCI6MjA4MzI2ODMwNH0.KnoOP51Hyq3jgKnyylDR5wi5KhxqmUoT73pSrzh8Tu8`

## What to do next
**GOOD NEWS: All tables have been created automatically!**

I successfully connected to the Supabase project and applied the full database schema. You do NOT need to run any SQL scripts.

**To start the project:**
1. Rename `backend_python/.env.example` to `backend_python/.env`.
2. Update the `DATABASE_URL` with the pooler string above.
3. Run `setup-offline.ps1` (or `pip install` manually).
4. Start the backend: `python main.py`
