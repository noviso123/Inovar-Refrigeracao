<script lang="ts">
  import "../app.css";
  import { onMount, onDestroy } from "svelte";
  import { initAuth, user, isAuthenticated, logout } from "$lib/auth";
  import { unreadCount } from "$lib/notifications";
  import NotificationsPanel from "$lib/components/NotificationsPanel.svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { userModal } from "$lib/modalStore";
  import { toast } from "svelte-sonner"; // Assuming svelte-sonner is installed or similar
  import {
    Home,
    Menu,
    X,
    Users as UserIcon,
    Settings,
    MessageCircle,
    Briefcase,
    Calendar,
    LogOut,
    ChevronRight,
    Bell,
    Plus,
    Loader2,
    Lock,
    Users,
    Wallet,
    QrCode,
    LifeBuoy,
    BellRing,
  } from "lucide-svelte";

  let isMobileMenuOpen = false;
  let showNotifications = false;
  let socket: WebSocket | null = null;
  let reconnectInterval: any;

  function connectWebSocket() {
    if (typeof window === "undefined" || !$isAuthenticated) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications?token=${localStorage.getItem("token")}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      clearInterval(reconnectInterval);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_order") {
          toast.success(`Nova OS #${data.data.sequential_id}: ${data.data.titulo}`);
        } else if (data.type === "order_updated") {
          toast.info(`OS #${data.data.sequential_id} atualizada: ${data.data.status}`);
        } else if (data.type === "client_updated") {
          toast.info(`Cliente ${data.data.name} atualizado`);
        } else if (data.type === "notification") {
           unreadCount.update(n => n + 1);
           toast.info(data.message);
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected. Reconnecting...");
      reconnectInterval = setInterval(connectWebSocket, 5000);
    };
  }

  onMount(() => {
    initAuth();
    if ($isAuthenticated) {
        connectWebSocket();
    }
  });

  onDestroy(() => {
    if (socket) socket.close();
    clearInterval(reconnectInterval);
  });

  // Redirecionar para login se não autenticado
  $: if (
    typeof window !== "undefined" &&
    !$isAuthenticated &&
    !$page.url.pathname.includes("/login")
  ) {
    // Aguardar inicialização do auth
    setTimeout(() => {
      if (!$isAuthenticated) goto("/login");
    }, 100);
  }

  // Menu items baseado no cargo
  $: menuItems =
    $user?.cargo === "admin"
      ? [
          {
            id: "/usuarios",
            label: "Usuários",
            icon: Users,
            section: "gestao",
          },
          {
            id: "/configuracoes",
            label: "Configurações",
            icon: Settings,
            section: "gestao",
          },
        ]
      : [
          { id: "/", label: "Painel", icon: Home, section: "geral" },
          {
            id: "/solicitacoes",
            label: "Serviços",
            icon: Briefcase,
            section: "geral",
          },
          {
            id: "/agenda",
            label: "Agenda",
            icon: Calendar,
            section: "geral",
          },
          {
            id: "/clientes",
            label: "Clientes",
            icon: UserIcon,
            section: "geral",
          },
          {
            id: "/financeiro",
            label: "Financeiro",
            icon: Wallet,
            section: "geral",
          },
          {
            id: "/equipamentos",
            label: "Equipamentos / QR",
            icon: QrCode,
            section: "geral",
          },
          {
            id: "/configuracoes",
            label: "Configurações",
            icon: Settings,
            section: "conta",
          },
          {
            id: "/suporte",
            label: "Suporte",
            icon: LifeBuoy,
            section: "conta",
          },
        ];

  $: sections = {
    geral: menuItems.filter((i) => i.section === "geral"),
    gestao: menuItems.filter((i) => i.section === "gestao"),
    conta: menuItems.filter((i) => i.section === "conta"),
  };

  // Reactive current path - this ensures the sidebar updates when navigating
  $: currentPath = $page.url.pathname;

  function isActive(path: string): boolean {
    if (path === "/") return currentPath === "/";
    return currentPath === path || currentPath.startsWith(path + "/");
  }

  async function handleLogout() {
    logout();
    goto("/login");
  }
</script>

{#if $isAuthenticated}
  <div class="min-h-screen bg-surface-50 flex overflow-hidden">
    <!-- ===== DESKTOP SIDEBAR ===== -->
    <aside class="sidebar glass-strong border-r border-surface-200 shadow-2xl">
      <div class="p-8 border-b border-surface-100 bg-white/40 backdrop-blur-md">
        <div class="flex flex-col items-center gap-4">
          <div
            class="w-16 h-16 flex items-center justify-center p-2 bg-white rounded-2xl shadow-sm border border-surface-100 transition-all hover:scale-110 hover:rotate-3"
          >
            <img
              src="/logo.png"
              alt="Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <div class="text-center">
            <h1
              class="font-bold text-lg text-surface-900 tracking-tight leading-tight"
            >
              Inovar
            </h1>
            <p
              class="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em] opacity-80"
            >
              Refrigeração
            </p>
          </div>
        </div>
      </div>

      {#if $user}
        <div class="p-4">
          <div
            class="flex items-center gap-3 p-4 rounded-2xl bg-white/60 border border-white/40 shadow-sm transition-all hover:bg-white hover:shadow-md group"
          >
            <div
              class="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200 transition-transform group-hover:scale-105"
            >
              <span class="font-bold text-lg"
                >{$user.nome_completo?.charAt(0)}</span
              >
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm text-surface-900">
                {$user.nome_completo}
              </p>
              <p
                class="text-[10px] text-surface-500 font-semibold uppercase tracking-wider"
              >
                {$user.cargo}
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#key currentPath}
        <nav
          class="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar"
        >
          <p
            class="px-4 py-2 text-[10px] font-bold text-surface-400 uppercase tracking-[0.15em]"
          >
            Menu Principal
          </p>
          {#each sections.geral as item}
            <a
              href={item.id}
              class="menu-item {item.id === '/'
                ? currentPath === '/'
                  ? 'active'
                  : ''
                : currentPath === item.id ||
                    currentPath.startsWith(item.id + '/')
                  ? 'active'
                  : ''}"
            >
              <svelte:component this={item.icon} class="w-5 h-5" />
              <span class="flex-1">{item.label}</span>
              {#if item.id === "/" ? currentPath === "/" : currentPath === item.id || currentPath.startsWith(item.id + "/")}
                <div
                  class="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-sm shadow-brand-200"
                ></div>
              {/if}
            </a>
          {/each}

          <p
            class="px-4 py-2 text-[10px] font-bold text-surface-400 uppercase tracking-[0.15em] mt-6"
          >
            Administração
          </p>
          {#each sections.gestao as item}
            <a
              href={item.id}
              class="menu-item {currentPath === item.id ||
              currentPath.startsWith(item.id + '/')
                ? 'active'
                : ''}"
            >
              <svelte:component this={item.icon} class="w-5 h-5" />
              <span class="flex-1">{item.label}</span>
              {#if currentPath === item.id || currentPath.startsWith(item.id + "/")}
                <div
                  class="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-sm shadow-brand-200"
                ></div>
              {/if}
            </a>
          {/each}
        </nav>
      {/key}

      <div class="p-4 border-t border-surface-100 bg-white/20">
        <button
          on:click={handleLogout}
          class="flex items-center gap-3 w-full p-3 rounded-xl text-red-500 font-semibold text-sm hover:bg-red-50 transition-all active:scale-95"
        >
          <LogOut class="w-5 h-5" />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <!-- ===== MOBILE HEADER ===== -->
      <header
        class="lg:hidden h-16 glass-strong flex items-center justify-between px-4 z-40"
      >
        <button
          on:click={() => (isMobileMenuOpen = true)}
          class="p-2 rounded-xl hover:bg-surface-100 transition-colors active:scale-90"
        >
          <Menu class="w-6 h-6 text-surface-700" />
        </button>

        <div class="flex flex-col items-center">
          <div class="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" class="w-6 h-6 object-contain" />
            <span class="font-bold text-base text-surface-900 leading-none"
              >Inovar</span
            >
          </div>
          <span
            class="text-[8px] font-bold text-brand-600 uppercase tracking-[0.2em] mt-0.5"
            >Refrigeração</span
          >
        </div>

        <button
          on:click={() => (showNotifications = !showNotifications)}
          class="p-2 rounded-xl hover:bg-surface-100 transition-colors relative active:scale-90"
        >
          <Bell class="w-6 h-6 text-surface-700" />
          {#if $unreadCount > 0}
            <span
              class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"
            ></span>
          {/if}
        </button>

        <NotificationsPanel
          isOpen={showNotifications}
          onClose={() => (showNotifications = false)}
        />
      </header>

      <!-- ===== MAIN CONTENT ===== -->
      <main class="flex-1 overflow-y-auto bg-surface-50/50">
        <div class="p-4 lg:p-8 xl:p-12 max-w-7xl mx-auto animate-in">
          <slot />
        </div>
      </main>

      <!-- ===== BOTTOM NAVIGATION (Mobile) ===== -->
      <nav
        class="lg:hidden h-20 glass-strong border-t border-surface-200 px-2 pb-safe"
      >
        <div class="flex items-center justify-around h-full">
          {#each menuItems.slice(0, 4) as item}
            <a
              href={item.id}
              class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all {isActive(
                item.id,
              )
                ? 'text-brand-600 scale-110'
                : 'text-surface-400'}"
            >
              <svelte:component this={item.icon} class="w-6 h-6" />
              <span class="text-[10px] font-bold uppercase tracking-tighter"
                >{item.label}</span
              >
            </a>
          {/each}
        </div>
      </nav>
    </div>

    <!-- ===== MOBILE MENU OVERLAY ===== -->
    {#if isMobileMenuOpen}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="fixed inset-0 bg-surface-900/60 backdrop-blur-md z-50 lg:hidden"
        on:click={() => (isMobileMenuOpen = false)}
        on:keydown={(e) => e.key === "Escape" && (isMobileMenuOpen = false)}
        role="button"
        tabindex="0"
      ></div>
    {/if}

    <!-- ===== MOBILE MENU DRAWER ===== -->
    <div
      class="fixed top-0 left-0 w-80 max-w-[85vw] bg-white z-50 flex flex-col transform transition-transform duration-500 cubic-bezier(0.23, 1, 0.32, 1) {isMobileMenuOpen
        ? 'translate-x-0'
        : '-translate-x-full'} lg:hidden h-full shadow-2xl"
    >
      <div
        class="flex items-center justify-between p-6 border-b border-surface-100 bg-surface-50/30"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-100 border border-surface-50 p-1.5"
          >
            <img
              src="/logo.png"
              alt="Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <span class="font-bold text-xl tracking-tight">Menu</span>
        </div>
        <button
          on:click={() => (isMobileMenuOpen = false)}
          class="p-2 rounded-xl hover:bg-surface-100 transition-colors active:scale-90"
        >
          <X class="w-6 h-6 text-surface-500" />
        </button>
      </div>

      {#if $user}
        <div class="p-6 border-b border-surface-100 bg-white">
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200"
            >
              <span class="font-bold text-xl"
                >{$user.nome_completo?.charAt(0)}</span
              >
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-surface-900 truncate text-lg">
                {$user.nome_completo}
              </p>
              <p
                class="text-xs text-brand-600 font-bold uppercase tracking-widest"
              >
                {$user.cargo}
              </p>
            </div>
          </div>
        </div>
      {/if}

      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        <p
          class="px-4 py-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest"
        >
          Geral
        </p>
        {#each sections.geral as item}
          <a
            href={item.id}
            class="menu-item {isActive(item.id) ? 'active' : ''}"
            on:click={() => (isMobileMenuOpen = false)}
          >
            <svelte:component this={item.icon} class="w-5 h-5" />
            <span class="flex-1">{item.label}</span>
          </a>
        {/each}

        <p
          class="px-4 py-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-6"
        >
          Gestão
        </p>
        {#each sections.gestao as item}
          <a
            href={item.id}
            class="menu-item {isActive(item.id) ? 'active' : ''}"
            on:click={() => (isMobileMenuOpen = false)}
          >
            <svelte:component this={item.icon} class="w-5 h-5" />
            <span class="flex-1">{item.label}</span>
          </a>
        {/each}

        <div class="mt-12 pt-6 border-t border-surface-100">
          <button
            on:click={handleLogout}
            class="flex items-center gap-3 w-full p-4 rounded-2xl text-red-500 font-bold hover:bg-red-50 transition-all"
          >
            <LogOut class="w-6 h-6" />
            <span>Sair da conta</span>
          </button>
        </div>
      </nav>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 10px;
  }
  .sidebar:hover .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-surface-200);
  }
</style>
