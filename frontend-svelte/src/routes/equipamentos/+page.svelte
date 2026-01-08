<script lang="ts">
    import { onMount } from "svelte";
    import {
        Wrench,
        Plus,
        Search,
        Trash2,
        Edit,
        Loader2,
        X,
        MapPin,
        Building,
        Calendar,
        Tag,
        Cpu,
        ChevronRight,
        ArrowLeft,
        MoreVertical,
        Check,
        AlertCircle,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface Equipment {
        id: number;
        nome: string;
        marca: string;
        modelo: string;
        numero_serie: string;
        tipo_equipamento: string;
        data_instalacao: string;
        locationId: number;
        client_name?: string;
        location_name?: string;
    }

    interface Cliente {
        id: number;
        nome: string;
        locations: any[];
    }

    let equipments: Equipment[] = [];
    let clientes: Cliente[] = [];
    let loading = true;
    let isModalOpen = false;
    let editingEquipment: Equipment | null = null;
    let saving = false;
    let searchQuery = "";

    let formData = {
        nome: "",
        marca: "",
        modelo: "",
        numero_serie: "",
        tipo_equipamento: "ar_condicionado",
        data_instalacao: "",
        location_id: null as number | null,
    };

    let selectedClientId: number | null = null;

    async function fetchData() {
        loading = true;
        try {
            const token = localStorage.getItem("token");
            const [eqRes, clRes] = await Promise.all([
                fetch("/api/equipamentos", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("/api/clientes", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (eqRes.ok) equipments = await eqRes.json();
            if (clRes.ok) clientes = await clRes.json();
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        if (!formData.location_id) {
            alert("Selecione um local para o equipamento");
            return;
        }

        saving = true;
        try {
            const token = localStorage.getItem("token");
            const method = editingEquipment ? "PUT" : "POST";
            const url = editingEquipment
                ? `/api/equipamentos/${editingEquipment.id}`
                : "/api/equipamentos";

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                isModalOpen = false;
                resetForm();
                await fetchData();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            saving = false;
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Excluir este equipamento?")) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/equipamentos/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchData();
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    }

    function resetForm() {
        formData = {
            nome: "",
            marca: "",
            modelo: "",
            numero_serie: "",
            tipo_equipamento: "ar_condicionado",
            data_instalacao: "",
            location_id: null,
        };
        selectedClientId = null;
        editingEquipment = null;
    }

    function openEdit(eq: Equipment) {
        editingEquipment = eq;
        formData = {
            nome: eq.nome,
            marca: eq.marca,
            modelo: eq.modelo,
            numero_serie: eq.numero_serie,
            tipo_equipamento: eq.tipo_equipamento,
            data_instalacao: eq.data_instalacao?.split("T")[0] || "",
            location_id: eq.locationId,
        };

        // Find client for this location
        const client = clientes.find((c) =>
            c.locations.some((l) => l.id === eq.locationId),
        );
        if (client) selectedClientId = client.id;

        isModalOpen = true;
    }

    function openNew() {
        resetForm();
        isModalOpen = true;
    }

    $: filteredEquipments = equipments.filter(
        (e) =>
            e.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.modelo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.numero_serie?.includes(searchQuery),
    );

    $: selectedClient = clientes.find((c) => c.id === selectedClientId);

    onMount(() => {
        fetchData();
    });
</script>

<div class="min-h-screen bg-surface-50 pb-24">
    <!-- Header -->
    <div class="bg-white border-b border-surface-200 px-4 py-8">
        <div
            class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div>
                <h1
                    class="text-4xl font-black text-surface-900 tracking-tight flex items-center gap-3"
                >
                    <Wrench class="w-10 h-10 text-brand-600" />
                    Equipamentos
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Gerencie o inventário de máquinas e dispositivos dos
                    clientes
                </p>
            </div>
            <Button
                variant="primary"
                size="lg"
                on:click={openNew}
                className="shadow-xl shadow-brand-500/20"
            >
                <Plus class="w-5 h-5 mr-2" /> Novo Equipamento
            </Button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <!-- Search Bar -->
        <div class="relative group">
            <Search
                class="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-surface-400 group-focus-within:text-brand-500 transition-colors"
            />
            <input
                type="text"
                placeholder="Buscar por nome, marca, modelo ou série..."
                class="w-full h-16 pl-16 pr-6 bg-white border border-surface-200 rounded-[2rem] font-bold text-surface-900 outline-none focus:border-brand-500 focus:ring-8 focus:ring-brand-500/5 transition-all shadow-sm"
                bind:value={searchQuery}
            />
        </div>

        {#if loading}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each Array(6) as _}
                    <Card padding="p-6">
                        <div class="flex items-center gap-4 mb-6">
                            <Skeleton className="w-14 h-14 rounded-2xl" />
                            <div class="flex-1 space-y-2">
                                <Skeleton className="w-3/4 h-5" />
                                <Skeleton className="w-1/2 h-3" />
                            </div>
                        </div>
                        <div class="space-y-3">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-full h-4" />
                        </div>
                    </Card>
                {/each}
            </div>
        {:else if filteredEquipments.length === 0}
            <div
                class="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-surface-200"
            >
                <div
                    class="w-24 h-24 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <Wrench class="w-12 h-12 text-surface-200" />
                </div>
                <h3 class="text-2xl font-black text-surface-900">
                    Nenhum equipamento encontrado
                </h3>
                <p class="text-surface-500 font-bold mt-2 max-w-sm mx-auto">
                    {searchQuery
                        ? "Não encontramos resultados para sua busca. Tente outros termos."
                        : "Seu inventário está vazio. Comece cadastrando um novo equipamento."}
                </p>
                {#if searchQuery}
                    <Button
                        variant="ghost"
                        className="mt-6"
                        on:click={() => (searchQuery = "")}
                    >
                        Limpar Busca
                    </Button>
                {/if}
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each filteredEquipments as eq}
                    <Card
                        padding="p-6"
                        className="group hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300"
                    >
                        <div class="flex items-start justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-2xl group-hover:bg-brand-600 group-hover:text-white transition-all duration-300"
                                >
                                    <Cpu class="w-8 h-8" />
                                </div>
                                <div class="min-w-0">
                                    <h3
                                        class="font-black text-surface-900 truncate group-hover:text-brand-700 transition-colors"
                                    >
                                        {eq.nome}
                                    </h3>
                                    <Badge
                                        variant="neutral"
                                        size="sm"
                                        className="mt-1"
                                    >
                                        {eq.tipo_equipamento ===
                                        "ar_condicionado"
                                            ? "Ar Condicionado"
                                            : eq.tipo_equipamento}
                                    </Badge>
                                </div>
                            </div>
                            <div
                                class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    on:click={() => openEdit(eq)}
                                    className="p-2"
                                >
                                    <Edit class="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    on:click={() => handleDelete(eq.id)}
                                    className="p-2 text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <Tag class="w-4 h-4" />
                                </div>
                                <span class="truncate"
                                    >{eq.marca} {eq.modelo}</span
                                >
                            </div>
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <Calendar class="w-4 h-4" />
                                </div>
                                <span
                                    >Instalado em: {eq.data_instalacao
                                        ? new Date(
                                              eq.data_instalacao,
                                          ).toLocaleDateString("pt-BR")
                                        : "N/A"}</span
                                >
                            </div>
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <MapPin class="w-4 h-4" />
                                </div>
                                <span class="truncate"
                                    >S/N: {eq.numero_serie || "N/A"}</span
                                >
                            </div>
                            {#if eq.client_name}
                                <div
                                    class="flex items-center gap-3 text-sm font-bold text-surface-500"
                                >
                                    <div
                                        class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                    >
                                        <Building class="w-4 h-4" />
                                    </div>
                                    <span class="truncate"
                                        >{eq.client_name} - {eq.location_name ||
                                            "Sede"}</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <div class="mt-8 pt-6 border-t border-surface-100">
                            <Button
                                variant="secondary"
                                fullWidth
                                on:click={() => openEdit(eq)}
                            >
                                Ver Detalhes <ChevronRight
                                    class="w-4 h-4 ml-2"
                                />
                            </Button>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Modal -->
<Modal
    isOpen={isModalOpen}
    title={editingEquipment ? "Editar Equipamento" : "Novo Equipamento"}
    onClose={() => (isModalOpen = false)}
>
    <div class="space-y-8 py-4">
        <!-- Localização -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <Building class="w-3 h-3" /> Localização
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label
                        for="client-select"
                        class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                        >Cliente</label
                    >
                    <select
                        id="client-select"
                        bind:value={selectedClientId}
                        class="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-bold text-surface-900 outline-none focus:border-brand-500 transition-all appearance-none"
                    >
                        <option value={null}>Selecione um cliente</option>
                        {#each clientes as cliente}
                            <option value={cliente.id}>{cliente.nome}</option>
                        {/each}
                    </select>
                </div>
                <div class="space-y-2">
                    <label
                        for="location-select"
                        class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                        >Local / Unidade</label
                    >
                    <select
                        id="location-select"
                        bind:value={formData.location_id}
                        disabled={!selectedClientId}
                        class="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-bold text-surface-900 outline-none focus:border-brand-500 transition-all appearance-none disabled:opacity-50"
                    >
                        <option value={null}>Selecione um local</option>
                        {#if selectedClient}
                            {#each selectedClient.locations as local}
                                <option value={local.id}
                                    >{local.nickname || local.city}</option
                                >
                            {/each}
                        {/if}
                    </select>
                </div>
            </div>
        </div>

        <!-- Especificações -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <Cpu class="w-3 h-3" /> Especificações
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                    <Input
                        label="Nome do Equipamento"
                        placeholder="Ex: Ar Condicionado Central"
                        bind:value={formData.nome}
                    />
                </div>
                <Input
                    label="Marca"
                    placeholder="Ex: Samsung, LG, Carrier"
                    bind:value={formData.marca}
                />
                <Input
                    label="Modelo"
                    placeholder="Ex: WindFree 12000 BTU"
                    bind:value={formData.modelo}
                />
                <Input
                    label="Número de Série"
                    placeholder="Ex: SN123456789"
                    bind:value={formData.numero_serie}
                />
                <Input
                    label="Data de Instalação"
                    type="date"
                    bind:value={formData.data_instalacao}
                />

                <div class="space-y-2">
                    <label
                        for="type-select"
                        class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                        >Tipo</label
                    >
                    <select
                        id="type-select"
                        bind:value={formData.tipo_equipamento}
                        class="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-bold text-surface-900 outline-none focus:border-brand-500 transition-all appearance-none"
                    >
                        <option value="ar_condicionado">Ar Condicionado</option>
                        <option value="refrigerador">Refrigerador</option>
                        <option value="freezer">Freezer</option>
                        <option value="outro">Outro</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="pt-6 flex gap-4">
            <Button
                variant="secondary"
                fullWidth
                on:click={() => (isModalOpen = false)}
            >
                Cancelar
            </Button>
            <Button
                variant="primary"
                fullWidth
                on:click={handleSave}
                loading={saving}
                disabled={!formData.location_id || !formData.nome}
            >
                Salvar Equipamento
            </Button>
        </div>
    </div>
</Modal>
