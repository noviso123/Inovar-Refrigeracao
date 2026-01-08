<script lang="ts">
    import { onMount } from "svelte";
    import {
        Users,
        Plus,
        Trash2,
        Edit,
        Loader2,
        ShieldCheck,
        Mail,
        User,
        Lock,
        X,
        Check,
        ChevronRight,
        ArrowLeft,
        MoreVertical,
        Shield,
        UserCheck,
        UserMinus,
    } from "lucide-svelte";
    import { user as currentUser } from "$lib/auth";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";

    interface Usuario {
        id: number;
        email: string;
        nome_completo: string;
        cargo: string;
        is_active: boolean;
        created_at: string;
    }

    let usuarios: Usuario[] = [];
    let loading = true;
    let isModalOpen = false;
    let editingUser: Usuario | null = null;
    let saving = false;

    let formData = {
        email: "",
        nome_completo: "",
        cargo: "prestador",
        password: "",
    };

    async function fetchUsuarios() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/usuarios", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                usuarios = await res.json();
            }
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        saving = true;
        try {
            const token = localStorage.getItem("token");
            const method = editingUser ? "PUT" : "POST";
            const url = editingUser
                ? `/api/usuarios/${editingUser.id}`
                : "/api/usuarios";

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
                await fetchUsuarios();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            saving = false;
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Excluir este usuário?")) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/usuarios/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchUsuarios();
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    }

    function resetForm() {
        formData = {
            email: "",
            nome_completo: "",
            cargo: "prestador",
            password: "",
        };
        editingUser = null;
    }

    function openEdit(usuario: Usuario) {
        editingUser = usuario;
        formData = {
            email: usuario.email,
            nome_completo: usuario.nome_completo,
            cargo: usuario.cargo,
            password: "",
        };
        isModalOpen = true;
    }

    function openNew() {
        resetForm();
        isModalOpen = true;
    }

    onMount(() => {
        fetchUsuarios();
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
                    Usuários
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Gerencie os acessos e permissões dos colaboradores
                </p>
            </div>
            <Button
                variant="primary"
                size="lg"
                on:click={openNew}
                className="shadow-xl shadow-brand-500/20"
            >
                <Plus class="w-5 h-5 mr-2" /> Novo Usuário
            </Button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
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
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each usuarios as usuario}
                    <Card
                        padding="p-6"
                        className="group hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300"
                    >
                        <div class="flex items-start justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-2xl group-hover:bg-brand-600 group-hover:text-white transition-all duration-300"
                                >
                                    {usuario.nome_completo
                                        ?.charAt(0)
                                        .toUpperCase()}
                                </div>
                                <div class="min-w-0">
                                    <h3
                                        class="font-black text-surface-900 group-hover:text-brand-700 transition-colors"
                                    >
                                        {usuario.nome_completo}
                                    </h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        {#if usuario.cargo === "admin"}
                                            <Badge variant="brand" size="sm">
                                                <ShieldCheck
                                                    class="w-3 h-3 mr-1"
                                                /> Admin
                                            </Badge>
                                        {:else}
                                            <Badge variant="neutral" size="sm">
                                                Prestador
                                            </Badge>
                                        {/if}
                                        {#if usuario.is_active}
                                            <div
                                                class="w-2 h-2 rounded-full bg-green-500"
                                                title="Ativo"
                                            ></div>
                                        {:else}
                                            <div
                                                class="w-2 h-2 rounded-full bg-surface-300"
                                                title="Inativo"
                                            ></div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            <div
                                class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    on:click={() => openEdit(usuario)}
                                    className="p-2"
                                >
                                    <Edit class="w-4 h-4" />
                                </Button>
                                {#if usuario.id !== $currentUser?.id}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        on:click={() =>
                                            handleDelete(usuario.id)}
                                        className="p-2 text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </Button>
                                {/if}
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
                                <span class="truncate">{usuario.email}</span>
                            </div>
                            <div
                                class="flex items-center gap-3 text-sm font-bold text-surface-500"
                            >
                                <div
                                    class="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400"
                                >
                                    <Shield class="w-4 h-4" />
                                </div>
                                <span
                                    >Cargo: {usuario.cargo === "admin"
                                        ? "Administrador"
                                        : "Prestador de Serviço"}</span
                                >
                            </div>
                        </div>

                        <div class="mt-8 pt-6 border-t border-surface-100">
                            <Button
                                variant="secondary"
                                fullWidth
                                on:click={() => openEdit(usuario)}
                            >
                                Gerenciar Acesso <ChevronRight
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
    title={editingUser ? "Editar Usuário" : "Novo Usuário"}
    onClose={() => (isModalOpen = false)}
>
    <div class="space-y-8 py-4">
        <!-- Informações Pessoais -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <User class="w-3 h-3" /> Informações Pessoais
            </h4>
            <div class="space-y-4">
                <Input
                    label="Nome Completo"
                    placeholder="Ex: João da Silva"
                    bind:value={formData.nome_completo}
                />
                <Input
                    label="E-mail de Acesso"
                    type="email"
                    placeholder="joao@empresa.com"
                    bind:value={formData.email}
                />
            </div>
        </div>

        <!-- Permissões e Segurança -->
        <div class="space-y-6">
            <h4
                class="text-xs font-black text-surface-400 uppercase tracking-widest flex items-center gap-2"
            >
                <Lock class="w-3 h-3" /> Permissões e Segurança
            </h4>
            <div class="space-y-6">
                <div class="space-y-2">
                    <label
                        class="text-xs font-black uppercase tracking-widest text-surface-500 ml-1"
                        >Cargo / Nível de Acesso</label
                    >
                    <div class="grid grid-cols-2 gap-4">
                        <button
                            on:click={() => (formData.cargo = "prestador")}
                            class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 {formData.cargo ===
                            'prestador'
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-surface-100 bg-surface-50 text-surface-500 hover:border-surface-200'}"
                        >
                            <User class="w-6 h-6" />
                            <span class="font-black text-sm">Prestador</span>
                        </button>
                        <button
                            on:click={() => (formData.cargo = "admin")}
                            class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 {formData.cargo ===
                            'admin'
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-surface-100 bg-surface-50 text-surface-500 hover:border-surface-200'}"
                        >
                            <ShieldCheck class="w-6 h-6" />
                            <span class="font-black text-sm">Administrador</span
                            >
                        </button>
                    </div>
                </div>

                <Input
                    label={editingUser
                        ? "Nova Senha (deixe em branco para manter)"
                        : "Senha de Acesso"}
                    type="password"
                    placeholder="••••••••"
                    bind:value={formData.password}
                />
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
                Salvar Usuário
            </Button>
        </div>
    </div>
</Modal>
