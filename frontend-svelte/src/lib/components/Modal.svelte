<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { X } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    export let title = "";
    export let show = false;
    export let maxWidth = "max-w-lg";

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && show) close();
    }

    $: if (show && typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
    } else if (typeof document !== "undefined") {
        document.body.style.overflow = "auto";
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        transition:fade={{ duration: 200 }}
    >
        <div
            class="absolute inset-0 bg-surface-900/40 backdrop-blur-sm"
            on:click={close}
        ></div>

        <div
            class="relative w-full {maxWidth} bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            transition:scale={{ duration: 300, start: 0.95, easing: cubicOut }}
        >
            <div
                class="flex items-center justify-between p-6 border-b border-surface-100"
            >
                <h3 class="text-xl font-bold text-surface-900">{title}</h3>
                <button
                    on:click={close}
                    class="p-2 hover:bg-surface-100 rounded-xl transition-colors text-surface-400 hover:text-surface-600"
                >
                    <X class="w-6 h-6" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <slot />
            </div>

            {#if $$slots.footer}
                <div
                    class="p-6 border-t border-surface-100 bg-surface-50/50 flex justify-end gap-3"
                >
                    <slot name="footer" />
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
