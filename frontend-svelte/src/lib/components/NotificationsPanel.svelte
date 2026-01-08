<script lang="ts">
    import { notifications, unreadCount, markAsRead, fetchNotifications } from "$lib/notifications";
    import { onMount } from "svelte";
    import { Bell, Check, ExternalLink, X } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";

    export let isOpen = false;
    export let onClose: () => void;

    onMount(() => {
        fetchNotifications();
        // Poll every 1 minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    });

    async function handleMarkRead(id: number) {
        await markAsRead(id);
    }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="fixed inset-0 z-[60] lg:absolute lg:inset-auto lg:right-0 lg:top-16 lg:w-96"
        on:click|self={onClose}
    >
        <div
            class="bg-white lg:rounded-2xl shadow-2xl h-full lg:h-auto lg:max-h-[600px] flex flex-col border border-surface-100 animate-in slide-in-from-right lg:slide-in-from-top-2"
            transition:fade={{ duration: 150 }}
        >
            <div class="p-6 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center">
                        <Bell class="w-5 h-5" />
                    </div>
                    <div>
                        <h2 class="font-bold text-surface-900">Notificações</h2>
                        <p class="text-xs text-surface-500 font-medium">Você tem {$unreadCount} mensagens não lidas</p>
                    </div>
                </div>
                <button
                    on:click={onClose}
                    class="p-2 hover:bg-surface-200 rounded-lg transition-colors"
                >
                    <X class="w-5 h-5 text-surface-400" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                {#if $notifications.length === 0}
                    <div class="flex flex-col items-center justify-center py-12 text-center px-6">
                        <div class="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                            <Bell class="w-8 h-8 text-surface-300" />
                        </div>
                        <p class="text-surface-500 font-medium">Tudo limpo por aqui!</p>
                        <p class="text-xs text-surface-400 mt-1">Nenhuma notificação no momento.</p>
                    </div>
                {:else}
                    <div class="space-y-1">
                        {#each $notifications as n (n.id)}
                            <div
                                class="p-4 rounded-xl transition-all duration-200 {n.read ? 'opacity-60 grayscale-[0.5]' : 'bg-brand-50/50 border border-brand-100/50 shadow-sm'}"
                                transition:slide
                            >
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <h3 class="font-bold text-sm text-surface-900 leading-tight mb-1">{n.title}</h3>
                                        <p class="text-sm text-surface-600 line-clamp-2 leading-relaxed">{n.message}</p>
                                        <div class="flex items-center gap-3 mt-3">
                                            <span class="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                            {#if n.link}
                                                <a href={n.link} class="text-[10px] font-bold text-brand-600 uppercase tracking-wider flex items-center gap-1 hover:underline">
                                                    Ver detalhes <ExternalLink class="w-3 h-3" />
                                                </a>
                                            {/if}
                                        </div>
                                    </div>
                                    {#if !n.read}
                                        <button
                                            on:click={() => handleMarkRead(n.id)}
                                            class="p-2 h-fit bg-white border border-brand-200 text-brand-600 rounded-lg hover:bg-brand-600 hover:text-white transition-all shadow-sm"
                                            title="Marcar como lida"
                                        >
                                            <Check class="w-4 h-4" />
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if $notifications.length > 0}
                <div class="p-4 border-t border-surface-100 bg-surface-50/30">
                    <button class="w-full py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                        Ver todo o histórico
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--color-surface-200);
        border-radius: 10px;
    }
</style>
