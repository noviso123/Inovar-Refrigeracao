<script lang="ts">
    import { onMount } from "svelte";
    import {
        Users,
        Plus,
        Search,
        Trash2,
        Edit,
        Loader2,
        X,
        MapPin,
        Phone,
        Mail,
        User,
        Building,
        FileText,
        Briefcase,
        ArrowRight,
        MoreVertical,
        ChevronRight,
        Clock,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface Cliente {
        id: number;
        nome: string;
        email: string;
        telefone: string;
        cpf: string;
        cnpj: string;
        cep: string;
        logradouro: string;
        numero: string;
        complemento: string;
        bairro: string;
        cidade: string;
        estado: string;
        periodo_manutencao: number;
    }

    let clientes: Cliente[] = [];
    let loading = true;
    let isModalOpen = false;
    let editingCliente: Cliente | null = null;
    let saving = false;
    let searchQuery = "";

    let formData = {
        nome: "",
        email: "",
        telefone: "",
        cpf: "",
        cnpj: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        periodo_manutencao: 6,
    };

    async function fetchClientes() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/clientes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                clientes = await res.json();
            }
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        saving = true;
        try {
            const token = localStorage.getItem("token");
            const method = editingCliente ? "PUT" : "POST";
            const url = editingCliente
                ? `/api/clientes/${editingCliente.id}`
                : "/api/clientes";

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                isModalOpen = false;
                resetForm();
                await fetchClientes();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            saving = false;
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Excluir este cliente?")) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/clientes/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchClientes();
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    }

    async function handleCepBlur() {
        if (formData.cep.length < 8) return;
        try {
            const cleanCep = formData.cep.replace(/\D/g, "");
            const res = await fetch(
                `https://viacep.com.br/ws/${cleanCep}/json/`,
            );
            if (res.ok) {
                const data = await res.json();
                if (!data.erro) {
                    formData.logradouro = data.logradouro || "";
                    formData.bairro = data.bairro || "";
                    formData.cidade = data.localidade || "";
                    formData.estado = data.uf || "";
                }
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        }
    }

    function resetForm() {
        formData = {
            nome: "",
            email: "",
            telefone: "",
            cpf: "",
            cnpj: "",
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
            periodo_manutencao: 6,
        };
        editingCliente = null;
    }

    function openEdit(cliente: Cliente) {
        editingCliente = cliente;
        formData = { ...cliente };
        isModalOpen = true;
    }

    function openNew() {
        resetForm();
        isModalOpen = true;
    }

    $: filteredClientes = clientes.filter(
        (c) =>
            c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.cpf?.includes(searchQuery) ||
            c.cnpj?.includes(searchQuery),
    );

    onMount(() => {
        fetchClientes();
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
                    <Users class="w-10 h-10 text-brand-600" />
                    Clientes
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Gerencie sua base de clientes e contatos comerciais
                </p>
            </div>
            <Button
                variant="primary"
                size="lg"
                on:click={openNew}
                className="shadow-xl shadow-brand-500/20"
            >
                <Plus class="w-5 h-5 mr-2" /> Novo Cliente
            </Button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <!-- Search Bar -->
        <div class="relative group">
            <Search
                class="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-surface-400 group-focus-within:text-brand-500 transition-colors"
            />
            <input
                type="text"
                placeholder="Buscar por nome, email, CPF ou CNPJ..."
                class="w-full h-16 pl-16 pr-6 bg-white border border-surface-200 rounded-[2rem] font-bold text-surface-900 outline-none focus:border-brand-500 focus:ring-8 focus:ring-brand-500/5 transition-all shadow-sm"
                bind:value={searchQuery}
            />
        </div>

        {#if loading}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each Array(6) as _}
                    <Card padding="p-6">
                        <div class="flex items-center gap-4 mb-6">
                            <Skeleton className="w-14 h-14 rounded-2xl" />
                            <div class="flex-1 space-y-2">
                                <Skeleton className="w-3/4 h-5" />
                                <Skeleton className="w-1/2 h-3" />
                            </div>
                        </div>
                        <div class="space-y-3">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-full h-4" />
                        </div>
                    </Card>
                {/each}
            </div>
        {:else if filteredClientes.length === 0}
            <div
                class="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-surface-200"
            >
                <div
                    class="w-24 h-24 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <Users class="w-12 h-12 text-surface-200" />
                </div>
                <h3 class="text-2xl font-black text-surface-900">
                    Nenhum cliente encontrado
                </h3>
                <p class="text-surface-500 font-bold mt-2 max-w-sm mx-auto">
                    {searchQuery
                        ? "Não encontramos resultados para sua busca. Tente outros termos."
                        : "Sua base de clientes está vazia. Comece cadastrando um novo cliente."}
                </p>
                {#if searchQuery}
                    <Button
                        variant="ghost"
                        className="mt-6"
                        on:click={() => (searchQuery = "")}
                    >
                        Limpar Busca
                    </Button>
                {/if}
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each filteredClientes as cliente}
                    <Card
                        padding="p-6"
                        className="group hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300"
                    >
                        <div class="flex items-start justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-2xl group-hover:bg-brand-600 group-hover:text-white transition-all duration-300"
                                >
                                    {cliente.nome.charAt(0).toUpperCase()}
                                </div>
                                <div class="min-w-0">
                                    <h3
                                        class="font-black text-surface-900 truncate group-hover:text-brand-700 transition-colors"
                                    >
                                        {cliente.nome}
                                    </h3>
                                    <Badge
                                        variant="neutral"
                                        size="sm"
                                        className="mt-1"
                                    >
                                        {cliente.cnpj
                                            ? "Pessoa Jurídica"
                                            : "Pessoa Física"}
                                    </Badge>
                                </div>
                            </div>
                            <div
                                class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    on:click={() => openEdit(cliente)}
                                    className="p-2"
                                >
                                    <Edit class="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    on:click={() => handleDelete(cliente.id)}
                                    className="p-2 text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <Mail class="w-4 h-4" />
                                </div>
                                <span class="truncate"
                                    >{cliente.email || "Sem email"}</span
                                >
                            </div>
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <Phone class="w-4 h-4" />
                                </div>
                                <span>{cliente.telefone || "Sem telefone"}</span
                                >
                            </div>
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <MapPin class="w-4 h-4" />
                                </div>
                                <span class="truncate">
                                    {cliente.cidade
                                        ? `${cliente.cidade} - ${cliente.estado}`
                                        : "Sem endereço"}
                                </span>
                            </div>
                        </div>

                        <div class="mt-8 pt-6 border-t border-surface-100">
                            <Button
                                variant="secondary"
                                fullWidth
                                on:click={() => openEdit(cliente)}
                            >
                                Ver Detalhes <ChevronRight
                                    class="w-4 h-4 ml-2"
                                />
                            </Button>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Modal -->
<Modal
    isOpen={isModalOpen}
    title={editingCliente ? "Editar Cliente" : "Novo Cliente"}
    onClose={() => (isModalOpen = false)}
>
    <div class="space-y-8 py-4">
        <!-- Informações Básicas -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <Briefcase class="w-3 h-3" /> Informações Básicas
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                    <Input
                        label="Nome Completo / Razão Social"
                        placeholder="Ex: João Silva ou Empresa LTDA"
                        bind:value={formData.nome}
                    />
                </div>
                <Input
                    label="E-mail"
                    type="email"
                    placeholder="email@exemplo.com"
                    bind:value={formData.email}
                />
                <Input
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    bind:value={formData.telefone}
                />
                <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    bind:value={formData.cpf}
                />
                <Input
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    bind:value={formData.cnpj}
                />
            </div>
        </div>

        <!-- Endereço -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <MapPin class="w-3 h-3" /> Endereço
            </h4>
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-4">
                    <Input
                        label="CEP"
                        placeholder="00000-000"
                        bind:value={formData.cep}
                        on:blur={handleCepBlur}
                    />
                </div>
                <div class="col-span-8">
                    <Input
                        label="Logradouro"
                        placeholder="Rua, Avenida..."
                        bind:value={formData.logradouro}
                    />
                </div>
                <div class="col-span-4">
                    <Input
                        label="Número"
                        placeholder="123"
                        bind:value={formData.numero}
                    />
                </div>
                <div class="col-span-8">
                    <Input
                        label="Complemento"
                        placeholder="Apto, Sala, Bloco..."
                        bind:value={formData.complemento}
                    />
                </div>
                <div class="col-span-5">
                    <Input label="Bairro" bind:value={formData.bairro} />
                </div>
                <div class="col-span-5">
                    <Input
                        label="Cidade"
                        bind:value={formData.cidade}
                        disabled
                    />
                </div>
                <div class="col-span-2">
                    <Input label="UF" bind:value={formData.estado} disabled />
                </div>
            </div>
        </div>

        <!-- Configurações -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <FileText class="w-3 h-3" /> Configurações de Serviço
            </h4>
            <div
                class="p-6 bg-brand-50/50 rounded-2xl border border-brand-100 flex items-center justify-between"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-600"
                    >
                        <Clock class="w-6 h-6" />
                    </div>
                    <div>
                        <p class="text-sm font-black text-brand-900">
                            Período de Manutenção
                        </p>
                        <p class="text-xs font-bold text-brand-700 opacity-75">
                            Intervalo recomendado entre visitas
                        </p>
                    </div>
                </div>
                <select
                    class="h-12 px-4 bg-white border border-brand-200 rounded-xl font-bold text-brand-900 outline-none focus:border-brand-500 transition-all"
                    bind:value={formData.periodo_manutencao}
                >
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                </select>
            </div>
        </div>

        <div class="pt-6 flex gap-4">
            <Button
                variant="secondary"
                fullWidth
                on:click={() => (isModalOpen = false)}
            >
                Cancelar
            </Button>
            <Button
                variant="primary"
                fullWidth
                on:click={handleSave}
                loading={saving}
            >
                Salvar Cliente
            </Button>
        </div>
    </div>
</Modal>
