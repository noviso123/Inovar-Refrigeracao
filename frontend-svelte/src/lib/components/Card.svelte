<script lang="ts">
    export let className = "";
    export let interactive = false;
    export let padding = "p-6";
    export let glass = true;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="{glass
        ? 'glass-strong'
        : 'bg-white'} border border-surface-200 rounded-3xl shadow-sm transition-all duration-300
         {interactive
        ? 'hover:shadow-xl hover:-translate-y-1 hover:border-brand-200 cursor-pointer active:scale-[0.98]'
        : ''} 
         {padding} {className}"
    on:click
>
    <slot />
</div>
