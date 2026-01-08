<script lang="ts">
    import { onMount } from "svelte";
    import {
        MessageCircle,
        HelpCircle,
        Mail,
        Phone,
        ExternalLink,
        ShieldCheck,
        Zap,
        ArrowRight,
        LifeBuoy,
        MessageSquare,
    } from "lucide-svelte";
    import { Card, Button, Badge } from "$lib";

    let email = "suporte@inovarrefrigeracao.com.br";
    let phone = "(11) 99999-9999";
    let whatsapp = "5511999999999";

    onMount(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/empresas/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.emailContato) email = data.emailContato;
                if (data.telefoneContato) {
                    phone = data.telefoneContato;
                    // Remove non-digits for WhatsApp link
                    whatsapp = data.telefoneContato.replace(/\D/g, "");
                    if (!whatsapp.startsWith("55")) whatsapp = "55" + whatsapp;
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados de suporte:", error);
        }
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
                    <LifeBuoy class="w-10 h-10 text-brand-600" />
                    Central de Suporte
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Estamos aqui para garantir que sua operação nunca pare
                </p>
            </div>
            <div class="flex items-center gap-3">
                <Badge
                    variant="success"
                    size="lg"
                    className="px-6 py-3 text-sm"
                >
                    <ShieldCheck class="w-4 h-4 mr-2" /> SUPORTE ATIVO
                </Badge>
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- FAQ Section -->
            <div class="lg:col-span-7 space-y-8">
                <Card padding="p-8">
                    <div class="flex items-center gap-4 mb-10">
                        <div class="p-3 bg-brand-50 rounded-2xl text-brand-600">
                            <HelpCircle class="w-6 h-6" />
                        </div>
                        <div>
                            <h2
                                class="text-2xl font-black text-surface-900 tracking-tight"
                            >
                                Perguntas Frequentes
                            </h2>
                            <p class="text-surface-500 font-bold">
                                Respostas rápidas para as dúvidas mais comuns
                            </p>
                        </div>
                    </div>

                    <div class="space-y-6">
                        {#each [{ q: "Como criar uma nova ordem de serviço?", a: "Clique em 'Nova OS' na página de Serviços, selecione o cliente, preencha os detalhes e clique em 'Criar Ordem de Serviço'. O sistema irá gerar um número sequencial automaticamente." }, { q: "Como alterar o status de uma OS?", a: "Abra os detalhes da OS clicando nela na lista. Use os botões de ação no topo da página para avançar o status ou realizar cancelamentos." }, { q: "Como cadastrar um novo cliente?", a: "Acesse a página de Clientes e clique em 'Novo Cliente'. Você pode usar a busca por CEP para preencher o endereço automaticamente." }, { q: "O sistema funciona offline?", a: "O Inovar Refrigeração requer conexão com a internet para sincronizar dados com o servidor e garantir que todas as informações estejam atualizadas em tempo real." }] as faq}
                            <div
                                class="group p-6 bg-surface-50 rounded-[2rem] border border-surface-100 hover:bg-white hover:border-brand-200 hover:shadow-xl transition-all duration-300"
                            >
                                <h3
                                    class="text-lg font-black text-surface-900 mb-3 flex items-center gap-3"
                                >
                                    <Zap class="w-4 h-4 text-brand-500" />
                                    {faq.q}
                                </h3>
                                <p
                                    class="text-sm font-bold text-surface-500 leading-relaxed pl-7"
                                >
                                    {faq.a}
                                </p>
                            </div>
                        {/each}
                    </div>
                </Card>
            </div>

            <!-- Contact Section -->
            <div class="lg:col-span-5 space-y-8">
                <Card padding="p-8">
                    <div class="flex items-center gap-4 mb-10">
                        <div class="p-3 bg-green-50 rounded-2xl text-green-600">
                            <MessageSquare class="w-6 h-6" />
                        </div>
                        <div>
                            <h2
                                class="text-2xl font-black text-surface-900 tracking-tight"
                            >
                                Canais de Contato
                            </h2>
                            <p class="text-surface-500 font-bold">
                                Fale diretamente com nossa equipe
                            </p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <a
                            href="https://wa.me/{whatsapp}"
                            target="_blank"
                            class="flex items-center gap-6 p-6 rounded-[2rem] bg-green-50 border border-green-100 hover:bg-green-100 hover:shadow-lg transition-all duration-300 group"
                        >
                            <div
                                class="p-4 bg-white rounded-2xl shadow-sm text-green-600 group-hover:scale-110 transition-transform"
                            >
                                <MessageCircle class="w-8 h-8" />
                            </div>
                            <div class="flex-1">
                                <p
                                    class="text-xs font-black text-green-600 uppercase tracking-widest"
                                >
                                    WhatsApp
                                </p>
                                <p class="text-xl font-black text-surface-900">
                                    Atendimento Rápido
                                </p>
                                <p
                                    class="text-sm font-bold text-green-700/60 mt-1"
                                >
                                    Resposta em poucos minutos
                                </p>
                            </div>
                            <ExternalLink class="w-5 h-5 text-green-300" />
                        </a>

                        <a
                            href="mailto:{email}"
                            class="flex items-center gap-6 p-6 rounded-[2rem] bg-brand-50 border border-brand-100 hover:bg-brand-100 hover:shadow-lg transition-all duration-300 group"
                        >
                            <div
                                class="p-4 bg-white rounded-2xl shadow-sm text-brand-600 group-hover:scale-110 transition-transform"
                            >
                                <Mail class="w-8 h-8" />
                            </div>
                            <div class="flex-1">
                                <p
                                    class="text-xs font-black text-brand-600 uppercase tracking-widest"
                                >
                                    E-mail
                                </p>
                                <p class="text-xl font-black text-surface-900">
                                    Suporte Técnico
                                </p>
                                <p
                                    class="text-sm font-bold text-brand-700/60 mt-1"
                                >
                                    {email}
                                </p>
                            </div>
                            <ExternalLink class="w-5 h-5 text-brand-300" />
                        </a>

                        <a
                            href="tel:{phone}"
                            class="flex items-center gap-6 p-6 rounded-[2rem] bg-surface-100 border border-surface-200 hover:bg-surface-200 hover:shadow-lg transition-all duration-300 group"
                        >
                            <div
                                class="p-4 bg-white rounded-2xl shadow-sm text-surface-600 group-hover:scale-110 transition-transform"
                            >
                                <Phone class="w-8 h-8" />
                            </div>
                            <div class="flex-1">
                                <p
                                    class="text-xs font-black text-surface-500 uppercase tracking-widest"
                                >
                                    Telefone
                                </p>
                                <p class="text-xl font-black text-surface-900">
                                    Central de Voz
                                </p>
                                <p
                                    class="text-sm font-bold text-surface-500 mt-1"
                                >
                                    {phone}
                                </p>
                            </div>
                            <ExternalLink class="w-5 h-5 text-surface-300" />
                        </a>
                    </div>
                </Card>

                <Card
                    padding="p-8"
                    className="bg-surface-900 text-white border-none shadow-2xl shadow-surface-900/20"
                >
                    <div class="flex items-center gap-4 mb-6">
                        <div class="p-3 bg-white/10 rounded-2xl">
                            <ShieldCheck class="w-6 h-6 text-brand-400" />
                        </div>
                        <h3 class="text-xl font-black tracking-tight">
                            Segurança de Dados
                        </h3>
                    </div>
                    <p class="font-bold text-surface-400 leading-relaxed mb-8">
                        Seus dados estão protegidos por criptografia de ponta a
                        ponta e backups diários automáticos.
                    </p>
                    <Button
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20 text-white border-none w-full"
                    >
                        Termos de Uso <ArrowRight class="w-4 h-4 ml-2" />
                    </Button>
                </Card>
            </div>
        </div>

        <!-- Version Info -->
        <div class="mt-12 text-center space-y-2">
            <p
                class="text-xs font-black text-surface-300 uppercase tracking-[0.3em]"
            >
                Inovar Refrigeração v1.0.0
            </p>
            <p
                class="text-[10px] font-bold text-surface-200 uppercase tracking-widest"
            >
                Powered by SvelteKit & Supabase
            </p>
        </div>
    </div>
</div>
