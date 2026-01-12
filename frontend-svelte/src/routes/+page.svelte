<script lang="ts">
  import { user, isAdmin } from "$lib/auth";
  import { onMount } from "svelte";
  import {
    ShieldCheck,
    Users,
    Database,
    Activity,
    RefreshCw,
    Settings,
    ChevronRight,
    Briefcase,
    Clock,
    CheckCircle,
    Plus,
    TrendingUp,
    AlertCircle,
    LayoutDashboard,
    ArrowUpRight,
    Calendar,
  } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { Card, Badge, Button, Skeleton } from "$lib";

  let metrics: any = null;
  let isLoading = true;
  let isRefetching = false;

  async function fetchDashboard() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        metrics = await res.json();
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      isLoading = false;
    }
  }

  async function refetch() {
    isRefetching = true;
    await fetchDashboard();
    isRefetching = false;
  }

  onMount(() => {
    fetchDashboard();
  });

  $: stats = metrics?.stats || {};
  $: recentOrders = metrics?.recent_orders || [];
</script>

<div class="space-y-8 pb-24">
  <!-- Header Section -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1
        class="text-3xl font-extrabold text-surface-900 tracking-tight flex items-center gap-3"
      >
        {#if $isAdmin}
          <LayoutDashboard class="w-8 h-8 text-brand-600" />
          Dashboard Admin
        {:else}
          Olá, <span class="text-brand-600"
            >{$user?.nome_completo?.split(" ")[0]}</span
          > 👋
        {/if}
      </h1>
      <p class="text-surface-500 mt-1 font-medium">
        {#if $isAdmin}
          Monitoramento global do sistema Inovar
        {:else}
          Aqui está o resumo da sua operação hoje
        {/if}
      </p>
    </div>

    <div class="flex items-center gap-3">
      <Button variant="secondary" on:click={refetch} loading={isRefetching}>
        <RefreshCw class="w-4 h-4 {isRefetching ? 'animate-spin' : ''}" />
        <span class="hidden sm:inline">Atualizar</span>
      </Button>

      {#if !$isAdmin}
        <Button variant="primary" on:click={() => goto("/nova-solicitacao")}>
          <Plus class="w-5 h-5" />
          <span class="hidden sm:inline">Nova OS</span>
        </Button>
      {/if}
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
    {#if isLoading}
      {#each Array(4) as _}
        <Card padding="p-6">
          <Skeleton width="40px" height="40px" circle className="mb-4" />
          <Skeleton width="60%" height="1.5rem" className="mb-2" />
          <Skeleton width="40%" height="1rem" />
        </Card>
      {/each}
    {:else if $isAdmin}
      <!-- Admin Stats -->
      <Card
        interactive
        padding="p-6"
        className="group overflow-hidden relative"
        on:click={() => goto("/usuarios")}
      >
        <div
          class="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl"
        ></div>
        <div class="flex items-start justify-between relative z-10">
          <div
            class="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-200 group-hover:scale-110 transition-transform"
          >
            <Users class="w-6 h-6" />
          </div>
          <Badge variant="brand">Usuários</Badge>
        </div>
        <div class="mt-4 relative z-10">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Total Ativos
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">
            {stats.total_users || 0}
          </h3>
        </div>
      </Card>

      <Card padding="p-6">
        <div class="flex items-start justify-between">
          <div class="p-3 bg-green-50 text-green-600 rounded-2xl">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <Badge variant="success">Online</Badge>
        </div>
        <div class="mt-4">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Status API
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">Estável</h3>
        </div>
      </Card>

      <Card padding="p-6">
        <div class="flex items-start justify-between">
          <div class="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Database class="w-6 h-6" />
          </div>
          <Badge variant="neutral">v1.2.4</Badge>
        </div>
        <div class="mt-4">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Core Engine
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">Ativo</h3>
        </div>
      </Card>

      <Card
        interactive
        padding="p-6"
        className="group overflow-hidden relative"
        on:click={() => goto("/clientes")}
      >
        <div
          class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"
        ></div>
        <div class="flex items-start justify-between relative z-10">
          <div
            class="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform"
          >
            <Briefcase class="w-6 h-6" />
          </div>
          <Badge variant="info">Clientes</Badge>
        </div>
        <div class="mt-4 relative z-10">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Base Total
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">
            {stats.total_clients || 0}
          </h3>
        </div>
      </Card>
    {:else}
      <!-- Provider Stats -->
      <Card
        interactive
        padding="p-6"
        className="group overflow-hidden relative"
        on:click={() => goto("/solicitacoes")}
      >
        <div
          class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"
        ></div>
        <div class="flex items-start justify-between relative z-10">
          <div
            class="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform"
          >
            <Briefcase class="w-6 h-6" />
          </div>
          <Badge variant="info">Total</Badge>
        </div>
        <div class="mt-4 relative z-10">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Ordens de Serviço
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">
            {stats.total_orders || 0}
          </h3>
        </div>
      </Card>

      <Card
        interactive
        padding="p-6"
        className="group overflow-hidden relative"
        on:click={() => goto("/solicitacoes")}
      >
        <div
          class="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"
        ></div>
        <div class="flex items-start justify-between relative z-10">
          <div
            class="p-3 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform"
          >
            <Clock class="w-6 h-6" />
          </div>
          <Badge variant="warning">Abertas</Badge>
        </div>
        <div class="mt-4 relative z-10">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Em Andamento
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">
            {stats.open_orders || 0}
          </h3>
        </div>
      </Card>

      <Card padding="p-6">
        <div class="flex items-start justify-between">
          <div class="p-3 bg-green-50 text-green-600 rounded-2xl">
            <CheckCircle class="w-6 h-6" />
          </div>
          <Badge variant="success">Finalizadas</Badge>
        </div>
        <div class="mt-4">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Concluídas
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">
            {stats.completed_orders || 0}
          </h3>
        </div>
      </Card>

      <Card interactive padding="p-6" on:click={() => goto("/clientes")}>
        <div class="flex items-start justify-between">
          <div class="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Users class="w-6 h-6" />
          </div>
          <Badge variant="brand">Clientes</Badge>
        </div>
        <div class="mt-4">
          <p
            class="text-sm font-bold text-surface-500 uppercase tracking-wider"
          >
            Base Ativa
          </p>
          <h3 class="text-3xl font-black text-surface-900 mt-1">
            {stats.total_clients || 0}
          </h3>
        </div>
      </Card>
    {/if}
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Recent Activity -->
    <div class="lg:col-span-2 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-black text-surface-900 flex items-center gap-3">
          <Activity class="w-6 h-6 text-brand-600" />
          Atividade Recente
        </h2>
        <Button
          variant="ghost"
          size="sm"
          on:click={() => goto("/solicitacoes")}
        >
          Ver tudo <ChevronRight class="w-4 h-4 ml-1" />
        </Button>
      </div>

      {#if isLoading}
        <div class="space-y-4">
          {#each Array(3) as _}
            <Card padding="p-4">
              <div class="flex gap-4">
                <Skeleton width="48px" height="48px" className="rounded-xl" />
                <div class="flex-1">
                  <Skeleton width="40%" height="1.2rem" className="mb-2" />
                  <Skeleton width="20%" height="0.8rem" />
                </div>
              </div>
            </Card>
          {/each}
        </div>
      {:else if !recentOrders.length}
        <Card padding="p-12" className="text-center">
          <div class="p-4 bg-surface-50 rounded-full w-fit mx-auto mb-4">
            <AlertCircle class="w-8 h-8 text-surface-300" />
          </div>
          <p class="text-surface-400 font-medium">
            Nenhuma atividade registrada recentemente.
          </p>
        </Card>
      {:else}
        <div class="space-y-3">
          {#each recentOrders as os}
            <Card
              interactive
              padding="p-4"
              on:click={() => goto(`/solicitacao/${os.id}`)}
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center group-hover:bg-white transition-all shadow-sm"
                >
                  <Briefcase class="w-6 h-6 text-surface-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-surface-900 truncate">{os.titulo}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <Badge variant="neutral" size="sm"
                      >#{os.sequential_id}</Badge
                    >
                    <span class="text-xs text-surface-400 font-medium truncate"
                      >{os.client_name || "Cliente não informado"}</span
                    >
                  </div>
                </div>
                <Badge
                  variant={os.status === "concluido" || os.status === "faturado"
                    ? "success"
                    : "warning"}
                >
                  {os.status}
                </Badge>
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      {#if $isAdmin}
        <Card padding="p-8">
          <h3
            class="text-xl font-black text-surface-900 mb-6 flex items-center gap-3"
          >
            <Settings class="w-6 h-6 text-brand-600" />
            Gestão
          </h3>
          <div class="space-y-4">
            <Button
              fullWidth
              variant="secondary"
              className="justify-start"
              on:click={() => goto("/usuarios")}
            >
              <Users class="w-5 h-5 mr-2" /> Controle de Usuários
            </Button>
            <Button
              fullWidth
              variant="secondary"
              className="justify-start"
              on:click={() => goto("/configuracoes")}
            >
              <Settings class="w-5 h-5 mr-2" /> Parâmetros Globais
            </Button>
          </div>
        </Card>
      {:else}
        <Card
          className="bg-gradient-to-br from-brand-600 to-brand-800 text-white border-none shadow-xl shadow-brand-200"
        >
          <h4 class="font-black text-lg mb-2">Dica de Eficiência</h4>
          <p class="text-brand-100 text-sm leading-relaxed mb-6">
            Mantenha o status das suas OS atualizados para que o cliente receba
            notificações automáticas sobre o andamento do serviço.
          </p>
          <Button
            variant="secondary"
            fullWidth
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Ver Tutorial
          </Button>
        </Card>
      {/if}

      <Card padding="p-8">
        <h4 class="font-black text-surface-900 mb-6 flex items-center gap-2">
          <Calendar class="w-5 h-5 text-brand-600" />
          Agenda
        </h4>
        <div
          class="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-surface-100 rounded-2xl"
        >
          <Calendar class="w-8 h-8 text-surface-200 mb-2" />
          <p class="text-xs text-surface-400 font-medium">
            Agenda vazia para hoje
          </p>
        </div>
        <Button
          variant="ghost"
          fullWidth
          className="mt-6"
          on:click={() => goto("/agenda")}
        >
          Abrir Agenda
        </Button>
      </Card>
    </div>
  </div>
</div>
