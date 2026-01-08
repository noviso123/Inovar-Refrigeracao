<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        FileText,
        User as UserIcon,
        Wrench,
        MapPin,
        X,
        Check,
        ChevronRight,
        Search,
        Loader2,
        ArrowLeft,
        AlertCircle,
        Plus,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface Cliente {
        id: number;
        nome: string;
        locations: any[];
    }

    let clientes: Cliente[] = [];
    let loadingClients = true;
    let saving = false;
    let showSuccess = false;
    let createdOS: any = null;

    // Form data
    let titulo = "";
    let descricao = "";
    let prioridade = "media";
    let tipoServico = "corretiva";
    let selectedClient: Cliente | null = null;
    let selectedLocal: any = null;

    // Modals
    let showClientModal = false;
    let clientSearch = "";

    async function fetchClientes() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/clientes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                clientes = await res.json();
            }
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
        } finally {
            loadingClients = false;
        }
    }

    function selectClient(cliente: Cliente) {
        selectedClient = cliente;
        selectedLocal = cliente.locations?.[0] || null;
        showClientModal = false;
    }

    async function handleSubmit() {
        if (!selectedClient) {
            return;
        }

        saving = true;
        try {
            const token = localStorage.getItem("token");
            const payload = {
                titulo: titulo || descricao,
                descricao_detalhada: descricao,
                priority: prioridade,
                service_type: tipoServico,
                cliente_id: selectedClient.id,
                local_id: selectedLocal?.id || null,
                status: "pendente",
            };

            const res = await fetch("/api/solicitacoes", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                createdOS = await res.json();
                showSuccess = true;
            }
        } catch (error) {
            console.error("Erro ao criar OS:", error);
        } finally {
            saving = false;
        }
    }

    $: filteredClients = clientes.filter((c) =>
        c.nome.toLowerCase().includes(clientSearch.toLowerCase()),
    );

    onMount(() => {
        fetchClientes();
    });
</script>

<div class="min-h-screen bg-surface-50 pb-24">
    <!-- Header -->
    <div
        class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200 px-4 py-4"
    >
        <div class="max-w-4xl mx-auto flex items-center gap-4">
            <Button
                variant="ghost"
                size="sm"
                on:click={() => goto("/solicitacoes")}
                className="p-2"
            >
                <ArrowLeft class="w-5 h-5" />
            </Button>
            <h1 class="text-2xl font-black text-surface-900 tracking-tight">
                Nova Solicitação
            </h1>
        </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <!-- Cliente Selection -->
        <Card padding="p-8">
            <div class="flex items-center justify-between mb-6">
                <h2
                    class="text-sm font-black uppercase tracking-widest text-surface-400 flex items-center gap-2"
                >
                    <UserIcon class="w-4 h-4" /> Cliente Responsável
                </h2>
                {#if selectedClient}
                    <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => (selectedClient = null)}
                        className="text-red-500"
                    >
                        Trocar Cliente
                    </Button>
                {/if}
            </div>

            {#if !selectedClient}
                <button
                    on:click={() => (showClientModal = true)}
                    class="w-full group p-12 border-2 border-dashed border-surface-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-brand-500 hover:bg-brand-50/30 transition-all duration-300"
                >
                    <div
                        class="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center group-hover:bg-brand-100 group-hover:scale-110 transition-all"
                    >
                        <Plus
                            class="w-8 h-8 text-surface-400 group-hover:text-brand-600"
                        />
                    </div>
                    <div class="text-center">
                        <p class="text-lg font-black text-surface-900">
                            Selecionar Cliente
                        </p>
                        <p class="text-sm font-medium text-surface-500">
                            Busque por nome ou CNPJ
                        </p>
                    </div>
                </button>
            {:else}
                <div
                    class="flex items-center gap-6 p-6 bg-brand-50/50 rounded-2xl border border-brand-100 animate-in fade-in slide-in-from-top-2"
                >
                    <div
                        class="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-black"
                    >
                        {selectedClient.nome.charAt(0)}
                    </div>
                    <div class="flex-1">
                        <p class="text-xl font-black text-surface-900">
                            {selectedClient.nome}
                        </p>
                        <div
                            class="flex items-center gap-2 mt-1 text-brand-700 font-bold"
                        >
                            <MapPin class="w-4 h-4" />
                            {selectedLocal?.nickname ||
                                selectedLocal?.city ||
                                "Local não definido"}
                        </div>
                    </div>
                    <Check class="w-8 h-8 text-brand-600" />
                </div>
            {/if}
        </Card>

        <!-- Detalhes do Chamado -->
        <Card padding="p-8">
            <h2
                class="text-sm font-black uppercase tracking-widest text-surface-400 mb-8 flex items-center gap-2"
            >
                <FileText class="w-4 h-4" /> Detalhes do Chamado
            </h2>

            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label
                            class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                            >Tipo de Serviço</label
                        >
                        <select
                            bind:value={tipoServico}
                            class="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-bold text-surface-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none"
                        >
                            <option value="corretiva"
                                >Manutenção Corretiva</option
                            >
                            <option value="preventiva"
                                >Manutenção Preventiva</option
                            >
                            <option value="instalacao">Instalação</option>
                            <option value="inspecao"
                                >Inspeção / Visita Técnica</option
                            >
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label
                            class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                            >Prioridade</label
                        >
                        <select
                            bind:value={prioridade}
                            class="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-bold text-surface-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none"
                        >
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica / Emergência</option
                            >
                        </select>
                    </div>
                </div>

                <Input
                    label="Título / Problema Resumido"
                    placeholder="Ex: Ar condicionado não está gelando"
                    bind:value={titulo}
                />

                <div class="space-y-2">
                    <label
                        class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                        >Descrição Detalhada</label
                    >
                    <textarea
                        class="w-full min-h-[160px] p-4 bg-surface-50 border border-surface-200 rounded-2xl font-bold text-surface-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                        placeholder="Descreva com mais detalhes o que está acontecendo..."
                        bind:value={descricao}
                    ></textarea>
                </div>
            </div>
        </Card>

        <div class="pt-4">
            <Button
                variant="primary"
                fullWidth
                className="h-16 text-lg shadow-xl shadow-brand-500/20"
                on:click={handleSubmit}
                disabled={saving || !selectedClient || !titulo}
                loading={saving}
            >
                Criar Ordem de Serviço
            </Button>
            {#if !selectedClient || !titulo}
                <p
                    class="text-center text-xs font-bold text-surface-400 mt-4 flex items-center justify-center gap-2"
                >
                    <AlertCircle class="w-3 h-3" /> Preencha o cliente e o título
                    para continuar
                </p>
            {/if}
        </div>
    </div>
</div>

<!-- Modal de Seleção de Cliente -->
<Modal
    isOpen={showClientModal}
    title="Selecionar Cliente"
    onClose={() => (showClientModal = false)}
>
    <div class="space-y-6">
        <div class="relative">
            <Search
                class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400"
            />
            <input
                type="text"
                placeholder="Buscar por nome..."
                class="w-full h-14 pl-12 pr-4 bg-surface-50 border border-surface-200 rounded-2xl font-bold text-surface-900 outline-none focus:border-brand-500 transition-all"
                bind:value={clientSearch}
            />
        </div>

        <div
            class="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar"
        >
            {#if loadingClients}
                {#each Array(5) as _}
                    <div
                        class="p-4 bg-surface-50 rounded-2xl flex items-center gap-4"
                    >
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div class="flex-1 space-y-2">
                            <Skeleton className="w-1/2 h-4" />
                            <Skeleton className="w-1/3 h-3" />
                        </div>
                    </div>
                {/each}
            {:else}
                {#each filteredClients as cliente}
                    <button
                        on:click={() => selectClient(cliente)}
                        class="w-full p-4 rounded-2xl hover:bg-brand-50 flex items-center gap-4 text-left transition-all group"
                    >
                        <div
                            class="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center text-surface-600 font-black group-hover:bg-brand-600 group-hover:text-white transition-all"
                        >
                            {cliente.nome.charAt(0)}
                        </div>
                        <div class="flex-1">
                            <p
                                class="font-black text-surface-900 group-hover:text-brand-700"
                            >
                                {cliente.nome}
                            </p>
                            {#if cliente.locations?.[0]}
                                <p
                                    class="text-xs font-bold text-surface-400 group-hover:text-brand-500"
                                >
                                    {cliente.locations[0].city}
                                </p>
                            {/if}
                        </div>
                        <ChevronRight
                            class="w-5 h-5 text-surface-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all"
                        />
                    </button>
                {:else}
                    <div class="py-12 text-center">
                        <UserIcon
                            class="w-12 h-12 text-surface-200 mx-auto mb-4"
                        />
                        <p class="text-surface-400 font-bold">
                            Nenhum cliente encontrado.
                        </p>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</Modal>

<!-- Modal de Sucesso -->
{#if showSuccess}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
        <div class="absolute inset-0 bg-surface-900/60 backdrop-blur-md"></div>
        <div
            class="relative bg-white rounded-[40px] p-10 text-center max-w-sm w-full shadow-2xl scale-in-center"
        >
            <div
                class="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"
            >
                <Check class="w-12 h-12" />
            </div>
            <Badge variant="success" size="lg" className="mb-4"
                >OS #{createdOS?.sequential_id}</Badge
            >
            <h3
                class="text-3xl font-black text-surface-900 tracking-tight mb-2"
            >
                Sucesso!
            </h3>
            <p class="text-surface-500 font-bold mb-10">
                A ordem de serviço foi aberta e já está disponível no sistema.
            </p>

            <div class="space-y-3">
                <Button
                    variant="primary"
                    fullWidth
                    className="h-14 text-lg"
                    on:click={() => goto(`/solicitacao/${createdOS?.id}`)}
                >
                    Ver Detalhes
                </Button>
                <Button
                    variant="ghost"
                    fullWidth
                    className="h-14 text-surface-500"
                    on:click={() => goto("/solicitacoes")}
                >
                    Voltar para Lista
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }

    @keyframes scale-in-center {
        0% {
            transform: scale(0);
            opacity: 0;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
    .scale-in-center {
        animation: scale-in-center 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            both;
    }
</style>
