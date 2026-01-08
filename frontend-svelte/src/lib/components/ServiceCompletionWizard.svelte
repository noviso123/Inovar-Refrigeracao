<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import {
        X,
        ChevronLeft,
        ChevronRight,
        FileText,
        Camera,
        PenTool,
        Check,
        Loader2,
        Upload,
    } from "lucide-svelte";
    import CanvasAssinatura from "./CanvasAssinatura.svelte";

    export let isOpen = false;
    export let isAdmin = false;
    export let initialData: {
        titulo?: string;
        descricao?: string;
        valorTotal?: number;
        osDisplayNumber?: string;
        clienteNome?: string;
    } = {};

    interface WizardCompletionData {
        technicalReport: string;
        photos: string[];
        techSignature: string | null;
        clientSignature: string | null;
        adminBypass: boolean;
        paymentConfirmed: boolean;
    }

    const dispatch = createEventDispatcher();

    // Wizard state
    let currentStep = 0;
    let isLoading = false;
    let isUploading = false;

    // Form data
    let technicalReport = "";
    let photos: string[] = [];
    let techSignature: string | null = null;
    let clientSignature: string | null = null;
    let paymentConfirmed = false;
    let adminBypass = false;

    const steps = [
        { id: "report", title: "Relatório", icon: FileText },
        { id: "photos", title: "Fotos", icon: Camera },
        { id: "signatures", title: "Assinaturas", icon: PenTool },
        { id: "confirm", title: "Confirmar", icon: Check },
    ];

    function close() {
        dispatch("close");
        resetWizard();
    }

    function resetWizard() {
        currentStep = 0;
        technicalReport = "";
        photos = [];
        techSignature = null;
        clientSignature = null;
        paymentConfirmed = false;
        adminBypass = false;
    }

    function handleNext() {
        if (currentStep < steps.length - 1) {
            currentStep++;
        }
    }

    function handlePrev() {
        if (currentStep > 0) {
            currentStep--;
        }
    }

    async function handlePhotoUpload(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        isUploading = true;
        try {
            // Para simplificar, convertemos para base64
            // Em produção, você usaria um serviço de upload
            const files = Array.from(target.files);
            for (const file of files) {
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                photos = [...photos, dataUrl];
            }
        } catch (error) {
            console.error("Erro no upload:", error);
        } finally {
            isUploading = false;
            target.value = "";
        }
    }

    function removePhoto(index: number) {
        photos = photos.filter((_, i) => i !== index);
    }

    function handleTechSignatureSave(event: CustomEvent<string>) {
        techSignature = event.detail;
    }

    function handleClientSignatureSave(event: CustomEvent<string>) {
        clientSignature = event.detail;
    }

    async function handleFinish() {
        isLoading = true;
        try {
            const data: WizardCompletionData = {
                technicalReport,
                photos,
                techSignature: adminBypass ? null : techSignature,
                clientSignature: adminBypass ? null : clientSignature,
                adminBypass,
                paymentConfirmed,
            };

            dispatch("complete", data);
            close();
        } catch (error) {
            console.error("Erro ao finalizar:", error);
        } finally {
            isLoading = false;
        }
    }

    function generateReport() {
        technicalReport = `Relatório Técnico - OS #${initialData.osDisplayNumber || "N/A"}
Cliente: ${initialData.clienteNome || "N/A"}
Data: ${new Date().toLocaleDateString("pt-BR")}

Descrição do Serviço:
${initialData.descricao || initialData.titulo || "Serviço concluído com êxito."}

Valor Total: R$ ${(initialData.valorTotal || 0).toFixed(2)}

Observações:
- Serviço executado conforme solicitação
- Equipamento em pleno funcionamento
- Cliente orientado sobre uso adequado`;
    }

    $: canProceed =
        {
            0: technicalReport.trim().length > 10,
            1: true, // Fotos são opcionais
            2: adminBypass || (techSignature && clientSignature),
            3: true,
        }[currentStep] ?? false;
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            on:click={close}
        ></div>

        <!-- Modal -->
        <div
            class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
            <!-- Header -->
            <div
                class="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6"
            >
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-bold">Concluir Serviço</h2>
                        <p class="text-brand-100 text-sm mt-1">
                            OS #{initialData.osDisplayNumber || "N/A"}
                        </p>
                    </div>
                    <button
                        on:click={close}
                        class="p-2 hover:bg-white/10 rounded-xl transition"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Steps Indicator -->
                <div class="flex gap-2 mt-6">
                    {#each steps as step, i}
                        <div class="flex-1 relative">
                            <div
                                class="flex items-center gap-2 text-xs font-medium {i <=
                                currentStep
                                    ? 'text-white'
                                    : 'text-brand-200'}"
                            >
                                <div
                                    class="w-8 h-8 rounded-full flex items-center justify-center {i <
                                    currentStep
                                        ? 'bg-white text-brand-600'
                                        : i === currentStep
                                          ? 'bg-white/20 border-2 border-white'
                                          : 'bg-brand-500/30'}"
                                >
                                    {#if i < currentStep}
                                        <Check class="w-4 h-4" />
                                    {:else}
                                        <svelte:component
                                            this={step.icon}
                                            class="w-4 h-4"
                                        />
                                    {/if}
                                </div>
                                <span class="hidden sm:inline"
                                    >{step.title}</span
                                >
                            </div>
                            {#if i < steps.length - 1}
                                <div
                                    class="absolute top-4 left-10 right-0 h-0.5 {i <
                                    currentStep
                                        ? 'bg-white'
                                        : 'bg-brand-500/30'}"
                                ></div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Content -->
            <div class="p-6 max-h-[50vh] overflow-y-auto">
                <!-- Step 1: Relatório -->
                {#if currentStep === 0}
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <h3 class="font-bold text-lg">Relatório Técnico</h3>
                            <button
                                on:click={generateReport}
                                class="btn btn-secondary text-sm"
                            >
                                Gerar Automático
                            </button>
                        </div>
                        <textarea
                            bind:value={technicalReport}
                            class="input min-h-[200px]"
                            placeholder="Descreva o serviço realizado, peças utilizadas, observações..."
                        />
                    </div>
                {/if}

                <!-- Step 2: Fotos -->
                {#if currentStep === 1}
                    <div class="space-y-4">
                        <h3 class="font-bold text-lg">Fotos do Serviço</h3>
                        <p class="text-surface-500 text-sm">
                            Adicione fotos do serviço realizado (opcional)
                        </p>

                        <label
                            class="border-2 border-dashed border-surface-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition"
                        >
                            <input
                                type="file"
                                class="hidden"
                                accept="image/*"
                                multiple
                                on:change={handlePhotoUpload}
                                disabled={isUploading}
                            />
                            {#if isUploading}
                                <Loader2
                                    class="w-8 h-8 text-brand-500 animate-spin mb-2"
                                />
                                <span class="text-surface-500">Enviando...</span
                                >
                            {:else}
                                <Upload class="w-8 h-8 text-surface-400 mb-2" />
                                <span class="text-surface-500"
                                    >Clique para adicionar fotos</span
                                >
                            {/if}
                        </label>

                        {#if photos.length > 0}
                            <div class="grid grid-cols-3 gap-3">
                                {#each photos as photo, i}
                                    <div class="relative group aspect-square">
                                        <img
                                            src={photo}
                                            alt="Foto {i + 1}"
                                            class="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            on:click={() => removePhoto(i)}
                                            class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <X class="w-3 h-3" />
                                        </button>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Step 3: Assinaturas -->
                {#if currentStep === 2}
                    <div class="space-y-6">
                        <h3 class="font-bold text-lg">Assinaturas</h3>

                        {#if isAdmin}
                            <label
                                class="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={adminBypass}
                                    class="rounded"
                                />
                                <div>
                                    <p class="font-medium text-yellow-800">
                                        Ignorar assinaturas (Admin)
                                    </p>
                                    <p class="text-sm text-yellow-600">
                                        Concluir sem coletar assinaturas
                                    </p>
                                </div>
                            </label>
                        {/if}

                        {#if !adminBypass}
                            <div class="grid gap-6">
                                <div>
                                    <CanvasAssinatura
                                        label="Assinatura do Técnico"
                                        on:save={handleTechSignatureSave}
                                    />
                                    {#if techSignature}
                                        <p
                                            class="text-xs text-green-600 mt-1 flex items-center gap-1"
                                        >
                                            <Check class="w-3 h-3" /> Assinatura
                                            capturada
                                        </p>
                                    {/if}
                                </div>

                                <div>
                                    <CanvasAssinatura
                                        label="Assinatura do Cliente"
                                        on:save={handleClientSignatureSave}
                                    />
                                    {#if clientSignature}
                                        <p
                                            class="text-xs text-green-600 mt-1 flex items-center gap-1"
                                        >
                                            <Check class="w-3 h-3" /> Assinatura
                                            capturada
                                        </p>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Step 4: Confirmar -->
                {#if currentStep === 3}
                    <div class="space-y-4">
                        <h3 class="font-bold text-lg">Resumo</h3>

                        <div class="bg-surface-50 rounded-xl p-4 space-y-3">
                            <div class="flex justify-between">
                                <span class="text-surface-500">OS</span>
                                <span class="font-medium"
                                    >#{initialData.osDisplayNumber ||
                                        "N/A"}</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span class="text-surface-500">Cliente</span>
                                <span class="font-medium"
                                    >{initialData.clienteNome || "N/A"}</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span class="text-surface-500">Valor</span>
                                <span class="font-bold text-brand-600"
                                    >R$ {(initialData.valorTotal || 0).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span class="text-surface-500">Fotos</span>
                                <span class="font-medium"
                                    >{photos.length} foto(s)</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span class="text-surface-500">Assinaturas</span
                                >
                                <span class="font-medium">
                                    {#if adminBypass}
                                        <span class="text-yellow-600"
                                            >Ignoradas (Admin)</span
                                        >
                                    {:else}
                                        {techSignature && clientSignature
                                            ? "✅ Coletadas"
                                            : "⚠️ Pendentes"}
                                    {/if}
                                </span>
                            </div>
                        </div>

                        <label
                            class="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                bind:checked={paymentConfirmed}
                                class="rounded"
                            />
                            <div>
                                <p class="font-medium text-green-800">
                                    Confirmar recebimento
                                </p>
                                <p class="text-sm text-green-600">
                                    O pagamento foi recebido pelo serviço
                                </p>
                            </div>
                        </label>
                    </div>
                {/if}
            </div>

            <!-- Footer -->
            <div class="border-t p-4 flex justify-between">
                <button
                    on:click={handlePrev}
                    disabled={currentStep === 0}
                    class="btn btn-secondary {currentStep === 0
                        ? 'opacity-50 cursor-not-allowed'
                        : ''}"
                >
                    <ChevronLeft class="w-4 h-4" />
                    Voltar
                </button>

                {#if currentStep === steps.length - 1}
                    <button
                        on:click={handleFinish}
                        disabled={isLoading}
                        class="btn btn-primary"
                    >
                        {#if isLoading}
                            <Loader2 class="w-4 h-4 animate-spin" />
                            Finalizando...
                        {:else}
                            <Check class="w-4 h-4" />
                            Concluir Serviço
                        {/if}
                    </button>
                {:else}
                    <button
                        on:click={handleNext}
                        disabled={!canProceed}
                        class="btn btn-primary {!canProceed
                            ? 'opacity-50 cursor-not-allowed'
                            : ''}"
                    >
                        Próximo
                        <ChevronRight class="w-4 h-4" />
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}
