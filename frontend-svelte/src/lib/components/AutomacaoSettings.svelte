<script lang="ts">
    import { onMount } from "svelte";
    import {
        Save,
        Clock,
        MessageSquare,
        Play,
        AlertCircle,
        Loader2,
    } from "lucide-svelte";
    // import { supabase } from "$lib/supabase";
    import { user } from "$lib/auth";

    export let userData: any;

    let loading = false;
    let testing = false;
    let saving = false;

    let config = {
        lembreteManutencao: false,
        intervaloMeses: 6,
        templateMensagem:
            "Olá {cliente}, notamos que sua última manutenção foi em {data}. Recomendamos agendar uma nova visita para garantir o funcionamento ideal dos seus equipamentos.",
        whatsappInstanceName: "",
    };

    onMount(async () => {
        await loadConfig();
        await loadInstances();
    });

    async function loadConfig() {
        if (!userData?.automacao) return;

        config = {
            lembreteManutencao: userData.automacao.lembreteManutencao || false,
            intervaloMeses: userData.automacao.intervaloMeses || 6,
            templateMensagem:
                userData.automacao.templateMensagem || config.templateMensagem,
            whatsappInstanceName: userData.automacao.whatsappInstanceName || "",
        };
    }

    async function loadInstances() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/whatsapp/status", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const status = await res.json();
                if (status && status.status === "conectado") {
                    config.whatsappInstanceName = "Neonize Brain";
                } else {
                    config.whatsappInstanceName = "";
                }
            }
        } catch (error) {
            console.error("Erro ao carregar status do WhatsApp:", error);
            config.whatsappInstanceName = "";
        }
    }

    async function handleSave() {
        try {
            saving = true;
            const token = localStorage.getItem("token");

            // Atualizar via API do backend python que lida com usuarios
            const res = await fetch(`/api/usuarios/${userData.id}/automacao`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(config),
            });

            if (!res.ok) throw new Error("Falha ao salvar");

            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar configurações.");
        } finally {
            saving = false;
        }
    }

    async function handleTest() {
        try {
            testing = true;
            const token = localStorage.getItem("token");

            const res = await fetch(
                `/api/usuarios/${userData.id}/automacao/test`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            if (!res.ok) throw new Error("Falha no teste");

            alert(
                "Teste de automação iniciado! Verifique os logs ou o WhatsApp.",
            );
        } catch (error) {
            console.error("Erro no teste:", error);
            alert("Erro ao iniciar teste.");
        } finally {
            testing = false;
        }
    }
</script>

<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="card p-6 lg:p-8">
        <div
            class="flex items-center justify-between mb-8 pb-6 border-b border-surface-100"
        >
            <div>
                <h2
                    class="text-xl font-bold text-surface-900 flex items-center gap-2"
                >
                    <Clock class="w-6 h-6 text-brand-500" />
                    Lembretes Automáticos
                </h2>
                <p class="text-sm text-surface-500 mt-1">
                    Configure o sistema para enviar mensagens automáticas quando
                    seus clientes precisarem de manutenção.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <span
                    class={`px-3 py-1 rounded-full text-xs font-medium ${config.lembreteManutencao ? "bg-green-100 text-green-800" : "bg-surface-100 text-surface-800"}`}
                >
                    {config.lembreteManutencao ? "Ativado" : "Desativado"}
                </span>
            </div>
        </div>

        <div class="space-y-8">
            <!-- Status da Instância WhatsApp (Automático) -->
            <div
                class={`p-4 rounded-xl border ${config.whatsappInstanceName ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
                <div class="flex items-center gap-4">
                    <div
                        class={`p-2.5 rounded-full ${config.whatsappInstanceName ? "bg-green-100" : "bg-red-100"}`}
                    >
                        <MessageSquare
                            class={`w-5 h-5 ${config.whatsappInstanceName ? "text-green-600" : "text-red-600"}`}
                        />
                    </div>
                    <div>
                        <h3
                            class={`font-semibold ${config.whatsappInstanceName ? "text-green-900" : "text-red-900"}`}
                        >
                            {config.whatsappInstanceName
                                ? "WhatsApp Conectado"
                                : "WhatsApp Desconectado"}
                        </h3>
                        <p
                            class={`text-sm mt-1 ${config.whatsappInstanceName ? "text-green-700" : "text-red-700"}`}
                        >
                            {config.whatsappInstanceName
                                ? `Instância "${config.whatsappInstanceName}" ativa e pronta para envios.`
                                : 'Conecte seu WhatsApp na aba "Automação" para ativar.'}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Toggle Ativar -->
            <div
                class={`flex items-center justify-between p-5 rounded-xl border ${!config.whatsappInstanceName ? "bg-surface-50 border-surface-200 opacity-60 cursor-not-allowed" : "bg-white border-surface-200"}`}
            >
                <div>
                    <h3 class="font-medium text-surface-900">
                        Ativar Lembretes Automáticos
                    </h3>
                    <p class="text-sm text-surface-500 mt-0.5">
                        O sistema verificará diariamente clientes com manutenção
                        vencida.
                    </p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        class="sr-only peer"
                        bind:checked={config.lembreteManutencao}
                        disabled={!config.whatsappInstanceName}
                    />
                    <div
                        class="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"
                    ></div>
                </label>
            </div>

            <!-- Intervalo Global -->
            <div>
                <label
                    for="intervalo"
                    class="block text-sm font-semibold text-surface-700 mb-2"
                >
                    Intervalo Padrão de Manutenção (Meses)
                </label>
                <div class="flex items-center gap-4">
                    <input
                        id="intervalo"
                        type="number"
                        min="1"
                        max="60"
                        bind:value={config.intervaloMeses}
                        class="input w-32"
                        disabled={!config.lembreteManutencao}
                    />
                    <span class="text-surface-600"
                        >meses após a última manutenção</span
                    >
                </div>
                <p class="text-xs text-surface-500 mt-2">
                    Este intervalo será aplicado a <strong>todos</strong> os seus
                    clientes e equipamentos.
                </p>
            </div>

            <!-- Template da Mensagem -->
            <div>
                <label
                    for="template"
                    class="block text-sm font-semibold text-surface-700 mb-2"
                >
                    Modelo da Mensagem
                </label>
                <div class="relative">
                    <textarea
                        id="template"
                        rows="4"
                        bind:value={config.templateMensagem}
                        class="input font-mono text-sm min-h-[120px]"
                        disabled={!config.lembreteManutencao}
                    ></textarea>
                    <MessageSquare
                        class="absolute right-3 top-3 w-4 h-4 text-surface-400"
                    />
                </div>
                <div
                    class="mt-3 text-xs text-surface-500 bg-surface-50 p-3 rounded-lg border border-surface-200"
                >
                    <strong>Variáveis disponíveis:</strong>
                    <ul class="mt-1 list-disc list-inside space-y-0.5">
                        <li><code>{"{cliente}"}</code> - Nome do cliente</li>
                        <li>
                            <code>{"{data}"}</code> - Data da última manutenção
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Botões de Ação -->
            <div
                class="flex items-center justify-end gap-3 pt-6 border-t border-surface-100"
            >
                <button
                    type="button"
                    on:click={handleTest}
                    disabled={testing ||
                        !config.lembreteManutencao ||
                        !config.whatsappInstanceName}
                    class="btn btn-secondary"
                >
                    {#if testing}
                        <Loader2 class="w-4 h-4 animate-spin" />
                    {:else}
                        <Play class="w-4 h-4" />
                    {/if}
                    Testar Agora
                </button>

                <button
                    type="button"
                    on:click={handleSave}
                    disabled={saving || !config.whatsappInstanceName}
                    class="btn btn-primary"
                >
                    {#if saving}
                        <Loader2 class="w-4 h-4 animate-spin" />
                    {:else}
                        <Save class="w-4 h-4" />
                    {/if}
                    Salvar Configurações
                </button>
            </div>
        </div>
    </div>

    <div class="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4">
        <AlertCircle class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
            <h4 class="font-semibold text-blue-900">Como funciona?</h4>
            <p class="text-sm text-blue-700 mt-1 leading-relaxed">
                O sistema verifica diariamente às 09:00 quais clientes possuem a
                data de "Última Manutenção" mais antiga que o intervalo
                configurado ({config.intervaloMeses} meses).
                <br /><br />
                A data de "Última Manutenção" é atualizada automaticamente sempre
                que você finaliza uma Ordem de Serviço (OS) do tipo "Manutenção".
            </p>
        </div>
    </div>
</div>
