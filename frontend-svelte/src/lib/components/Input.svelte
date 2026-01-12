<script lang="ts">
    export let label = "";
    export let type = "text";
    export let placeholder = "";
    export let value: string | number = "";
    export let error = "";
    export let disabled = false;
    export let className = "";
    export let required = false;
    export let loading = false;

    const id = "input-" + Math.random().toString(36).substr(2, 9);
    let focused = false;
</script>

<div class="flex flex-col gap-1.5 {className}">
    {#if label}
        <label
            for={id}
            class="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1"
        >
            {label}
            {#if required}<span class="text-red-500 ml-0.5">*</span>{/if}
        </label>
    {/if}

    <div class="relative group">
        <input
            {id}
            {type}
            {placeholder}
            {disabled}
            {required}
            bind:value
            on:focus={() => (focused = true)}
            on:blur={() => (focused = false)}
            on:input
            on:change
            class="w-full px-4 py-3 bg-white border rounded-xl transition-all duration-200 outline-none
             {error
                ? 'border-red-300 bg-red-50/30 text-red-900 focus:border-red-500'
                : focused
                  ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-sm'
                  : 'border-surface-200 hover:border-surface-300 text-surface-900'}
             disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed"
        />

        {#if error}
            <p
                class="text-[10px] font-bold text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1"
            >
                {error}
            </p>
        {/if}
    </div>
</div>
