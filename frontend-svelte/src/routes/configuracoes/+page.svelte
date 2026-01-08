<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { user, logout } from "$lib/auth";
    import {
        Settings as SettingsIcon,
        Bell,
        Building,
        Upload,
        Save,
        ChevronRight,
        Loader2,
        User as UserIcon,
        MapPin,
        Lock,
        Camera,
        PenTool,
        Wrench,
        FileText,
        Calendar,
        LogOut,
        Globe,
        Phone,
        Mail,
        ShieldCheck,
        Clock,
    } from "lucide-svelte";
    import { Card, Badge, Button, Input, Modal, Skeleton } from "$lib";
    import AutomacaoSettings from "$lib/components/AutomacaoSettings.svelte";

    let activeSection = "geral";
    let isSaving = false;

    // Dados Pessoais
    let name = "";
    let email = "";
    let phone = "";
    let cpf = "";
    let avatar = "";

    // Endereço
    let cep = "";
    let street = "";
    let numero = "";
    let complement = "";
    let neighborhood = "";
    let city = "";
    let state = "";
    let isLoadingCep = false;

    // Segurança
    let password = "";
    let confirmPassword = "";

    // Empresa (Admin)
    let empresa = {
        nomeFantasia: "",
        cnpj: "",
        email: "",
        telefone: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        site: "",
        logoUrl: "",
        pixKey: "",
    };
    let isLoadingCepEmpresa = false;

    // Notificações
    let notificacoesAtivas = false;

    $: isAdmin = $user?.cargo === "admin";

    async function loadUserData() {
        if ($user) {
            name = $user.nome_completo || "";
            email = $user.email || "";
            phone = $user.telefone || "";
            cpf = $user.cpf || "";
            avatar = $user.avatar_url || "";

            if ($user.endereco) {
                cep = $user.endereco.cep || "";
                street = $user.endereco.logradouro || "";
                numero = $user.endereco.numero || "";
                complement = $user.endereco.complemento || "";
                neighborhood = $user.endereco.bairro || "";
                city = $user.endereco.cidade || "";
                state = $user.endereco.estado || "";
            }
        }
    }

    async function handleAvatarUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                avatar = data.url;
                alert(
                    "Foto de perfil atualizada! Clique em Salvar para confirmar.",
                );
            } else {
                const errorData = await res.json();
                alert(
                    `Erro no upload: ${errorData.detail || "Falha desconhecida"}`,
                );
            }
        } catch (error) {
            console.error("Erro no upload:", error);
            alert("Erro ao fazer upload da imagem.");
        }
    }

    async function handleLogoUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                empresa.logoUrl = data.url;
                alert("Logo atualizado! Clique em Salvar para confirmar.");
            } else {
                alert("Erro ao fazer upload do logo.");
            }
        } catch (error) {
            console.error("Erro no upload:", error);
            alert("Erro ao fazer upload do logo.");
        }
    }

    async function loadCompanyData() {
        if (!isAdmin) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/empresas/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                empresa = {
                    nomeFantasia: data.nomeFantasia || data.nome_fantasia || "",
                    cnpj: data.cnpj || "",
                    email: data.emailContato || data.email || "",
                    telefone: data.telefoneContato || data.telefone || "",
                    site: data.site || "",
                    logoUrl: data.logoUrl || data.logo_url || "",
                    pixKey: data.pix_key || "",
                    cep: data.endereco?.cep || "",
                    logradouro: data.endereco?.logradouro || "",
                    numero: data.endereco?.numero || "",
                    complemento: data.endereco?.complemento || "",
                    bairro: data.endereco?.bairro || "",
                    cidade: data.endereco?.cidade || "",
                    estado: data.endereco?.estado || "",
                };
            }
        } catch (error) {
            console.error("Erro ao carregar empresa:", error);
        }
    }

    async function handleCepChangeEmpresa() {
        if (empresa.cep.length < 8) return;
        isLoadingCepEmpresa = true;
        try {
            const cleanCep = empresa.cep.replace(/\D/g, "");
            const res = await fetch(
                `https://viacep.com.br/ws/${cleanCep}/json/`,
            );
            if (res.ok) {
                const data = await res.json();
                if (!data.erro) {
                    empresa.logradouro = data.logradouro || "";
                    empresa.bairro = data.bairro || "";
                    empresa.cidade = data.localidade || "";
                    empresa.estado = data.uf || "";
                }
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            isLoadingCepEmpresa = false;
        }
    }

    $: if (empresa.cep && empresa.cep.replace(/\D/g, "").length === 8) {
        handleCepChangeEmpresa();
    }

    async function handleCepChange() {
        if (cep.length < 8) return;
        isLoadingCep = true;
        try {
            const cleanCep = cep.replace(/\D/g, "");
            const res = await fetch(
                `https://viacep.com.br/ws/${cleanCep}/json/`,
            );
            if (res.ok) {
                const data = await res.json();
                if (!data.erro) {
                    street = data.logradouro || "";
                    neighborhood = data.bairro || "";
                    city = data.localidade || "";
                    state = data.uf || "";
                }
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            isLoadingCep = false;
        }
    }

    async function handleSave() {
        isSaving = true;
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Sessão expirada. Por favor, faça login novamente.");
                return;
            }

            // Salvar dados pessoais
            const userResponse = await fetch("/api/usuarios/me", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nome_completo: name,
                    telefone: phone,
                    cpf,
                    avatar_url: avatar,
                }),
            });

            if (!userResponse.ok) {
                const errorData = await userResponse.json().catch(() => ({}));
                console.error("Erro ao salvar dados pessoais:", errorData);
                throw new Error(
                    errorData.detail || `Erro ${userResponse.status}`,
                );
            }

            const savedUser = await userResponse.json();
            console.log("Dados salvos:", savedUser);

            // Alterar senha se preenchida
            if (password && password.length >= 6) {
                if (password !== confirmPassword) {
                    alert("As senhas não conferem.");
                    return;
                }
                const passResponse = await fetch("/api/usuarios/me/senha", {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ novaSenha: password }),
                });

                if (!passResponse.ok) {
                    const errorData = await passResponse
                        .json()
                        .catch(() => ({}));
                    throw new Error(
                        errorData.detail || "Erro ao alterar senha",
                    );
                }

                password = "";
                confirmPassword = "";
            }

            // Salvar empresa se admin
            if (isAdmin) {
                const empresaResponse = await fetch("/api/empresas/me", {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nomeFantasia: empresa.nomeFantasia,
                        cnpj: empresa.cnpj,
                        emailContato: empresa.email,
                        telefoneContato: empresa.telefone,
                        endereco: {
                            cep: empresa.cep,
                            logradouro: empresa.logradouro,
                            numero: empresa.numero,
                            complemento: empresa.complemento,
                            bairro: empresa.bairro,
                            cidade: empresa.cidade,
                            estado: empresa.estado,
                        },
                        site: empresa.site,
                        logoUrl: empresa.logoUrl,
                        pix_key: empresa.pixKey,
                    }),
                });

                if (!empresaResponse.ok) {
                    console.error("Erro ao salvar empresa");
                }
            }

            // Atualizar o user store com os novos dados
            if (savedUser) {
                const updatedUser = {
                    ...$user,
                    nome_completo: savedUser.nome_completo || name,
                    telefone: savedUser.telefone || phone,
                    cpf: savedUser.cpf || cpf,
                    avatar_url: savedUser.avatar_url || avatar,
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }

            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert(
                `Erro ao salvar configurações: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            );
        } finally {
            isSaving = false;
        }
    }

    async function requestNotifications() {
        if (!("Notification" in window)) {
            alert("Seu navegador não suporta notificações.");
            return;
        }
        const permission = await Notification.requestPermission();
        notificacoesAtivas = permission === "granted";
        if (notificacoesAtivas) {
            new Notification("Inovar Refrigeração", {
                body: "Notificações ativadas com sucesso!",
            });
        }
    }

    async function handleLogout() {
        logout();
        goto("/login");
    }

    const sections = [
        { id: "geral", label: "Dados Pessoais", icon: UserIcon },
        { id: "endereco", label: "Endereço", icon: MapPin },
        { id: "seguranca", label: "Segurança", icon: Lock },
        ...(isAdmin
            ? [{ id: "empresa", label: "Dados da Empresa", icon: Building }]
            : []),
        { id: "notificacoes", label: "Notificações", icon: Bell },
        ...(isAdmin ? [{ id: "fiscal", label: "NFS-e", icon: FileText }] : []),
    ];

    onMount(() => {
        loadUserData();
        loadCompanyData();
        if ("Notification" in window) {
            notificacoesAtivas = Notification.permission === "granted";
        }
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
                    <SettingsIcon class="w-10 h-10 text-brand-600" />
                    Configurações
                </h1>
                <p class="text-surface-500 font-bold mt-2">
                    Gerencie seu perfil, segurança e preferências do sistema
                </p>
            </div>
            <Button
                variant="primary"
                size="lg"
                on:click={handleSave}
                loading={isSaving}
                className="shadow-xl shadow-brand-500/20"
            >
                <Save class="w-5 h-5 mr-2" /> Salvar Alterações
            </Button>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="lg:grid lg:grid-cols-12 lg:gap-8">
            <!-- Sidebar Navigation -->
            <div class="lg:col-span-3 space-y-4 mb-8 lg:mb-0">
                <nav class="sticky top-24 space-y-2">
                    {#each sections as section}
                        <button
                            on:click={() => (activeSection = section.id)}
                            class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all duration-200 {activeSection ===
                            section.id
                                ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/20 translate-x-2'
                                : 'bg-white text-surface-500 hover:bg-surface-100 hover:text-surface-900 border border-surface-200'}"
                        >
                            <svelte:component
                                this={section.icon}
                                class="w-5 h-5"
                            />
                            {section.label}
                            {#if activeSection === section.id}
                                <ChevronRight class="w-4 h-4 ml-auto" />
                            {/if}
                        </button>
                    {/each}

                    <div class="pt-6 mt-6 border-t border-surface-200">
                        <button
                            on:click={handleLogout}
                            class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                        >
                            <LogOut class="w-5 h-5" />
                            Sair da Conta
                        </button>
                    </div>
                </nav>
            </div>

            <!-- Content Area -->
            <div class="lg:col-span-9 space-y-8">
                {#if activeSection === "geral"}
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <UserIcon class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Dados Pessoais
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Informações básicas do seu perfil de acesso
                                </p>
                            </div>
                        </div>

                        <div class="grid lg:grid-cols-12 gap-12">
                            <div
                                class="lg:col-span-4 flex flex-col items-center"
                            >
                                <div class="relative group">
                                    <div
                                        class="w-40 h-40 rounded-[2.5rem] bg-surface-100 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-all duration-500"
                                    >
                                        {#if avatar}
                                            <img
                                                src={avatar}
                                                alt={name}
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <span
                                                class="text-brand-600 text-5xl font-black"
                                                >{name?.charAt(0) || "U"}</span
                                            >
                                        {/if}
                                    </div>
                                    <label
                                        class="absolute -bottom-2 -right-2 bg-brand-600 text-white p-4 rounded-2xl shadow-xl cursor-pointer hover:bg-brand-700 hover:scale-110 transition-all"
                                    >
                                        <input
                                            type="file"
                                            class="hidden"
                                            accept="image/*"
                                            on:change={handleAvatarUpload}
                                        />
                                        <Camera class="w-6 h-6" />
                                    </label>
                                </div>
                                <p
                                    class="text-xs font-black text-surface-400 mt-8 uppercase tracking-widest text-center"
                                >
                                    Foto de Perfil
                                </p>
                            </div>

                            <div class="lg:col-span-8 space-y-6">
                                <Input
                                    label="Nome Completo"
                                    bind:value={name}
                                    placeholder="Seu nome completo"
                                />
                                <div class="space-y-2">
                                    <Input
                                        label="E-mail"
                                        bind:value={email}
                                        disabled
                                    />
                                    <p
                                        class="text-[10px] font-black text-surface-400 uppercase tracking-widest flex items-center gap-1 ml-1"
                                    >
                                        <Lock class="w-3 h-3" /> O e-mail não pode
                                        ser alterado
                                    </p>
                                </div>
                                <div class="grid md:grid-cols-2 gap-6">
                                    <Input
                                        label="CPF"
                                        bind:value={cpf}
                                        placeholder="000.000.000-00"
                                    />
                                    <Input
                                        label="Telefone"
                                        bind:value={phone}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                {/if}

                {#if activeSection === "endereco"}
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <MapPin class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Endereço Pessoal
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Localização para fins de cadastro e
                                    faturamento
                                </p>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="grid grid-cols-12 gap-6">
                                <div class="col-span-4">
                                    <Input
                                        label="CEP"
                                        bind:value={cep}
                                        placeholder="00000-000"
                                        loading={isLoadingCep}
                                    />
                                </div>
                                <div class="col-span-8">
                                    <Input
                                        label="Logradouro"
                                        bind:value={street}
                                        placeholder="Rua, Avenida..."
                                    />
                                </div>
                                <div class="col-span-4">
                                    <Input
                                        label="Número"
                                        bind:value={numero}
                                        placeholder="123"
                                    />
                                </div>
                                <div class="col-span-8">
                                    <Input
                                        label="Complemento"
                                        bind:value={complement}
                                        placeholder="Apto, Bloco, etc."
                                    />
                                </div>
                                <div class="col-span-5">
                                    <Input
                                        label="Bairro"
                                        bind:value={neighborhood}
                                    />
                                </div>
                                <div class="col-span-5">
                                    <Input
                                        label="Cidade"
                                        bind:value={city}
                                        disabled
                                    />
                                </div>
                                <div class="col-span-2">
                                    <Input
                                        label="UF"
                                        bind:value={state}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                {/if}

                {#if activeSection === "seguranca"}
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <Lock class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Segurança
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Proteja sua conta com uma senha forte
                                </p>
                            </div>
                        </div>

                        <div class="max-w-xl space-y-6">
                            <Input
                                label="Nova Senha"
                                type="password"
                                bind:value={password}
                                placeholder="Deixe em branco para manter"
                            />
                            <Input
                                label="Confirmar Nova Senha"
                                type="password"
                                bind:value={confirmPassword}
                                placeholder="Repita a nova senha"
                            />

                            <div
                                class="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex gap-4"
                            >
                                <ShieldCheck
                                    class="w-8 h-8 text-blue-600 flex-shrink-0"
                                />
                                <div>
                                    <p
                                        class="font-black text-blue-900 text-sm uppercase tracking-widest mb-2"
                                    >
                                        Dicas de Segurança
                                    </p>
                                    <ul class="space-y-2">
                                        <li
                                            class="flex items-center gap-2 text-sm font-bold text-blue-800/70"
                                        >
                                            <div
                                                class="w-1.5 h-1.5 rounded-full bg-blue-400"
                                            ></div>
                                            Use pelo menos 8 caracteres
                                        </li>
                                        <li
                                            class="flex items-center gap-2 text-sm font-bold text-blue-800/70"
                                        >
                                            <div
                                                class="w-1.5 h-1.5 rounded-full bg-blue-400"
                                            ></div>
                                            Combine letras, números e símbolos
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                {/if}

                {#if activeSection === "empresa" && isAdmin}
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <Building class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Dados da Empresa
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Informações institucionais e comerciais
                                </p>
                            </div>
                        </div>

                        <div class="grid lg:grid-cols-12 gap-12">
                            <div
                                class="lg:col-span-4 flex flex-col items-center"
                            >
                                <label class="cursor-pointer">
                                    <input
                                        type="file"
                                        class="hidden"
                                        accept="image/*"
                                        on:change={handleLogoUpload}
                                    />
                                    <div
                                        class="w-full aspect-square rounded-[2.5rem] border-4 border-dashed border-surface-200 bg-surface-50 flex flex-col items-center justify-center p-8 text-center hover:border-brand-500 hover:bg-brand-50 transition-all cursor-pointer group"
                                    >
                                        {#if empresa.logoUrl}
                                            <img
                                                src={empresa.logoUrl}
                                                alt="Logo"
                                                class="w-full h-full object-contain"
                                            />
                                        {:else}
                                            <Upload
                                                class="w-10 h-10 text-surface-300 group-hover:text-brand-500 mb-4"
                                            />
                                            <span
                                                class="text-xs font-black text-surface-400 uppercase tracking-widest group-hover:text-brand-600"
                                                >Upload Logo</span
                                            >
                                        {/if}
                                    </div>
                                </label>
                                <p
                                    class="text-[10px] font-black text-surface-400 mt-6 uppercase tracking-widest text-center"
                                >
                                    Logo da Empresa
                                </p>
                            </div>

                            <div class="lg:col-span-8 space-y-6">
                                <Input
                                    label="Nome Fantasia"
                                    bind:value={empresa.nomeFantasia}
                                />
                                <div class="grid md:grid-cols-2 gap-6">
                                    <Input
                                        label="CNPJ"
                                        bind:value={empresa.cnpj}
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <Input
                                        label="Telefone Comercial"
                                        bind:value={empresa.telefone}
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>
                                <Input
                                    label="E-mail Comercial"
                                    type="email"
                                    bind:value={empresa.email}
                                />
                                <div class="space-y-6">
                                    <div class="grid grid-cols-12 gap-6">
                                        <div class="col-span-4">
                                            <Input
                                                label="CEP"
                                                bind:value={empresa.cep}
                                                placeholder="00000-000"
                                                loading={isLoadingCepEmpresa}
                                            />
                                        </div>
                                        <div class="col-span-8">
                                            <Input
                                                label="Logradouro"
                                                bind:value={empresa.logradouro}
                                                placeholder="Rua, Avenida..."
                                            />
                                        </div>
                                        <div class="col-span-4">
                                            <Input
                                                label="Número"
                                                bind:value={empresa.numero}
                                                placeholder="123"
                                            />
                                        </div>
                                        <div class="col-span-8">
                                            <Input
                                                label="Complemento"
                                                bind:value={empresa.complemento}
                                                placeholder="Apto, Bloco, etc."
                                            />
                                        </div>
                                        <div class="col-span-5">
                                            <Input
                                                label="Bairro"
                                                bind:value={empresa.bairro}
                                            />
                                        </div>
                                        <div class="col-span-5">
                                            <Input
                                                label="Cidade"
                                                bind:value={empresa.cidade}
                                                disabled
                                            />
                                        </div>
                                        <div class="col-span-2">
                                            <Input
                                                label="UF"
                                                bind:value={empresa.estado}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Input
                                    label="Website"
                                    bind:value={empresa.site}
                                    placeholder="https://suaempresa.com.br"
                                />
                                <Input
                                    label="Chave PIX (Para Pagamentos OS)"
                                    bind:value={empresa.pixKey}
                                    placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                                />
                            </div>
                        </div>
                    </Card>
                {/if}

                {#if activeSection === "notificacoes"}
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <Bell class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Notificações
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Controle como você recebe os alertas do
                                    sistema
                                </p>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div
                                class="p-8 bg-surface-50 rounded-[2.5rem] border border-surface-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-300"
                            >
                                <div class="flex items-center gap-6">
                                    <div
                                        class="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-110 transition-all"
                                    >
                                        <Bell class="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p
                                            class="text-lg font-black text-surface-900"
                                        >
                                            Notificações Push
                                        </p>
                                        <p
                                            class="text-sm font-bold text-surface-500"
                                        >
                                            Alertas em tempo real no seu
                                            navegador ou celular
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant={notificacoesAtivas
                                        ? "secondary"
                                        : "primary"}
                                    on:click={requestNotifications}
                                    className="h-12 px-8"
                                >
                                    {notificacoesAtivas ? "Ativado" : "Ativar"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                {/if}

                {#if activeSection === "fiscal" && isAdmin}
                    <Card padding="p-8">
                        <div class="flex items-center gap-4 mb-10">
                            <div
                                class="p-3 bg-brand-50 rounded-2xl text-brand-600"
                            >
                                <FileText class="w-6 h-6" />
                            </div>
                            <div>
                                <h2
                                    class="text-2xl font-black text-surface-900 tracking-tight"
                                >
                                    Configuração NFS-e
                                </h2>
                                <p class="text-surface-500 font-bold">
                                    Gestão fiscal e emissão de notas de serviço
                                </p>
                            </div>
                        </div>

                        <div
                            class="py-20 text-center bg-surface-50 rounded-[3rem] border-2 border-dashed border-surface-200"
                        >
                            <div
                                class="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"
                            >
                                <FileText class="w-12 h-12 text-surface-200" />
                            </div>
                            <h3 class="text-2xl font-black text-surface-900">
                                Módulo Fiscal Enterprise
                            </h3>
                            <p
                                class="text-surface-500 font-bold mt-2 max-w-sm mx-auto"
                            >
                                A emissão automatizada de notas fiscais está
                                disponível apenas para clientes do plano
                                Enterprise.
                            </p>
                            <Button variant="ghost" className="mt-8">
                                Falar com Suporte <ArrowRight
                                    class="w-4 h-4 ml-2"
                                />
                            </Button>
                        </div>
                    </Card>
                {/if}
            </div>
        </div>
    </div>
</div>
