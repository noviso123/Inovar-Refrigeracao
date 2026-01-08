<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        Calendar as CalendarIcon,
        ChevronLeft,
        ChevronRight,
        Clock,
        MapPin,
        Loader2,
        User,
        ArrowRight,
        AlertCircle,
    } from "lucide-svelte";
    import { Card, Badge, Button, Skeleton } from "$lib";

    interface Evento {
        id: number;
        sequential_id: number;
        titulo: string;
        status: string;
        scheduled_date?: string;
        cliente?: { nome: string };
        local?: { city: string };
    }

    let eventos: Evento[] = [];
    let loading = true;
    let currentDate = new Date();

    $: currentMonth = currentDate.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
    });

    async function fetchEventos() {
        loading = true;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/solicitacoes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                eventos = data.filter((e: Evento) => e.scheduled_date);
            }
        } catch (error) {
            console.error("Erro ao carregar eventos:", error);
        } finally {
            loading = false;
        }
    }

    function prevMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
        );
    }

    function nextMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
        );
    }

    function formatTime(date: string): string {
        return new Date(date).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    $: eventosDoMes = eventos
        .filter((e) => {
            if (!e.scheduled_date) return false;
            const eventDate = new Date(e.scheduled_date);
            return (
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
            );
        })
        .sort(
            (a, b) =>
                new Date(a.scheduled_date!).getTime() -
                new Date(b.scheduled_date!).getTime(),
        );

    onMount(() => {
        fetchEventos();
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
                    <CalendarIcon class="w-10 h-10 text-brand-600" />
                    Agenda de Serviços
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Acompanhe e gerencie seus compromissos agendados
                </p>
            </div>
            <div
                class="flex items-center gap-4 bg-surface-50 p-2 rounded-2xl border border-surface-200"
            >
                <Button
                    variant="ghost"
                    size="sm"
                    on:click={prevMonth}
                    className="p-2"
                >
                    <ChevronLeft class="w-5 h-5" />
                </Button>
                <span
                    class="font-black text-lg capitalize min-w-[150px] text-center"
                    >{currentMonth}</span
                >
                <Button
                    variant="ghost"
                    size="sm"
                    on:click={nextMonth}
                    className="p-2"
                >
                    <ChevronRight class="w-5 h-5" />
                </Button>
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        {#if loading}
            <div class="space-y-4">
                {#each Array(4) as _}
                    <Skeleton className="h-32 rounded-[2rem]" />
                {/each}
            </div>
        {:else if eventosDoMes.length === 0}
            <div
                class="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-surface-200"
            >
                <div
                    class="w-24 h-24 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CalendarIcon class="w-12 h-12 text-surface-200" />
                </div>
                <h3 class="text-2xl font-black text-surface-900">
                    Nenhum serviço agendado
                </h3>
                <p class="text-surface-500 font-bold mt-2 max-w-sm mx-auto">
                    Não há compromissos registrados para {currentMonth}.
                </p>
            </div>
        {:else}
            <div class="space-y-6">
                {#each eventosDoMes as evento}
                    <Card
                        padding="p-0"
                        className="group overflow-hidden hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300"
                    >
                        <button
                            on:click={() => goto(`/solicitacao/${evento.id}`)}
                            class="w-full flex flex-col md:flex-row items-stretch text-left"
                        >
                            <!-- Date Column -->
                            <div
                                class="bg-surface-50 md:w-32 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-surface-100 group-hover:bg-brand-50 transition-colors"
                            >
                                <span
                                    class="text-4xl font-black text-brand-600"
                                >
                                    {new Date(evento.scheduled_date!).getDate()}
                                </span>
                                <span
                                    class="text-xs font-black text-surface-400 uppercase tracking-widest mt-1"
                                >
                                    {new Date(
                                        evento.scheduled_date!,
                                    ).toLocaleDateString("pt-BR", {
                                        weekday: "short",
                                    })}
                                </span>
                            </div>

                            <!-- Content Column -->
                            <div
                                class="flex-1 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div class="space-y-3">
                                    <div class="flex items-center gap-3">
                                        <Badge
                                            variant="neutral"
                                            size="sm"
                                            className="font-mono"
                                        >
                                            #{evento.sequential_id}
                                        </Badge>
                                        <Badge
                                            variant={evento.status ===
                                            "concluido"
                                                ? "success"
                                                : evento.status ===
                                                    "em_andamento"
                                                  ? "warning"
                                                  : "neutral"}
                                            size="sm"
                                        >
                                            {evento.status}
                                        </Badge>
                                    </div>
                                    <h3
                                        class="text-2xl font-black text-surface-900 group-hover:text-brand-700 transition-colors"
                                    >
                                        {evento.titulo}
                                    </h3>
                                    <div
                                        class="flex flex-wrap items-center gap-6"
                                    >
                                        <div
                                            class="flex items-center gap-2 text-sm font-bold text-surface-500"
                                        >
                                            <Clock
                                                class="w-4 h-4 text-brand-500"
                                            />
                                            {formatTime(evento.scheduled_date!)}
                                        </div>
                                        {#if evento.cliente}
                                            <div
                                                class="flex items-center gap-2 text-sm font-bold text-surface-500"
                                            >
                                                <User
                                                    class="w-4 h-4 text-brand-500"
                                                />
                                                {evento.cliente.nome}
                                            </div>
                                        {/if}
                                        {#if evento.local?.city}
                                            <div
                                                class="flex items-center gap-2 text-sm font-bold text-surface-500"
                                            >
                                                <MapPin
                                                    class="w-4 h-4 text-brand-500"
                                                />
                                                {evento.local.city}
                                            </div>
                                        {/if}
                                    </div>
                                </div>

                                <div class="flex items-center gap-4">
                                    <Button
                                        variant="secondary"
                                        className="group-hover:bg-brand-600 group-hover:text-white transition-all"
                                    >
                                        Ver Detalhes <ArrowRight
                                            class="w-4 h-4 ml-2"
                                        />
                                    </Button>
                                </div>
                            </div>
                        </button>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>
