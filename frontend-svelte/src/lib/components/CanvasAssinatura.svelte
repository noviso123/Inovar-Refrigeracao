<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import { Trash2, Check } from "lucide-svelte";

    export let label = "Assine aqui";
    export let initialSignature = "";

    const dispatch = createEventDispatcher();

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let isDrawing = false;
    let hasSignature = false;

    onMount(() => {
        if (!canvas) return;

        ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Style
        ctx.strokeStyle = "#1e40af";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // If there's an initial signature, draw it
        if (initialSignature) {
            const img = new Image();
            img.onload = () => {
                ctx?.drawImage(img, 0, 0);
                hasSignature = true;
            };
            img.src = initialSignature;
        }
    });

    function getCoordinates(e: MouseEvent | TouchEvent): {
        x: number;
        y: number;
    } {
        const rect = canvas.getBoundingClientRect();

        if ("touches" in e && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }

        if ("clientX" in e) {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }

        return { x: 0, y: 0 };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        e.preventDefault();
        if (!ctx) return;

        isDrawing = true;
        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !ctx) return;
        e.preventDefault();

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        hasSignature = true;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clearCanvas() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
        dispatch("clear");
    }

    function saveSignature() {
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        dispatch("save", dataUrl);
    }

    export function getDataUrl(): string {
        return canvas?.toDataURL("image/png") || "";
    }
</script>

<div class="space-y-2">
    <label class="block text-sm font-medium text-surface-700">{label}</label>

    <div
        class="relative border-2 border-dashed border-surface-300 rounded-xl bg-white overflow-hidden"
    >
        <canvas
            bind:this={canvas}
            class="w-full h-32 cursor-crosshair touch-none"
            on:mousedown={startDrawing}
            on:mousemove={draw}
            on:mouseup={stopDrawing}
            on:mouseleave={stopDrawing}
            on:touchstart={startDrawing}
            on:touchmove={draw}
            on:touchend={stopDrawing}
        />

        {#if !hasSignature}
            <div
                class="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <span class="text-surface-400 text-sm"
                    >Desenhe sua assinatura aqui</span
                >
            </div>
        {/if}
    </div>

    <div class="flex gap-2 justify-end">
        <button
            type="button"
            on:click={clearCanvas}
            class="px-3 py-1.5 text-sm text-surface-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
        >
            <Trash2 class="w-4 h-4" />
            Limpar
        </button>
        <button
            type="button"
            on:click={saveSignature}
            disabled={!hasSignature}
            class="px-4 py-1.5 text-sm rounded-lg transition flex items-center gap-1
        {hasSignature
                ? 'bg-brand-500 text-white hover:bg-brand-700'
                : 'bg-surface-200 text-surface-400 cursor-not-allowed'}"
        >
            <Check class="w-4 h-4" />
            Confirmar
        </button>
    </div>
</div>
