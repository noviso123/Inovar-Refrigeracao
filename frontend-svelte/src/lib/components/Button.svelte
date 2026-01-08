<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Loader2 } from "lucide-svelte";

    export let type: "button" | "submit" | "reset" = "button";
    export let variant:
        | "primary"
        | "secondary"
        | "ghost"
        | "danger"
        | "success" = "primary";
    export let size: "sm" | "md" | "lg" = "md";
    export let disabled = false;
    export let loading = false;
    export let className = "";
    export let fullWidth = false;

    const dispatch = createEventDispatcher();

    const variants = {
        primary:
            "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200 active:scale-95",
        secondary:
            "bg-surface-100 text-surface-700 hover:bg-surface-200 active:scale-95",
        ghost: "bg-transparent text-surface-600 hover:bg-surface-100 active:scale-95",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100 active:scale-95",
        success:
            "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100 active:scale-95",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs font-bold",
        md: "px-5 py-2.5 text-sm font-bold",
        lg: "px-8 py-4 text-base font-bold",
    };

    function handleClick(event: MouseEvent) {
        if (!disabled && !loading) {
            dispatch("click", event);
        }
    }
</script>

<button
    {type}
    {disabled}
    class="inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 {variants[
        variant
    ]} {sizes[size]} {fullWidth ? 'w-full' : ''} {className}"
    on:click={handleClick}
>
    {#if loading}
        <Loader2 class="w-4 h-4 animate-spin" />
    {/if}
    <slot />
</button>
