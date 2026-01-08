<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        ChevronLeft,
        Calendar,
        MapPin,
        User,
        Wrench,
        Clock,
        History,
        CheckCircle,
        FileText,
        Phone,
        Loader2,
        Edit2,
        Trash2,
        Plus,
        Camera,
        Send,
        DollarSign,
        ShoppingCart,
        Image as ImageIcon,
        LayoutDashboard,
        X,
        Save,
        RefreshCw,
        ArrowLeft,
        MoreVertical,
        Download,
        Share2,
        Building,
    } from "lucide-svelte";
    import ServiceCompletionWizard from "$lib/components/ServiceCompletionWizard.svelte";
    import { user } from "$lib/auth";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface Solicitacao {
        id: number;
        sequential_id: number;
        titulo: string;
        descricao_detalhada?: string;
        status: string;
        priority: string;
        service_type?: string;
        created_at: string;
        scheduled_at?: string;
        valor_total?: number;
        cliente?: { id: number; nome: string; telefone?: string };
        local?: { city: string; address: string; neighborhood?: string };
        tecnico?: { nome_completo: string };
        fotos?: { url: string }[];
        itens_os?: ItemOS[];
        historico?: HistoryItem[];
        technical_report?: string;
        orcamento_disponivel?: boolean;
        empresa?: {
            nome_fantasia: string;
            cnpj?: string;
            email?: string;
            telefone?: string;
            endereco?: {
                cep?: string;
                logradouro?: string;
                numero?: string;
                complemento?: string;
                bairro?: string;
                cidade?: string;
                estado?: string;
            };
        };
    }

    interface ItemOS {
        id?: number;
        descricao: string;
        quantidade: number;
        valor_unitario: number;
        valor_total: number;
    }

    interface HistoryItem {
        data: string;
        descricao: string;
        usuario: string;
    }

    let solicitacao: Solicitacao | null = null;
    let loading = true;
    let updating = false;
    let activeTab: "overview" | "services" | "photos" | "history" = "overview";

    // Editing states
    let isEditingDesc = false;
    let editedDesc = "";
    let isEditingItems = false;
    let editItems: ItemOS[] = [];
    let newItemDesc = "";
    let newItemQty = 1;
    let newItemPrice = 0;

    // Photo upload
    let trackingNote = "";
    let isUploading = false;

    $: osId = $page.params.id;

    async function fetchOS() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/solicitacoes/${osId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                solicitacao = await res.json();
                editItems = [...(solicitacao?.itens_os || [])];
            }
        } catch (error) {
            console.error("Erro ao carregar OS:", error);
        } finally {
            loading = false;
        }
    }

    async function updateOS(updates: Partial<Solicitacao>) {
        updating = true;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/solicitacoes/${osId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updates),
            });
            await fetchOS();
        } catch (error) {
            console.error("Erro ao atualizar:", error);
        } finally {
            updating = false;
        }
    }

    let isWizardOpen = false;

    async function updateStatus(newStatus: string) {
        if (newStatus === "concluido") {
            isWizardOpen = true;
            return;
        }
        await updateOS({ status: newStatus });
    }

    async function handleWizardComplete(event: CustomEvent) {
        const data = event.detail;

        const updates: any = {
            status: "concluido",
            technical_report: data.technicalReport,
            fotos: [
                ...(solicitacao?.fotos || []),
                ...data.photos.map((url: string) => ({ url })),
            ],
        };

        const historyItem = {
            data: new Date().toISOString(),
            descricao: `Serviço concluído via Wizard. Pagamento ${data.paymentConfirmed ? "confirmado" : "pendente"}.`,
            usuario: $user?.nome_completo || "Usuário",
        };

        updates.historico = [...(solicitacao?.historico || []), historyItem];

        await updateOS(updates);
        isWizardOpen = false;
    }

    async function saveDescription() {
        await updateOS({ descricao_detalhada: editedDesc });
        isEditingDesc = false;
    }

    function addItem() {
        if (!newItemDesc.trim()) return;
        const total = newItemQty * newItemPrice;
        editItems = [
            ...editItems,
            {
                descricao: newItemDesc,
                quantidade: newItemQty,
                valor_unitario: newItemPrice,
                valor_total: total,
            },
        ];
        newItemDesc = "";
        newItemQty = 1;
        newItemPrice = 0;
    }

    function removeItem(index: number) {
        editItems = editItems.filter((_, i) => i !== index);
    }

    async function saveItems() {
        const total = editItems.reduce((sum, i) => sum + i.valor_total, 0);
        await updateOS({
            itens_os: editItems,
            valor_total: total,
            orcamento_disponivel: true,
        });
        isEditingItems = false;
    }

    async function addTrackingNote() {
        if (!trackingNote.trim()) return;

        const newHistoryItem = {
            data: new Date().toISOString(),
            descricao: `[Diário de Obra] ${trackingNote}`,
            usuario: "Técnico",
        };

        const currentHistory = solicitacao?.historico || [];
        await updateOS({
            historico: [...currentHistory, newHistoryItem],
        });
        trackingNote = "";
    }

    function formatDate(date: string): string {
        return new Date(date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatCurrency(value: number): string {
        return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }

    function getStatusVariant(
        status: string,
    ): "neutral" | "brand" | "success" | "warning" | "danger" | "info" {
        const variants: Record<string, any> = {
            pendente: "warning",
            agendado: "info",
            em_andamento: "brand",
            concluido: "success",
            faturado: "success",
            cancelado: "danger",
        };
        return variants[status] || "neutral";
    }

    $: itemsTotal = editItems.reduce((sum, i) => sum + i.valor_total, 0);

    onMount(() => {
        fetchOS();
    });
</script>

<div class="min-h-screen bg-surface-50 pb-24">
    {#if loading}
        <div class="p-12 text-center">
            <RefreshCw
                class="w-12 h-12 animate-spin mx-auto text-brand-500 opacity-20"
            />
        </div>
    {:else if solicitacao}
        <!-- Top Navigation Bar -->
        <div
            class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200 px-4 py-3"
        >
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => goto("/solicitacoes")}
                        className="p-2"
                    >
                        <ArrowLeft class="w-5 h-5" />
                    </Button>
                    <div>
                        <div class="flex items-center gap-2">
                            <Badge
                                variant="neutral"
                                size="sm"
                                className="bg-surface-900 text-white border-none"
                            >
                                OS #{solicitacao.sequential_id}
                            </Badge>
                            <Badge
                                variant={getStatusVariant(solicitacao.status)}
                            >
                                {solicitacao.status.replace("_", " ")}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        on:click={fetchOS}
                        loading={updating}
                    >
                        <RefreshCw
                            class="w-4 h-4 {updating ? 'animate-spin' : ''}"
                        />
                    </Button>
                    <Button variant="secondary" size="sm">
                        <MoreVertical class="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Hero Section -->
        <div class="bg-white border-b border-surface-200">
            <div class="max-w-7xl mx-auto px-4 py-8">
                <div
                    class="flex flex-col md:flex-row justify-between items-start gap-6"
                >
                    <div class="space-y-4 flex-1">
                        <h1
                            class="text-4xl font-black text-surface-900 tracking-tight leading-tight"
                        >
                            {solicitacao.titulo}
                        </h1>
                        <div
                            class="flex flex-wrap items-center gap-6 text-sm font-medium text-surface-500"
                        >
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-black"
                                >
                                    {solicitacao.cliente?.nome?.charAt(0) ||
                                        "?"}
                                </div>
                                <span class="text-surface-900 font-bold"
                                    >{solicitacao.cliente?.nome}</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <Calendar class="w-4 h-4 text-surface-400" />
                                {formatDate(solicitacao.created_at)}
                            </div>
                            {#if solicitacao.valor_total}
                                <div
                                    class="flex items-center gap-2 text-brand-600 font-black"
                                >
                                    <DollarSign class="w-4 h-4" />
                                    R$ {formatCurrency(solicitacao.valor_total)}
                                </div>
                            {/if}
                        </div>
                    </div>
                    <div class="flex gap-3 w-full md:w-auto">
                        <Button
                            variant="secondary"
                            className="flex-1 md:flex-none"
                        >
                            <Download class="w-4 h-4 mr-2" /> PDF
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex-1 md:flex-none"
                        >
                            <Share2 class="w-4 h-4 mr-2" /> Compartilhar
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Main Content -->
                <div class="lg:col-span-2 space-y-8">
                    <!-- Tabs -->
                    <div
                        class="flex gap-2 p-1.5 bg-surface-100/50 rounded-2xl border border-surface-200 overflow-x-auto no-scrollbar"
                    >
                        <button
                            on:click={() => (activeTab = "overview")}
                            class="flex-1 min-w-fit flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all {activeTab ===
                            'overview'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'}"
                        >
                            <LayoutDashboard class="w-4 h-4" /> Visão Geral
                        </button>
                        <button
                            on:click={() => (activeTab = "services")}
                            class="flex-1 min-w-fit flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all {activeTab ===
                            'services'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'}"
                        >
                            <ShoppingCart class="w-4 h-4" /> Itens
                        </button>
                        <button
                            on:click={() => (activeTab = "photos")}
                            class="flex-1 min-w-fit flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all {activeTab ===
                            'photos'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'}"
                        >
                            <ImageIcon class="w-4 h-4" /> Fotos
                        </button>
                        <button
                            on:click={() => (activeTab = "history")}
                            class="flex-1 min-w-fit flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all {activeTab ===
                            'history'
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'}"
                        >
                            <History class="w-4 h-4" /> Histórico
                        </button>
                    </div>

                    <div
                        class="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        {#if activeTab === "overview"}
                            <div class="space-y-8">
                                <!-- Descrição -->
                                <Card padding="p-8">
                                    <div
                                        class="flex justify-between items-center mb-6"
                                    >
                                        <h3
                                            class="text-sm font-black uppercase tracking-widest text-surface-400"
                                        >
                                            Descrição Detalhada
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            on:click={() => {
                                                if (isEditingDesc)
                                                    saveDescription();
                                                else {
                                                    editedDesc =
                                                        solicitacao?.descricao_detalhada ||
                                                        "";
                                                    isEditingDesc = true;
                                                }
                                            }}
                                        >
                                            {#if isEditingDesc}
                                                <Save class="w-4 h-4 mr-2" /> Salvar
                                            {:else}
                                                <Edit2 class="w-4 h-4 mr-2" /> Editar
                                            {/if}
                                        </Button>
                                    </div>

                                    {#if isEditingDesc}
                                        <textarea
                                            bind:value={editedDesc}
                                            class="w-full min-h-[160px] p-4 bg-surface-50 border border-surface-200 rounded-2xl outline-none focus:border-brand-500 transition-all font-medium"
                                            placeholder="Descreva o problema..."
                                        ></textarea>
                                    {:else}
                                        <div
                                            class="text-surface-700 leading-relaxed font-medium whitespace-pre-wrap text-lg"
                                        >
                                            {solicitacao.descricao_detalhada ||
                                                "Sem descrição detalhada."}
                                        </div>
                                    {/if}
                                </Card>

                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    <Card
                                        padding="p-6"
                                        className="bg-blue-50/50 border-blue-100"
                                    >
                                        <h4
                                            class="font-black text-blue-900 mb-4 flex items-center gap-2"
                                        >
                                            <Wrench class="w-5 h-5" /> Equipamento
                                        </h4>
                                        <p class="text-blue-800 font-bold">
                                            {#if editItems.length > 0}
                                                {editItems.length} item(ns) vinculado(s)
                                            {:else}
                                                Nenhum equipamento vinculado.
                                            {/if}
                                        </p>
                                    </Card>
                                    <Card
                                        padding="p-6"
                                        className="bg-brand-50/50 border-brand-100"
                                    >
                                        <h4
                                            class="font-black text-brand-900 mb-4 flex items-center gap-2"
                                        >
                                            <MapPin class="w-5 h-5" /> Localização
                                        </h4>
                                        <p class="text-brand-800 font-bold">
                                            {solicitacao.local?.address ||
                                                "Endereço não cadastrado"}
                                        </p>
                                    </Card>
                                </div>

                                {#if solicitacao.empresa}
                                    <Card
                                        padding="p-8"
                                        className="bg-surface-900 text-white"
                                    >
                                        <div
                                            class="flex items-center gap-3 mb-6"
                                        >
                                            <Building
                                                class="w-6 h-6 text-brand-400"
                                            />
                                            <h3
                                                class="text-sm font-black uppercase tracking-widest text-brand-400"
                                            >
                                                Dados da Empresa (Emissor)
                                            </h3>
                                        </div>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 gap-8"
                                        >
                                            <div class="space-y-4">
                                                <div>
                                                    <p
                                                        class="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1"
                                                    >
                                                        Nome Fantasia
                                                    </p>
                                                    <p
                                                        class="text-xl font-black"
                                                    >
                                                        {solicitacao.empresa
                                                            .nome_fantasia}
                                                    </p>
                                                </div>
                                                {#if solicitacao.empresa.cnpj}
                                                    <div>
                                                        <p
                                                            class="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1"
                                                        >
                                                            CNPJ
                                                        </p>
                                                        <p class="font-bold">
                                                            {solicitacao.empresa
                                                                .cnpj}
                                                        </p>
                                                    </div>
                                                {/if}
                                            </div>
                                            {#if solicitacao.empresa.endereco}
                                                <div class="space-y-4">
                                                    <div>
                                                        <p
                                                            class="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1"
                                                        >
                                                            Endereço
                                                        </p>
                                                        <p
                                                            class="font-bold leading-relaxed"
                                                        >
                                                            {solicitacao.empresa
                                                                .endereco
                                                                .logradouro}, {solicitacao
                                                                .empresa
                                                                .endereco
                                                                .numero}
                                                            {#if solicitacao.empresa.endereco.complemento}
                                                                - {solicitacao
                                                                    .empresa
                                                                    .endereco
                                                                    .complemento}
                                                            {/if}
                                                            <br />
                                                            {solicitacao.empresa
                                                                .endereco
                                                                .bairro} - {solicitacao
                                                                .empresa
                                                                .endereco
                                                                .cidade}/{solicitacao
                                                                .empresa
                                                                .endereco
                                                                .estado}
                                                            <br />
                                                            CEP: {solicitacao
                                                                .empresa
                                                                .endereco.cep}
                                                        </p>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    </Card>
                                {/if}
                            </div>
                        {:else if activeTab === "services"}
                            <Card padding="p-8">
                                <div
                                    class="flex justify-between items-center mb-8"
                                >
                                    <h3
                                        class="text-xl font-black text-surface-900"
                                    >
                                        Itens do Serviço
                                    </h3>
                                    <Button
                                        variant={isEditingItems
                                            ? "danger"
                                            : "secondary"}
                                        size="sm"
                                        on:click={() =>
                                            (isEditingItems = !isEditingItems)}
                                    >
                                        {isEditingItems
                                            ? "Cancelar"
                                            : "Editar Itens"}
                                    </Button>
                                </div>

                                {#if isEditingItems}
                                    <div
                                        class="bg-surface-50 p-6 rounded-2xl border border-surface-200 space-y-4 mb-8"
                                    >
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-4 gap-4"
                                        >
                                            <div class="md:col-span-2">
                                                <Input
                                                    label="Descrição"
                                                    placeholder="Ex: Carga de Gás"
                                                    bind:value={newItemDesc}
                                                />
                                            </div>
                                            <Input
                                                label="Qtd"
                                                type="number"
                                                bind:value={newItemQty}
                                            />
                                            <Input
                                                label="Preço Unit."
                                                type="number"
                                                bind:value={newItemPrice}
                                            />
                                        </div>
                                        <Button
                                            variant="primary"
                                            fullWidth
                                            on:click={addItem}
                                        >
                                            <Plus class="w-4 h-4 mr-2" /> Adicionar
                                            Item
                                        </Button>
                                    </div>
                                {/if}

                                <div
                                    class="border border-surface-200 rounded-2xl overflow-hidden"
                                >
                                    <table class="w-full text-sm">
                                        <thead
                                            class="bg-surface-50 text-surface-400 font-black uppercase tracking-widest text-[10px]"
                                        >
                                            <tr>
                                                <th class="p-4 text-left"
                                                    >Descrição</th
                                                >
                                                <th class="p-4 text-center"
                                                    >Qtd</th
                                                >
                                                <th class="p-4 text-right"
                                                    >Unitário</th
                                                >
                                                <th class="p-4 text-right"
                                                    >Total</th
                                                >
                                                {#if isEditingItems}<th
                                                        class="p-4 w-16"
                                                    ></th>{/if}
                                            </tr>
                                        </thead>
                                        <tbody
                                            class="divide-y divide-surface-100"
                                        >
                                            {#each editItems as item, i}
                                                <tr
                                                    class="hover:bg-surface-50/50 transition-colors font-bold text-surface-700"
                                                >
                                                    <td class="p-4"
                                                        >{item.descricao}</td
                                                    >
                                                    <td class="p-4 text-center"
                                                        >{item.quantidade}</td
                                                    >
                                                    <td class="p-4 text-right"
                                                        >R$ {formatCurrency(
                                                            item.valor_unitario,
                                                        )}</td
                                                    >
                                                    <td
                                                        class="p-4 text-right text-surface-900"
                                                        >R$ {formatCurrency(
                                                            item.valor_total,
                                                        )}</td
                                                    >
                                                    {#if isEditingItems}
                                                        <td
                                                            class="p-4 text-center"
                                                        >
                                                            <button
                                                                on:click={() =>
                                                                    removeItem(
                                                                        i,
                                                                    )}
                                                                class="text-red-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2
                                                                    class="w-4 h-4"
                                                                />
                                                            </button>
                                                        </td>
                                                    {/if}
                                                </tr>
                                            {:else}
                                                <tr>
                                                    <td
                                                        colspan={isEditingItems
                                                            ? 5
                                                            : 4}
                                                        class="p-12 text-center text-surface-400 font-medium italic"
                                                    >
                                                        Nenhum item adicionado.
                                                    </td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                        <tfoot
                                            class="bg-surface-900 text-white"
                                        >
                                            <tr>
                                                <td
                                                    colspan={isEditingItems
                                                        ? 3
                                                        : 2}
                                                    class="p-6 text-right font-black uppercase tracking-widest text-xs"
                                                    >Total Geral</td
                                                >
                                                <td
                                                    colspan={isEditingItems
                                                        ? 2
                                                        : 2}
                                                    class="p-6 text-right text-2xl font-black"
                                                    >R$ {formatCurrency(
                                                        itemsTotal,
                                                    )}</td
                                                >
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {#if isEditingItems}
                                    <Button
                                        variant="primary"
                                        fullWidth
                                        className="mt-8 py-4 text-lg"
                                        on:click={saveItems}
                                        loading={updating}
                                    >
                                        Salvar Orçamento
                                    </Button>
                                {/if}
                            </Card>
                        {:else if activeTab === "photos"}
                            <div class="space-y-8">
                                <Card
                                    padding="p-8"
                                    className="bg-brand-50/30 border-brand-100"
                                >
                                    <h4
                                        class="font-black text-brand-900 mb-6 flex items-center gap-3"
                                    >
                                        <Camera class="w-6 h-6" /> Diário de Obra
                                    </h4>
                                    <div class="flex gap-4">
                                        <textarea
                                            class="flex-1 bg-white border border-surface-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-brand-500 transition-all"
                                            placeholder="Descreva a atividade realizada agora..."
                                            rows="2"
                                            bind:value={trackingNote}
                                        ></textarea>
                                        <Button
                                            variant="primary"
                                            on:click={addTrackingNote}
                                            disabled={!trackingNote.trim()}
                                            className="h-auto px-6"
                                        >
                                            <Send class="w-5 h-5" />
                                        </Button>
                                    </div>
                                </Card>

                                <div
                                    class="grid grid-cols-2 md:grid-cols-3 gap-4"
                                >
                                    {#each solicitacao.fotos || [] as foto, i}
                                        <Card
                                            padding="p-0"
                                            className="aspect-square overflow-hidden group relative"
                                        >
                                            <img
                                                src={foto.url}
                                                alt="Evidência {i + 1}"
                                                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div
                                                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    on:click={() =>
                                                        window.open(
                                                            foto.url,
                                                            "_blank",
                                                        )}
                                                >
                                                    Ver Foto
                                                </Button>
                                            </div>
                                        </Card>
                                    {:else}
                                        <div
                                            class="col-span-full py-20 text-center border-2 border-dashed border-surface-200 rounded-3xl"
                                        >
                                            <ImageIcon
                                                class="w-16 h-16 text-surface-200 mx-auto mb-4"
                                            />
                                            <p
                                                class="text-surface-400 font-bold"
                                            >
                                                Nenhuma foto registrada ainda.
                                            </p>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {:else if activeTab === "history"}
                            <Card padding="p-8">
                                <div class="space-y-8">
                                    {#each solicitacao.historico || [] as item, i}
                                        <div
                                            class="relative pl-8 pb-8 last:pb-0"
                                        >
                                            {#if i !== (solicitacao.historico?.length || 0) - 1}
                                                <div
                                                    class="absolute left-[11px] top-8 bottom-0 w-0.5 bg-surface-100"
                                                ></div>
                                            {/if}
                                            <div
                                                class="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-brand-50 border-4 border-white shadow-sm flex items-center justify-center"
                                            >
                                                <div
                                                    class="w-1.5 h-1.5 rounded-full bg-brand-600"
                                                ></div>
                                            </div>
                                            <div>
                                                <div
                                                    class="flex items-center gap-3 mb-2"
                                                >
                                                    <span
                                                        class="text-xs font-black text-surface-400 uppercase tracking-widest"
                                                        >{formatDate(
                                                            item.data,
                                                        )}</span
                                                    >
                                                    <Badge
                                                        variant="neutral"
                                                        size="sm"
                                                        >{item.usuario}</Badge
                                                    >
                                                </div>
                                                <p
                                                    class="text-surface-700 font-bold leading-relaxed"
                                                >
                                                    {item.descricao}
                                                </p>
                                            </div>
                                        </div>
                                    {:else}
                                        <div class="text-center py-12">
                                            <History
                                                class="w-16 h-16 text-surface-100 mx-auto mb-4"
                                            />
                                            <p
                                                class="text-surface-400 font-bold"
                                            >
                                                Nenhum registro no histórico.
                                            </p>
                                        </div>
                                    {/each}
                                </div>
                            </Card>
                        {/if}
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-6">
                    <!-- Ações Rápidas -->
                    <Card
                        padding="p-6"
                        className="bg-surface-900 text-white border-none shadow-2xl shadow-surface-200"
                    >
                        <h3
                            class="font-black text-lg mb-6 flex items-center gap-2"
                        >
                            <Clock class="w-5 h-5 text-brand-400" /> Status do Serviço
                        </h3>
                        <div class="space-y-3">
                            {#if solicitacao.status === "pendente"}
                                <Button
                                    fullWidth
                                    variant="primary"
                                    on:click={() => updateStatus("agendado")}
                                    loading={updating}
                                >
                                    Agendar Visita
                                </Button>
                            {/if}
                            {#if solicitacao.status === "agendado"}
                                <Button
                                    fullWidth
                                    variant="primary"
                                    on:click={() =>
                                        updateStatus("em_andamento")}
                                    loading={updating}
                                >
                                    Iniciar Serviço
                                </Button>
                            {/if}
                            {#if ["pendente", "agendado", "em_andamento"].includes(solicitacao.status)}
                                <Button
                                    fullWidth
                                    variant="success"
                                    on:click={() => updateStatus("concluido")}
                                    loading={updating}
                                >
                                    Finalizar OS
                                </Button>
                            {/if}
                            <Button
                                fullWidth
                                variant="danger"
                                className="bg-white/10 text-white border-white/10 hover:bg-red-500/20"
                            >
                                Cancelar Chamado
                            </Button>
                        </div>
                    </Card>

                    <!-- Cliente -->
                    <Card padding="p-6">
                        <h3
                            class="font-black text-surface-900 mb-6 flex items-center gap-2"
                        >
                            <User class="w-5 h-5 text-brand-600" /> Cliente
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <p
                                    class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1"
                                >
                                    Nome
                                </p>
                                <p class="font-bold text-surface-900">
                                    {solicitacao.cliente?.nome}
                                </p>
                            </div>
                            {#if solicitacao.cliente?.telefone}
                                <div>
                                    <p
                                        class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1"
                                    >
                                        Contato
                                    </p>
                                    <a
                                        href="tel:{solicitacao.cliente
                                            .telefone}"
                                        class="flex items-center gap-2 text-brand-600 font-black hover:underline"
                                    >
                                        <Phone class="w-4 h-4" />
                                        {solicitacao.cliente.telefone}
                                    </a>
                                </div>
                            {/if}
                        </div>
                    </Card>

                    <!-- Técnico -->
                    {#if solicitacao.tecnico}
                        <Card padding="p-6">
                            <h3
                                class="font-black text-surface-900 mb-6 flex items-center gap-2"
                            >
                                <Wrench class="w-5 h-5 text-brand-600" /> Responsável
                            </h3>
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center font-black text-surface-600"
                                >
                                    {solicitacao.tecnico.nome_completo.charAt(
                                        0,
                                    )}
                                </div>
                                <p class="font-bold text-surface-900">
                                    {solicitacao.tecnico.nome_completo}
                                </p>
                            </div>
                        </Card>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>

<!-- Wizard de Conclusão -->
{#if solicitacao && isWizardOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="absolute inset-0 bg-surface-900/60 backdrop-blur-md"
            on:click={() => (isWizardOpen = false)}
        ></div>
        <div
            class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
        >
            <ServiceCompletionWizard
                isOpen={isWizardOpen}
                isAdmin={$user?.cargo === "admin"}
                initialData={{
                    titulo: solicitacao.titulo,
                    descricao: solicitacao.descricao_detalhada,
                    valorTotal: solicitacao.valor_total || 0,
                    osDisplayNumber: solicitacao.sequential_id.toString(),
                    clienteNome: solicitacao.cliente?.nome,
                }}
                on:complete={handleWizardComplete}
                on:close={() => (isWizardOpen = false)}
            />
        </div>
    </div>
{/if}

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
