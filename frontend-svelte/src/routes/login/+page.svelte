<script lang="ts">
  import { login } from "$lib/auth";
  import { goto } from "$app/navigation";
  import {
    Loader2,
    Mail,
    Lock,
    ArrowRight,
    ShieldCheck,
    Zap,
  } from "lucide-svelte";
  import { Card, Button, Input } from "$lib";

  let email = "";
  let password = "";
  let isLoading = false;
  let error = "";

  async function handleSubmit() {
    if (!email || !password) {
      error = "Preencha todos os campos para continuar";
      return;
    }

    isLoading = true;
    error = "";

    try {
      await login(email, password);
      goto("/");
    } catch (err: any) {
      error = err.message || "Credenciais inválidas. Tente novamente.";
    } finally {
      isLoading = false;
    }
  }
</script>

<div
  class="min-h-screen bg-surface-50 flex items-center justify-center p-6 relative overflow-hidden"
>
  <!-- Background Decorations -->
  <div
    class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px]"
  ></div>
  <div
    class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-600/5 rounded-full blur-[120px]"
  ></div>

  <div class="w-full max-w-md relative z-10">
    <!-- Logo & Branding -->
    <div
      class="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div class="relative inline-block mb-6">
        <div
          class="w-24 h-24 bg-brand-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-600/30"
        >
          <ShieldCheck class="w-12 h-12 text-white" />
        </div>
        <div
          class="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Zap class="w-6 h-6 text-yellow-500 fill-yellow-500" />
        </div>
      </div>
      <h1 class="text-4xl font-black text-surface-900 tracking-tight">
        Inovar Refrigeração
      </h1>
      <p class="text-surface-500 font-bold mt-3 text-lg">
        Sistema de Gestão Inteligente
      </p>
    </div>

    <!-- Login Card -->
    <Card
      padding="p-10"
      className="shadow-2xl shadow-surface-900/5 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200"
    >
      {#if error}
        <div
          class="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 animate-in zoom-in duration-300"
        >
          <div class="p-2 bg-white rounded-lg shadow-sm">
            <Lock class="w-4 h-4" />
          </div>
          <p class="text-sm font-bold">{error}</p>
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-8">
        <div class="space-y-6">
          <Input
            label="E-mail Corporativo"
            type="email"
            bind:value={email}
            placeholder="nome@empresa.com"
            required
            disabled={isLoading}
          />

          <div class="space-y-2">
            <Input
              label="Senha de Acesso"
              type="password"
              bind:value={password}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
            <div class="flex justify-end">
              <button
                type="button"
                class="text-xs font-black text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          loading={isLoading}
          className="shadow-xl shadow-brand-600/20 h-14 text-lg"
        >
          Entrar no Sistema
          {#if !isLoading}
            <ArrowRight class="w-5 h-5 ml-2" />
          {/if}
        </Button>
      </form>
    </Card>

    <!-- Footer -->
    <div class="mt-10 text-center animate-in fade-in duration-1000 delay-500">
      <p class="text-sm font-bold text-surface-400 uppercase tracking-widest">
        © 2026 Inovar Refrigeração
      </p>
      <div class="flex items-center justify-center gap-6 mt-4">
        <a
          href="/suporte"
          class="text-xs font-black text-surface-400 hover:text-brand-600 transition-colors uppercase tracking-widest"
          >Suporte</a
        >
        <span class="w-1 h-1 bg-surface-300 rounded-full"></span>
        <a
          href="#"
          class="text-xs font-black text-surface-400 hover:text-brand-600 transition-colors uppercase tracking-widest"
          >Privacidade</a
        >
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background-color: var(--color-surface-50);
  }
</style>
