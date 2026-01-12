<script lang="ts">
    export let variant:
        | "neutral"
        | "brand"
        | "success"
        | "warning"
        | "danger"
        | "info" = "neutral";
    export let size: "sm" | "md" | "lg" = "md";
    export let className = "";

    const variants = {
        neutral: "bg-surface-100 text-surface-600",
        brand: "bg-brand-50 text-brand-600",
        success: "bg-green-50 text-green-600",
        warning: "bg-yellow-50 text-yellow-600",
        danger: "bg-red-50 text-red-600",
        info: "bg-blue-50 text-blue-600",
    };

    const sizes = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
    };
</script>

<span
    class="inline-flex items-center font-bold uppercase tracking-wider rounded-full {variants[
        variant
    ]} {sizes[size]} {className}"
>
    <slot />
</span>
