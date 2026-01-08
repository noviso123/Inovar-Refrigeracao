<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        Briefcase,
        Search,
        Clock,
        CheckCircle,
        Plus,
        RefreshCw,
        Filter,
        ChevronRight,
        Calendar,
        MapPin,
        X,
        AlertCircle,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Skeleton } from "$lib";

    interface Solicitacao {
        id: number;
        sequential_id: number;
        titulo: string;
        status: string;
        priority: string;
        created_at: string;
        client_name?: string;
        location_name?: string;
        technician_name?: string;
    }

    let requests: Solicitacao[] = [];
    let loading = true;
    let isRefetching = false;
    let activeTab: "aberto" | "finalizado" = "aberto";
    let searchTerm = "";
    let showFilters = false;
    let filterStatus = "";
    let filterUrgency = "";

    const OPEN_STATUSES = ["pendente", "agendado", "em_andamento", "aprovado"];
    const CLOSED_STATUSES = ["concluido", "faturado", "cancelado"];
    const STATUS_OPTIONS = [
        "pendente",
        "agendado",
        "em_andamento",
        "concluido",
        "cancelado",
        "aprovado",
        "faturado",
    ];
    const URGENCY_OPTIONS = ["baixa", "media", "alta", "critica"];

    async function fetchRequests() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/solicitacoes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                requests = await res.json();
            }
        } catch (error) {
            console.error("Erro ao carregar solicitações:", error);
        } finally {
            loading = false;
        }
    }

    async function refetch() {
        isRefetching = true;
        await fetchRequests();
        isRefetching = false;
    }

    function formatDate(date: string): string {
        return new Date(date).toLocaleDateString("pt-BR");
    }

    $: openRequests = requests.filter((r) => OPEN_STATUSES.includes(r.status));
    $: closedRequests = requests.filter((r) =>
        CLOSED_STATUSES.includes(r.status),
    );

    $: filteredList = (activeTab === "aberto" ? openRequests : closedRequests)
        .filter((req) => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const sid = req.sequential_id?.toString() || "";
                const titulo = req.titulo?.toLowerCase() || "";
                if (!sid.includes(term) && !titulo.includes(term)) return false;
            }
            if (filterStatus && req.status !== filterStatus) return false;
            if (filterUrgency && req.priority !== filterUrgency) return false;
            return true;
        })
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        );

    onMount(() => {
        fetchRequests();
    });
</script>

<div class="space-y-6 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
            <h1
                class="text-3xl font-extrabold text-surface-900 tracking-tight flex items-center gap-3"
            >
                <Briefcase class="w-8 h-8 text-brand-600" />
                Gestão de Serviços
            </h1>
            <p class="text-surface-500 mt-1 font-medium">
                Acompanhe e gerencie todas as ordens de serviço
            </p>
        </div>
        <div class="flex gap-3">
            <Button
                variant="secondary"
                on:click={refetch}
                loading={isRefetching}
            >
                <RefreshCw
                    class="w-4 h-4 {isRefetching ? 'animate-spin' : ''}"
                />
            </Button>
            <Button
                variant="primary"
                on:click={() => goto("/nova-solicitacao")}
            >
                <Plus class="w-5 h-5" />
                <span class="hidden sm:inline">Nova OS</span>
            </Button>
        </div>
    </div>

    <!-- Tabs -->
    <div
        class="flex gap-2 p-1.5 bg-surface-100/50 backdrop-blur-sm rounded-2xl border border-surface-200"
    >
        <button
            on:click={() => (activeTab = "aberto")}
            class="flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-sm transition-all {activeTab ===
            'aberto'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'}"
        >
            <Clock class="w-4 h-4" />
            <span>Em Aberto</span>
            <Badge
                variant={activeTab === "aberto" ? "brand" : "neutral"}
                size="sm"
            >
                {openRequests.length}
            </Badge>
        </button>
        <button
            on:click={() => (activeTab = "finalizado")}
            class="flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-sm transition-all {activeTab ===
            'finalizado'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'}"
        >
            <CheckCircle class="w-4 h-4" />
            <span>Finalizados</span>
            <Badge
                variant={activeTab === "finalizado" ? "brand" : "neutral"}
                size="sm"
            >
                {closedRequests.length}
            </Badge>
        </button>
    </div>

    <!-- Search & Filter -->
    <Card padding="p-4">
        <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
                <Search
                    class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400"
                />
                <input
                    type="text"
                    placeholder="Buscar por Nº ou título..."
                    class="w-full pl-12 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium"
                    bind:value={searchTerm}
                />
            </div>
            <Button
                variant={showFilters ? "primary" : "secondary"}
                on:click={() => (showFilters = !showFilters)}
                className="sm:w-auto w-full"
            >
                <Filter class="w-5 h-5" />
                <span>Filtros</span>
            </Button>
        </div>

        {#if showFilters}
            <div
                class="mt-4 pt-4 border-t border-surface-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2"
            >
                <div class="space-y-1.5">
                    <label
                        for="filter-status"
                        class="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1"
                        >Status</label
                    >
                    <select
                        id="filter-status"
                        class="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-brand-500 font-medium"
                        bind:value={filterStatus}
                    >
                        <option value="">Todos os Status</option>
                        {#each STATUS_OPTIONS as status}
                            <option value={status}
                                >{status.toUpperCase()}</option
                            >
                        {/each}
                    </select>
                </div>
                <div class="space-y-1.5">
                    <label
                        for="filter-urgency"
                        class="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1"
                        >Urgência</label
                    >
                    <select
                        id="filter-urgency"
                        class="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-brand-500 font-medium"
                        bind:value={filterUrgency}
                    >
                        <option value="">Todas as Urgências</option>
                        {#each URGENCY_OPTIONS as level}
                            <option value={level}>{level.toUpperCase()}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
    </Card>

    <!-- Lista -->
    <div class="space-y-3">
        {#if loading}
            {#each Array(5) as _}
                <Card padding="p-5">
                    <div class="flex justify-between mb-4">
                        <Skeleton width="80px" height="24px" />
                        <Skeleton width="100px" height="24px" />
                    </div>
                    <Skeleton width="60%" height="1.5rem" className="mb-3" />
                    <div class="flex gap-4">
                        <Skeleton width="120px" height="1rem" />
                        <Skeleton width="100px" height="1rem" />
                    </div>
                </Card>
            {/each}
        {:else if filteredList.length === 0}
            <Card padding="p-16" className="text-center">
                <div class="p-4 bg-surface-50 rounded-full w-fit mx-auto mb-4">
                    <AlertCircle class="w-12 h-12 text-surface-200" />
                </div>
                <h3 class="text-xl font-bold text-surface-900">
                    Nenhum serviço encontrado
                </h3>
                <p class="text-surface-500 mt-2">
                    Tente ajustar seus filtros ou busca.
                </p>
                <Button
                    variant="ghost"
                    className="mt-6"
                    on:click={() => {
                        searchTerm = "";
                        filterStatus = "";
                        filterUrgency = "";
                    }}
                >
                    Limpar Filtros
                </Button>
            </Card>
        {:else}
            {#each filteredList as req}
                <Card
                    interactive
                    padding="p-5"
                    on:click={() => goto(`/solicitacao/${req.id}`)}
                    className="group"
                >
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <Badge
                                variant="neutral"
                                className="bg-surface-900 text-white border-none"
                            >
                                #{req.sequential_id}
                            </Badge>
                            <Badge
                                variant={req.status === "concluido" ||
                                req.status === "faturado"
                                    ? "success"
                                    : "warning"}
                            >
                                {req.status.replace("_", " ")}
                            </Badge>
                        </div>
                        <ChevronRight
                            class="w-5 h-5 text-surface-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all"
                        />
                    </div>

                    <h3
                        class="text-lg font-bold text-surface-900 group-hover:text-brand-700 transition-colors truncate"
                    >
                        {req.titulo}
                    </h3>

                    <div
                        class="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm font-medium text-surface-500"
                    >
                        <div class="flex items-center gap-2">
                            <div
                                class="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-black text-surface-600"
                            >
                                {req.client_name?.charAt(0) || "?"}
                            </div>
                            <span class="text-surface-900"
                                >{req.client_name || "-"}</span
                            >
                        </div>

                        {#if req.location_name}
                            <div class="flex items-center gap-1.5">
                                <MapPin class="w-4 h-4 text-surface-400" />
                                {req.location_name}
                            </div>
                        {/if}

                        <div class="flex items-center gap-1.5">
                            <Calendar class="w-4 h-4 text-surface-400" />
                            {formatDate(req.created_at)}
                        </div>
                    </div>

                    <div
                        class="mt-4 pt-4 border-t border-surface-100 flex items-center justify-between"
                    >
                        <div class="flex items-center gap-2">
                            <div
                                class="w-2 h-2 rounded-full {req.priority ===
                                'critica'
                                    ? 'bg-red-500 animate-pulse'
                                    : req.priority === 'alta'
                                      ? 'bg-orange-500'
                                      : 'bg-brand-500'}"
                            ></div>
                            <span
                                class="text-[10px] font-black uppercase tracking-widest {req.priority ===
                                'critica'
                                    ? 'text-red-600'
                                    : 'text-surface-500'}"
                            >
                                Prioridade {req.priority}
                            </span>
                        </div>
                        {#if req.technician_name}
                            <div class="flex items-center gap-2">
                                <User class="w-4 h-4 text-surface-400" />
                                <span class="text-xs font-bold text-surface-500"
                                    >{req.technician_name}</span
                                >
                            </div>
                        {/if}
                    </div>
                </Card>
            {/each}
        {/if}
    </div>
</div>

<!-- FAB Mobile -->
<div class="fixed bottom-24 right-6 lg:hidden z-40">
    <Button
        variant="primary"
        size="lg"
        className="rounded-full w-14 h-14 p-0 shadow-2xl shadow-brand-400"
        on:click={() => goto("/nova-solicitacao")}
    >
        <Plus class="w-8 h-8" />
    </Button>
</div>
