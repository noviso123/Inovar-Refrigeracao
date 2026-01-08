<script lang="ts">
    import { onMount } from "svelte";
    import {
        QrCode,
        Phone,
        Globe,
        Instagram,
        Download,
        MessageCircle,
        Plus,
        X,
        ArrowLeft,
        Trash2,
        Edit,
        Loader2,
        Save,
        Palette,
        ExternalLink,
        CheckCircle2,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface QRCodeData {
        id?: string;
        nome: string;
        tipo: "whatsapp" | "instagram" | "link" | "tel";
        destino: string;
        cor: string;
    }

    let qrcodes: QRCodeData[] = [];
    let loading = true;
    let view: "LIST" | "FORM" = "LIST";
    let editingId: string | null = null;
    let saving = false;

    // Form data
    let nome = "";
    let type: "whatsapp" | "instagram" | "link" | "tel" = "whatsapp";
    let phone = "";
    let message = "";
    let instagramUser = "";
    let url = "";
    let color = "#0e8ce4";

    async function fetchQRCodes() {
        loading = true;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/qrcodes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                qrcodes = await res.json();
            }
        } catch (error) {
            console.error("Erro ao carregar QR Codes:", error);
        } finally {
            loading = false;
        }
    }

    function getPayload(): string {
        const cleanPhone = phone.replace(/\D/g, "");
        switch (type) {
            case "whatsapp":
                return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
            case "instagram":
                return `https://instagram.com/${instagramUser.replace("@", "").trim()}`;
            case "tel":
                return `tel:${cleanPhone}`;
            case "link":
                return url.startsWith("http") ? url : `https://${url}`;
            default:
                return "";
        }
    }

    function resetForm() {
        nome = "";
        type = "whatsapp";
        phone = "";
        message = "";
        instagramUser = "";
        url = "";
        color = "#0e8ce4";
        editingId = null;
    }

    function handleNew() {
        resetForm();
        view = "FORM";
    }

    function handleEdit(qr: QRCodeData) {
        editingId = qr.id || null;
        nome = qr.nome;
        type = qr.tipo;
        color = qr.cor;

        if (qr.tipo === "whatsapp") {
            const match = qr.destino.match(/wa\.me\/55(\d+)\?text=(.*)/);
            if (match) {
                phone = match[1];
                message = decodeURIComponent(match[2]);
            }
        } else if (qr.tipo === "instagram") {
            const match = qr.destino.match(/instagram\.com\/(.*)/);
            if (match) instagramUser = match[1];
        } else if (qr.tipo === "link") {
            url = qr.destino;
        } else if (qr.tipo === "tel") {
            const match = qr.destino.match(/tel:(.*)/);
            if (match) phone = match[1];
        }

        view = "FORM";
    }

    async function handleDelete(id: string) {
        if (!confirm("Deseja realmente excluir este QR Code?")) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/qrcodes/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchQRCodes();
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    }

    async function handleSave() {
        if (!nome) {
            alert("O nome do QR Code é obrigatório");
            return;
        }

        const payload = getPayload();
        if (!payload) {
            alert("Preencha os dados de destino do QR Code");
            return;
        }

        saving = true;
        const data: QRCodeData = {
            nome,
            tipo: type,
            destino: payload,
            cor: color,
        };

        try {
            const token = localStorage.getItem("token");
            const method = editingId ? "PUT" : "POST";
            const urlApi = editingId
                ? `/api/qrcodes/${editingId}`
                : "/api/qrcodes";

            const res = await fetch(urlApi, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                view = "LIST";
                await fetchQRCodes();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            saving = false;
        }
    }

    function downloadQR(destino: string, nomeQr: string, cor: string) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(destino)}&color=${cor.replace("#", "")}&bgcolor=ffffff`;
        const link = document.createElement("a");
        link.href = qrUrl;
        link.target = "_blank";
        link.download = `qrcode-${nomeQr}.png`;
        link.click();
    }

    $: previewUrl = getPayload()
        ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(getPayload())}&color=${color.replace("#", "")}&bgcolor=ffffff`
        : "";

    onMount(() => {
        fetchQRCodes();
    });
</script>

<div class="min-h-screen bg-surface-50 pb-24">
    <!-- Header -->
    <div class="bg-white border-b border-surface-200 px-4 py-8">
        <div
            class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div class="flex items-center gap-4">
                {#if view === "FORM"}
                    <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => (view = "LIST")}
                        className="p-2"
                    >
                        <ArrowLeft class="w-6 h-6" />
                    </Button>
                {/if}
                <div>
                    <h1
                        class="text-4xl font-black text-surface-900 tracking-tight flex items-center gap-3"
                    >
                        <QrCode class="w-10 h-10 text-brand-600" />
                        {view === "LIST"
                            ? "Meus QR Codes"
                            : editingId
                              ? "Editar QR Code"
                              : "Novo QR Code"}
                    </h1>
                    <p class="text-surface-500 font-bold mt-2">
                        {view === "LIST"
                            ? "Gerencie seus códigos de compartilhamento rápido"
                            : "Configure o destino e estilo do seu código"}
                    </p>
                </div>
            </div>
            {#if view === "LIST"}
                <Button
                    variant="primary"
                    size="lg"
                    on:click={handleNew}
                    className="shadow-xl shadow-brand-500/20"
                >
                    <Plus class="w-5 h-5 mr-2" /> Criar QR Code
                </Button>
            {/if}
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        {#if view === "LIST"}
            {#if loading}
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {#each Array(6) as _}
                        <Skeleton className="h-[400px] rounded-[3rem]" />
                    {/each}
                </div>
            {:else if qrcodes.length === 0}
                <div
                    class="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-surface-200"
                >
                    <div
                        class="w-24 h-24 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <QrCode class="w-12 h-12 text-surface-200" />
                    </div>
                    <h3 class="text-2xl font-black text-surface-900">
                        Nenhum QR Code criado
                    </h3>
                    <p class="text-surface-500 font-bold mt-2 max-w-sm mx-auto">
                        Comece criando um código para facilitar o acesso dos
                        seus clientes.
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        on:click={handleNew}
                        className="mt-8"
                    >
                        Criar Primeiro QR Code
                    </Button>
                </div>
            {:else}
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {#each qrcodes as qr}
                        <Card
                            padding="p-0"
                            className="group overflow-hidden hover:shadow-2xl transition-all duration-500"
                        >
                            <div class="p-8">
                                <div
                                    class="flex justify-between items-start mb-6"
                                >
                                    <div
                                        class="p-4 rounded-2xl bg-surface-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300"
                                    >
                                        {#if qr.tipo === "whatsapp"}
                                            <MessageCircle class="w-6 h-6" />
                                        {:else if qr.tipo === "instagram"}
                                            <Instagram class="w-6 h-6" />
                                        {:else if qr.tipo === "tel"}
                                            <Phone class="w-6 h-6" />
                                        {:else}
                                            <Globe class="w-6 h-6" />
                                        {/if}
                                    </div>
                                    <div class="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            on:click={() => handleEdit(qr)}
                                            className="p-2 hover:bg-brand-50 hover:text-brand-600"
                                        >
                                            <Edit class="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            on:click={() =>
                                                handleDelete(qr.id || "")}
                                            className="p-2 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 class="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <h3
                                    class="text-xl font-black text-surface-900 mb-2 truncate"
                                >
                                    {qr.nome}
                                </h3>
                                <p
                                    class="text-sm font-bold text-surface-400 truncate mb-8"
                                >
                                    {qr.destino}
                                </p>

                                <div
                                    class="relative group/qr flex justify-center p-8 bg-white rounded-[2.5rem] border border-surface-100 shadow-inner"
                                >
                                    <img
                                        src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={encodeURIComponent(
                                            qr.destino,
                                        )}&color={qr.cor.replace(
                                            '#',
                                            '',
                                        )}&bgcolor=ffffff"
                                        alt="QR"
                                        class="w-40 h-40 object-contain group-hover/qr:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            </div>

                            <div
                                class="p-6 bg-surface-50 border-t border-surface-100"
                            >
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    on:click={() =>
                                        downloadQR(qr.destino, qr.nome, qr.cor)}
                                >
                                    <Download class="w-4 h-4 mr-2" /> Baixar Imagem
                                </Button>
                            </div>
                        </Card>
                    {/each}
                </div>
            {/if}
        {:else}
            <!-- Form View -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div class="lg:col-span-7 space-y-8">
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <Plus class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Configurações
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Defina o comportamento do seu QR Code
                                </p>
                            </div>
                        </div>

                        <div class="space-y-8">
                            <Input
                                label="Nome Identificador"
                                placeholder="Ex: WhatsApp da Recepção"
                                bind:value={nome}
                            />

                            <div class="space-y-4">
                                <label
                                    class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                                    >Tipo de Destino</label
                                >
                                <div
                                    class="grid grid-cols-2 sm:grid-cols-4 gap-4"
                                >
                                    {#each [{ id: "whatsapp", icon: MessageCircle, label: "WhatsApp" }, { id: "instagram", icon: Instagram, label: "Instagram" }, { id: "link", icon: Globe, label: "Link Web" }, { id: "tel", icon: Phone, label: "Telefone" }] as item}
                                        <button
                                            on:click={() => (type = item.id)}
                                            class="p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-all duration-300 border-2 {type ===
                                            item.id
                                                ? 'bg-brand-50 border-brand-500 text-brand-600 shadow-lg shadow-brand-500/10'
                                                : 'bg-surface-50 border-transparent text-surface-400 hover:bg-white hover:border-surface-200'}"
                                        >
                                            <svelte:component
                                                this={item.icon}
                                                class="w-6 h-6"
                                            />
                                            <span
                                                class="text-xs font-black uppercase tracking-widest"
                                                >{item.label}</span
                                            >
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div
                                class="animate-in slide-in-from-top-4 duration-500"
                            >
                                {#if type === "whatsapp"}
                                    <div class="space-y-6">
                                        <Input
                                            label="Número do WhatsApp"
                                            placeholder="(11) 99999-9999"
                                            bind:value={phone}
                                        />
                                        <div class="space-y-2">
                                            <label
                                                class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                                                >Mensagem Automática</label
                                            >
                                            <textarea
                                                class="w-full p-4 bg-white border border-surface-200 rounded-2xl font-bold text-surface-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                                                rows={3}
                                                placeholder="Olá, gostaria de mais informações..."
                                                bind:value={message}
                                            ></textarea>
                                        </div>
                                    </div>
                                {:else if type === "instagram"}
                                    <Input
                                        label="Usuário do Instagram"
                                        placeholder="@suaempresa"
                                        bind:value={instagramUser}
                                    />
                                {:else if type === "link"}
                                    <Input
                                        label="URL de Destino"
                                        placeholder="https://seusite.com.br"
                                        bind:value={url}
                                    />
                                {:else if type === "tel"}
                                    <Input
                                        label="Número de Telefone"
                                        placeholder="(11) 9999-9999"
                                        bind:value={phone}
                                    />
                                {/if}
                            </div>

                            <div class="space-y-4">
                                <label
                                    class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1 flex items-center gap-2"
                                >
                                    <Palette class="w-3 h-3" /> Personalização de
                                    Cor
                                </label>
                                <div
                                    class="flex items-center gap-6 p-4 bg-surface-50 rounded-2xl border border-surface-100"
                                >
                                    <input
                                        type="color"
                                        bind:value={color}
                                        class="h-12 w-20 cursor-pointer border-none bg-transparent rounded-lg"
                                    />
                                    <div class="flex flex-col">
                                        <span
                                            class="text-sm font-black text-surface-900 uppercase"
                                            >{color}</span
                                        >
                                        <span
                                            class="text-[10px] font-bold text-surface-400 uppercase tracking-widest"
                                            >Cor do código</span
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div class="lg:col-span-5 space-y-8">
                    <Card padding="p-8" className="sticky top-8">
                        <div class="text-center space-y-8">
                            <div>
                                <h3
                                    class="text-xl font-black text-surface-900 tracking-tight"
                                >
                                    Visualização em Tempo Real
                                </h3>
                                <p
                                    class="text-surface-500 font-bold text-sm mt-1"
                                >
                                    Veja como seu QR Code ficará
                                </p>
                            </div>

                            <div
                                class="relative inline-block p-10 bg-white rounded-[3rem] shadow-2xl border border-surface-100"
                            >
                                {#if previewUrl}
                                    <img
                                        src={previewUrl}
                                        alt="QR Preview"
                                        class="w-64 h-64 object-contain animate-in zoom-in duration-500"
                                    />
                                {:else}
                                    <div
                                        class="w-64 h-64 border-4 border-dashed border-surface-100 rounded-[2rem] flex flex-col items-center justify-center text-surface-200"
                                    >
                                        <QrCode class="w-16 h-16 mb-4" />
                                        <p
                                            class="text-xs font-black uppercase tracking-widest"
                                        >
                                            Aguardando dados...
                                        </p>
                                    </div>
                                {/if}
                                <div
                                    class="absolute inset-0 border-8 border-brand-500/5 rounded-[3rem] pointer-events-none"
                                ></div>
                            </div>

                            <div class="space-y-4">
                                <Button
                                    variant="primary"
                                    fullWidth
                                    size="lg"
                                    on:click={handleSave}
                                    loading={saving}
                                    className="shadow-xl shadow-brand-500/20"
                                >
                                    <Save class="w-5 h-5 mr-2" />
                                    {editingId
                                        ? "Salvar Alterações"
                                        : "Criar QR Code"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    on:click={() => (view = "LIST")}
                                >
                                    Cancelar e Voltar
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card
                        padding="p-8"
                        className="bg-surface-900 text-white border-none"
                    >
                        <div class="flex items-center gap-4 mb-6">
                            <div class="p-3 bg-white/10 rounded-2xl">
                                <CheckCircle2 class="w-6 h-6 text-brand-400" />
                            </div>
                            <h3 class="text-xl font-black tracking-tight">
                                Pronto para imprimir
                            </h3>
                        </div>
                        <p class="font-bold text-surface-400 leading-relaxed">
                            Nossos QR Codes são gerados em alta resolução,
                            perfeitos para serem impressos em adesivos, cartões
                            de visita ou banners.
                        </p>
                    </Card>
                </div>
            </div>
        {/if}
    </div>
</div>
