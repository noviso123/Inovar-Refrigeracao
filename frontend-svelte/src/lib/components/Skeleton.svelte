<script lang="ts">
    export let className = "";
    export let circle = false;
    export let width = "100%";
    export let height = "1rem";
</script>

<div
    class="animate-pulse bg-surface-200 {circle
        ? 'rounded-full'
        : 'rounded-lg'} {className}"
    style="width: {width}; height: {height};"
></div>
