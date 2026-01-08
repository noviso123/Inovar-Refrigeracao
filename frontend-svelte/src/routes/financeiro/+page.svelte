<script lang="ts">
    import { onMount } from "svelte";
    import {
        DollarSign,
        TrendingUp,
        Wallet,
        Receipt,
        XCircle,
        FileText,
        Download,
        AlertCircle,
        Loader2,
        Calendar,
        ArrowUpRight,
        ArrowDownRight,
        PieChart,
        BarChart3,
        Filter,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Skeleton } from "$lib";

    interface Solicitacao {
        id: number;
        sequential_id: number;
        titulo: string;
        status: string;
        valor_total?: number;
        created_at: string;
        cliente?: { nome: string };
        nfse?: { numero: string };
    }

    let requests: Solicitacao[] = [];
    let loading = true;
    let reportType: "MONTHLY" | "ANNUAL" | "CUSTOM" = "MONTHLY";
    let startDate = "";
    let endDate = "";

    async function fetchRequests() {
        loading = true;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/solicitacoes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                requests = await res.json();
            }
        } catch (error) {
            console.error("Erro ao carregar:", error);
        } finally {
            loading = false;
        }
    }

    function getFilteredRequests(): Solicitacao[] {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return requests.filter((r) => {
            const date = new Date(r.created_at);
            if (isNaN(date.getTime())) return false;

            if (reportType === "MONTHLY") {
                return (
                    date.getMonth() === currentMonth &&
                    date.getFullYear() === currentYear
                );
            } else if (reportType === "ANNUAL") {
                return date.getFullYear() === currentYear;
            } else if (reportType === "CUSTOM") {
                if (!startDate || !endDate) return true;
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return date >= start && date <= end;
            }
            return false;
        });
    }

    $: filteredRequests = getFilteredRequests();

    $: stats = (() => {
        let revenue = 0,
            pending = 0,
            potential = 0,
            lost = 0;
        let issuedCount = 0,
            pendingCount = 0;

        filteredRequests.forEach((r) => {
            const val = r.valor_total || 0;

            if (r.status === "faturado" || r.status === "concluido") {
                revenue += val;
                if (r.status === "concluido" && !r.nfse?.numero) pendingCount++;
            } else if (["aprovado", "em_andamento"].includes(r.status)) {
                pending += val;
            } else if (["orcamento", "pendente"].includes(r.status)) {
                potential += val;
            } else if (r.status === "cancelado") {
                lost += val;
            }

            if (r.nfse?.numero) issuedCount++;
        });

        return { revenue, pending, potential, lost, issuedCount, pendingCount };
    })();

    $: transactions = filteredRequests
        .filter((r) => (r.valor_total || 0) > 0)
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        );

    function formatCurrency(value: number): string {
        return value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
        });
    }

    function formatDate(date: string): string {
        return new Date(date).toLocaleDateString("pt-BR");
    }

    function exportCSV() {
        const data = getFilteredRequests();
        if (data.length === 0) {
            alert("Nenhum registro encontrado para o período.");
            return;
        }

        const lines = ["Data,OS,Cliente,Status,Valor"];
        data.forEach((r) => {
            lines.push(
                `${formatDate(r.created_at)},#${r.sequential_id},${r.cliente?.nome || "-"},${r.status},${r.valor_total || 0}`,
            );
        });

        const blob = new Blob([lines.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    }

    onMount(() => {
        fetchRequests();
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
                    <DollarSign class="w-10 h-10 text-brand-600" />
                    Financeiro
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Gestão de fluxo de caixa, faturamento e métricas de receita
                </p>
            </div>
            <Button
                variant="primary"
                size="lg"
                on:click={exportCSV}
                className="shadow-xl shadow-brand-500/20"
            >
                <Download class="w-5 h-5 mr-2" /> Exportar Relatório
            </Button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {#if loading}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {#each Array(4) as _}
                    <Skeleton className="h-32 rounded-[2rem]" />
                {/each}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[400px] rounded-[3rem]" />
                <Skeleton className="h-[400px] rounded-[3rem]" />
            </div>
        {:else}
            <!-- KPIs -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    padding="p-6"
                    className="bg-gradient-to-br from-green-500 to-green-600 border-none shadow-xl shadow-green-500/20"
                >
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 bg-white/20 rounded-2xl text-white">
                            <TrendingUp class="w-6 h-6" />
                        </div>
                        <ArrowUpRight class="w-5 h-5 text-white/50" />
                    </div>
                    <p
                        class="text-white/70 font-black text-xs uppercase tracking-widest"
                    >
                        Receita Realizada
                    </p>
                    <p class="text-2xl font-black text-white mt-1">
                        {formatCurrency(stats.revenue)}
                    </p>
                </Card>

                <Card
                    padding="p-6"
                    className="bg-white border-surface-200 shadow-sm"
                >
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 bg-blue-50 rounded-2xl text-blue-600">
                            <Wallet class="w-6 h-6" />
                        </div>
                        <BarChart3 class="w-5 h-5 text-surface-300" />
                    </div>
                    <p
                        class="text-surface-400 font-black text-xs uppercase tracking-widest"
                    >
                        A Receber
                    </p>
                    <p class="text-2xl font-black text-surface-900 mt-1">
                        {formatCurrency(stats.pending)}
                    </p>
                </Card>

                <Card
                    padding="p-6"
                    className="bg-white border-surface-200 shadow-sm"
                >
                    <div class="flex items-center justify-between mb-4">
                        <div
                            class="p-3 bg-yellow-50 rounded-2xl text-yellow-600"
                        >
                            <Receipt class="w-6 h-6" />
                        </div>
                        <PieChart class="w-5 h-5 text-surface-300" />
                    </div>
                    <p
                        class="text-surface-400 font-black text-xs uppercase tracking-widest"
                    >
                        Potencial Bruto
                    </p>
                    <p class="text-2xl font-black text-surface-900 mt-1">
                        {formatCurrency(stats.potential)}
                    </p>
                </Card>

                <Card
                    padding="p-6"
                    className="bg-white border-surface-200 shadow-sm"
                >
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 bg-red-50 rounded-2xl text-red-600">
                            <XCircle class="w-6 h-6" />
                        </div>
                        <ArrowDownRight class="w-5 h-5 text-surface-300" />
                    </div>
                    <p
                        class="text-surface-400 font-black text-xs uppercase tracking-widest"
                    >
                        Receita Perdida
                    </p>
                    <p class="text-2xl font-black text-surface-900 mt-1">
                        {formatCurrency(stats.lost)}
                    </p>
                </Card>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Filters & Export -->
                <div class="lg:col-span-4 space-y-8">
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-8">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <Filter class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-xl font-black text-surface-900 tracking-tight"
                                >
                                    Filtros
                                </h2>
                                <p class="text-surface-500 font-bold text-sm">
                                    Refine o período do relatório
                                </p>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="space-y-2">
                                <label
                                    class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                                    >Período</label
                                >
                                <select
                                    bind:value={reportType}
                                    class="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-bold text-surface-900 outline-none focus:border-brand-500 transition-all appearance-none"
                                >
                                    <option value="MONTHLY">Este Mês</option>
                                    <option value="ANNUAL">Este Ano</option>
                                    <option value="CUSTOM">Personalizado</option
                                    >
                                </select>
                            </div>

                            {#if reportType === "CUSTOM"}
                                <div
                                    class="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2"
                                >
                                    <Input
                                        label="Início"
                                        type="date"
                                        bind:value={startDate}
                                    />
                                    <Input
                                        label="Fim"
                                        type="date"
                                        bind:value={endDate}
                                    />
                                </div>
                            {/if}

                            <div class="pt-4 space-y-4">
                                <div
                                    class="p-6 bg-surface-50 rounded-[2rem] border border-surface-100"
                                >
                                    <div
                                        class="flex items-center justify-between mb-4"
                                    >
                                        <p
                                            class="text-sm font-black text-surface-500 uppercase tracking-widest"
                                        >
                                            Notas Fiscais
                                        </p>
                                        <FileText
                                            class="w-5 h-5 text-brand-500"
                                        />
                                    </div>
                                    <div class="space-y-3">
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm font-bold text-surface-600"
                                                >Emitidas</span
                                            >
                                            <Badge variant="success"
                                                >{stats.issuedCount}</Badge
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm font-bold text-surface-600"
                                                >Pendentes</span
                                            >
                                            <Badge variant="warning"
                                                >{stats.pendingCount}</Badge
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card
                        padding="p-8"
                        className="bg-brand-600 text-white border-none"
                    >
                        <div class="flex items-center gap-4 mb-6">
                            <div class="p-3 bg-white/20 rounded-2xl">
                                <AlertCircle class="w-6 h-6" />
                            </div>
                            <h3 class="text-xl font-black tracking-tight">
                                Dica Financeira
                            </h3>
                        </div>
                        <p
                            class="font-bold text-brand-100 opacity-90 leading-relaxed"
                        >
                            Mantenha suas ordens de serviço atualizadas para
                            garantir que as métricas de faturamento reflitam a
                            realidade do seu negócio.
                        </p>
                    </Card>
                </div>

                <!-- Transactions List -->
                <div class="lg:col-span-8">
                    <Card padding="p-0" className="overflow-hidden">
                        <div
                            class="px-8 py-6 border-b border-surface-100 bg-surface-50 flex items-center justify-between"
                        >
                            <h3
                                class="text-xl font-black text-surface-900 tracking-tight"
                            >
                                Extrato de Movimentações
                            </h3>
                            <Badge variant="neutral"
                                >{transactions.length} registros</Badge
                            >
                        </div>

                        <div class="divide-y divide-surface-100">
                            {#each transactions.slice(0, 20) as t}
                                <div
                                    class="p-8 hover:bg-surface-50 transition-colors group"
                                >
                                    <div
                                        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                    >
                                        <div class="space-y-1">
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <span
                                                    class="text-xs font-black text-brand-600 uppercase tracking-widest"
                                                    >#{t.sequential_id}</span
                                                >
                                                <Badge
                                                    variant={t.status ===
                                                        "faturado" ||
                                                    t.status === "concluido"
                                                        ? "success"
                                                        : t.status ===
                                                            "cancelado"
                                                          ? "danger"
                                                          : "neutral"}
                                                    size="sm"
                                                >
                                                    {t.status}
                                                </Badge>
                                            </div>
                                            <h4
                                                class="text-lg font-black text-surface-900 group-hover:text-brand-700 transition-colors"
                                            >
                                                {t.titulo}
                                            </h4>
                                            <p
                                                class="text-sm font-bold text-surface-500"
                                            >
                                                {t.cliente?.nome || "-"}
                                            </p>
                                        </div>
                                        <div
                                            class="text-right w-full md:w-auto"
                                        >
                                            <p
                                                class="text-2xl font-black text-surface-900"
                                            >
                                                {formatCurrency(
                                                    t.valor_total || 0,
                                                )}
                                            </p>
                                            <p
                                                class="text-xs font-black text-surface-400 uppercase tracking-widest mt-1"
                                            >
                                                {formatDate(t.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            {/each}

                            {#if transactions.length === 0}
                                <div class="p-20 text-center">
                                    <DollarSign
                                        class="w-12 h-12 text-surface-200 mx-auto mb-4"
                                    />
                                    <p class="text-surface-500 font-bold">
                                        Nenhuma movimentação financeira
                                        encontrada para este período.
                                    </p>
                                </div>
                            {/if}
                        </div>

                        {#if transactions.length > 20}
                            <div
                                class="p-6 bg-surface-50 border-t border-surface-100 text-center"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-black uppercase tracking-widest text-xs"
                                >
                                    Ver todas as transações
                                </Button>
                            </div>
                        {/if}
                    </Card>
                </div>
            </div>
        {/if}
    </div>
</div>
