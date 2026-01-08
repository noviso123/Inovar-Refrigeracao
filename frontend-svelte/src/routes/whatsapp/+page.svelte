<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        QrCode,
        Wifi,
        WifiOff,
        Clock,
        ShieldCheck,
        Settings,
        Power,
        Loader2,
        Save,
        MessageSquare,
        Zap,
        Shield,
        AlertCircle,
        RefreshCw,
        Smartphone,
        CheckCircle2,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface BotStatus {
        connected: boolean;
        status: "conectado" | "desconectado" | "aguardando_qr";
        qr_code?: string;
    }

    interface BotConfig {
        ativo: boolean;
        min_delay: number;
        max_delay: number;
        hora_inicio: string;
        hora_fim: string;
    }

    let status: BotStatus | null = null;
    let config: BotConfig | null = null;
    let loading = true;
    let saving = false;
    let interval: ReturnType<typeof setInterval>;

    async function fetchStatus() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/whatsapp/status", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                status = await res.json();
            }
        } catch (error) {
            console.error("Erro ao buscar status:", error);
        } finally {
            loading = false;
        }
    }

    async function fetchConfig() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/whatsapp/config", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                config = await res.json();
            }
        } catch (error) {
            console.error("Erro ao buscar config:", error);
        }
    }

    async function saveConfig() {
        if (!config) return;
        saving = true;
        try {
            const token = localStorage.getItem("token");
            await fetch("/api/whatsapp/config", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(config),
            });
            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            saving = false;
        }
    }

    async function reconnect() {
        try {
            const token = localStorage.getItem("token");
            await fetch("/api/whatsapp/reconnect", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchStatus();
        } catch (error) {
            console.error("Erro ao reconectar:", error);
        }
    }

    onMount(() => {
        fetchStatus();
        fetchConfig();
        interval = setInterval(fetchStatus, 5000);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
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
                    <MessageSquare class="w-10 h-10 text-green-600" />
                    WhatsApp Brain
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Motor de automação inteligente e gestão de conexão segura
                </p>
            </div>
            <div class="flex items-center gap-3">
                {#if status?.connected}
                    <Badge
                        variant="success"
                        size="lg"
                        className="px-6 py-3 text-sm"
                    >
                        <Wifi class="w-4 h-4 mr-2" /> ONLINE
                    </Badge>
                {:else if status?.status === "aguardando_qr"}
                    <Badge
                        variant="warning"
                        size="lg"
                        className="px-6 py-3 text-sm"
                    >
                        <QrCode class="w-4 h-4 mr-2" /> AGUARDANDO QR
                    </Badge>
                {:else}
                    <Badge
                        variant="danger"
                        size="lg"
                        className="px-6 py-3 text-sm"
                    >
                        <WifiOff class="w-4 h-4 mr-2" /> DESCONECTADO
                    </Badge>
                {/if}
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        {#if loading}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[400px] rounded-[3rem]" />
                <Skeleton className="h-[400px] rounded-[3rem]" />
            </div>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Connection Status Card -->
                <Card padding="p-8" className="relative overflow-hidden">
                    <div class="flex items-center gap-4 mb-10">
                        <div class="p-3 bg-green-50 rounded-2xl text-green-600">
                            <Smartphone class="w-6 h-6" />
                        </div>
                        <div>
                            <h2
                                class="text-2xl font-black text-surface-900 tracking-tight"
                            >
                                Conexão
                            </h2>
                            <p class="text-surface-500 font-bold">
                                Status do pareamento com seu dispositivo
                            </p>
                        </div>
                    </div>

                    <div
                        class="flex flex-col items-center justify-center min-h-[300px] py-8"
                    >
                        {#if status?.status === "conectado"}
                            <div
                                class="text-center space-y-6 animate-in zoom-in duration-500"
                            >
                                <div class="relative">
                                    <div
                                        class="w-32 h-32 bg-green-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-green-500/20"
                                    >
                                        <ShieldCheck
                                            class="w-16 h-16 text-green-600"
                                        />
                                    </div>
                                    <div
                                        class="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                                    >
                                        <Zap
                                            class="w-5 h-5 text-yellow-500 fill-yellow-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <h3
                                        class="text-3xl font-black text-surface-900 tracking-tight"
                                    >
                                        Conectado e Seguro
                                    </h3>
                                    <p
                                        class="text-surface-500 font-bold mt-2 max-w-xs mx-auto"
                                    >
                                        Seu bot está operando normalmente com
                                        proteção Anti-Ban ativa.
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-50"
                                >
                                    <Power class="w-4 h-4 mr-2" /> Desconectar Instância
                                </Button>
                            </div>
                        {:else if status?.status === "aguardando_qr" && status?.qr_code}
                            <div
                                class="text-center space-y-8 animate-in fade-in duration-500"
                            >
                                <div class="space-y-2">
                                    <h3
                                        class="text-2xl font-black text-surface-900"
                                    >
                                        Escaneie o QR Code
                                    </h3>
                                    <p class="text-surface-500 font-bold">
                                        Abra o WhatsApp > Aparelhos Conectados
                                    </p>
                                </div>

                                <div
                                    class="relative inline-block p-6 bg-white rounded-[3rem] shadow-2xl border border-surface-100"
                                >
                                    <img
                                        src="data:image/png;base64,{status.qr_code}"
                                        alt="WhatsApp QR Code"
                                        class="w-64 h-64 object-contain"
                                    />
                                    <div
                                        class="absolute inset-0 border-4 border-brand-500 rounded-[3rem] animate-pulse pointer-events-none"
                                    ></div>
                                </div>

                                <div
                                    class="flex items-center justify-center gap-3 text-brand-600 font-black uppercase tracking-widest text-xs"
                                >
                                    <RefreshCw class="w-4 h-4 animate-spin" />
                                    Aguardando leitura...
                                </div>
                            </div>
                        {:else}
                            <div class="text-center space-y-6">
                                <div
                                    class="w-32 h-32 bg-surface-100 rounded-[2.5rem] flex items-center justify-center mx-auto"
                                >
                                    <WifiOff
                                        class="w-16 h-16 text-surface-300"
                                    />
                                </div>
                                <div>
                                    <h3
                                        class="text-2xl font-black text-surface-900"
                                    >
                                        Sem Conexão Ativa
                                    </h3>
                                    <p
                                        class="text-surface-500 font-bold mt-2 max-w-xs mx-auto"
                                    >
                                        Inicie uma nova conexão para começar a
                                        enviar notificações automáticas.
                                    </p>
                                </div>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    on:click={reconnect}
                                    className="px-12 shadow-xl shadow-brand-500/20"
                                >
                                    Iniciar Nova Conexão
                                </Button>
                            </div>
                        {/if}
                    </div>
                </Card>

                <!-- Anti-Ban Configuration Card -->
                <Card padding="p-8">
                    <div class="flex items-center gap-4 mb-10">
                        <div class="p-3 bg-brand-50 rounded-2xl text-brand-600">
                            <Shield class="w-6 h-6" />
                        </div>
                        <div>
                            <h2
                                class="text-2xl font-black text-surface-900 tracking-tight"
                            >
                                Configurações Anti-Ban
                            </h2>
                            <p class="text-surface-500 font-bold">
                                Parâmetros de segurança para evitar bloqueios
                            </p>
                        </div>
                    </div>

                    {#if config}
                        <form
                            on:submit|preventDefault={saveConfig}
                            class="space-y-8"
                        >
                            <!-- Status Toggle -->
                            <div
                                class="p-6 bg-surface-50 rounded-[2rem] border border-surface-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-300"
                            >
                                <div class="flex items-center gap-4">
                                    <div
                                        class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center {config.ativo
                                            ? 'text-green-600'
                                            : 'text-surface-400'}"
                                    >
                                        <Zap
                                            class="w-6 h-6 {config.ativo
                                                ? 'fill-green-500'
                                                : ''}"
                                        />
                                    </div>
                                    <div>
                                        <p class="font-black text-surface-900">
                                            Bot de Automação
                                        </p>
                                        <p
                                            class="text-xs font-bold text-surface-500"
                                        >
                                            Ativa ou pausa todos os envios
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    on:click={() =>
                                        (config.ativo = !config.ativo)}
                                    class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none {config.ativo
                                        ? 'bg-green-500'
                                        : 'bg-surface-300'}"
                                >
                                    <span
                                        class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform {config.ativo
                                            ? 'translate-x-7'
                                            : 'translate-x-1'}"
                                    ></span>
                                </button>
                            </div>

                            <!-- Delay Settings -->
                            <div class="space-y-4">
                                <h3
                                    class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2 ml-1"
                                >
                                    <Clock class="w-3 h-3" /> Intervalos entre Mensagens
                                </h3>
                                <div class="grid grid-cols-2 gap-6">
                                    <Input
                                        label="Mínimo (segundos)"
                                        type="number"
                                        bind:value={config.min_delay}
                                    />
                                    <Input
                                        label="Máximo (segundos)"
                                        type="number"
                                        bind:value={config.max_delay}
                                    />
                                </div>
                                <p
                                    class="text-[10px] font-bold text-surface-400 italic ml-1"
                                >
                                    * O sistema escolherá um tempo aleatório
                                    entre esses valores para simular
                                    comportamento humano.
                                </p>
                            </div>

                            <!-- Operating Hours -->
                            <div class="space-y-4">
                                <h3
                                    class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2 ml-1"
                                >
                                    <Calendar class="w-3 h-3" /> Horário de Funcionamento
                                </h3>
                                <div class="grid grid-cols-2 gap-6">
                                    <Input
                                        label="Início"
                                        type="time"
                                        bind:value={config.hora_inicio}
                                    />
                                    <Input
                                        label="Fim"
                                        type="time"
                                        bind:value={config.hora_fim}
                                    />
                                </div>
                            </div>

                            <div class="pt-4">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    size="lg"
                                    loading={saving}
                                    className="shadow-xl shadow-brand-500/20"
                                >
                                    <Save class="w-5 h-5 mr-2" /> Salvar Configurações
                                </Button>
                            </div>
                        </form>
                    {:else}
                        <div class="space-y-6">
                            <Skeleton className="h-20 rounded-2xl" />
                            <Skeleton className="h-40 rounded-2xl" />
                            <Skeleton className="h-40 rounded-2xl" />
                        </div>
                    {/if}
                </Card>
            </div>

            <!-- Tips Card -->
            <Card
                padding="p-8"
                className="lg:col-span-2 bg-brand-600 text-white border-none shadow-2xl shadow-brand-600/30"
            >
                <div class="flex flex-col md:flex-row items-center gap-8">
                    <div
                        class="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center flex-shrink-0"
                    >
                        <CheckCircle2 class="w-10 h-10 text-white" />
                    </div>
                    <div class="flex-1 text-center md:text-left">
                        <h3 class="text-2xl font-black tracking-tight mb-2">
                            Dicas para evitar banimentos
                        </h3>
                        <p class="font-bold text-brand-100 opacity-90">
                            Evite enviar muitas mensagens para números que não
                            possuem seu contato salvo. Mantenha os intervalos de
                            delay acima de 15 segundos para maior segurança.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20 text-white border-none px-8"
                    >
                        Saiba Mais
                    </Button>
                </div>
            </Card>
        {/if}
    </div>
</div>
