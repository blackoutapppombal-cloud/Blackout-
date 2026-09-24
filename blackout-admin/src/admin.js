(() => {
  const config = window.BLACKOUT_SUPABASE;
  const root = document.querySelector("#admin-root");
  const toastNode = document.querySelector("#admin-toast");
  const SESSION_KEY = "blackout-admin-session";
  const REMEMBERED_EMAIL_KEY = "blackout-admin-remembered-email";
  const modules = [
    ["dashboard", "⌂", "Dashboard"],
    ["products", "▦", "Produtos"],
    ["categories", "◇", "Categorias"],
    ["stock", "▤", "Estoque"],
    ["orders", "⬡", "Pedidos"],
    ["customers", "♙", "Clientes"],
    ["services", "⚙", "Serviços"],
    ["offers", "％", "Ofertas"],
    ["banners", "▧", "Banners / Hero"],
    ["coupons", "◇", "Cupons"],
    ["payment-methods", "◈", "Pagamentos"],
    ["quality", "✓", "Verificação da loja"],
    ["settings", "⚙", "Configurações"],
  ];
  let session = null;
  let currentUser = null;
  let dashboardPeriod = "today";
  let chartMode = "revenue";
  let dashboardTimer = null;
  let lastMetrics = null;
  let currentView = "dashboard";
  const routeByView = Object.freeze({
    dashboard: "/dashboard",
    products: "/produtos",
    categories: "/categorias",
    stock: "/estoque",
    orders: "/pedidos",
    customers: "/clientes",
    services: "/servicos",
    offers: "/ofertas",
    coupons: "/cupons",
    "payment-methods": "/pagamentos",
    banners: "/banners",
    quality: "/verificacao",
    settings: "/configuracoes",
  });
  const viewByRoute = Object.fromEntries(
    Object.entries(routeByView).map(([view, path]) => [path, view]),
  );
  const initialPath = location.pathname.replace(/\/+$/, "") || "/";
  let requestedView = viewByRoute[initialPath] || "dashboard";

  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char],
    );
  const money = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const dateTime = (value) =>
    value
      ? new Date(value).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";
  const assetUrl = (value) => {
    if (!value) return "";
    const url = String(value);
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const base = String(window.BLACKOUT_PUBLIC_SITE_URL || "").replace(
      /\/$/,
      "",
    );
    return base
      ? `${base}/${url.replace(/^\.\//, "")}`
      : `/${url.replace(/^\.\//, "")}`;
  };
  const toast = (message) => {
    toastNode.textContent = message;
    toastNode.classList.add("show");
    setTimeout(() => toastNode.classList.remove("show"), 2400);
  };

  async function request(
    path,
    { method = "GET", body, token = session?.access_token, headers = {} } = {},
  ) {
    const response = await fetch(`${config.url}${path}`, {
      method,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${token || config.publishableKey}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      const error = new Error(
        data?.msg ||
          data?.message ||
          data?.error_description ||
          "request_failed",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function persistSession(value) {
    session = value;
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  }
  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }
  function consumeAuthCallback() {
    const params = new URLSearchParams(location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return null;
    const value = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number(params.get("expires_in") || 3600),
      token_type: params.get("token_type") || "bearer",
      expires_at: Date.now() + Number(params.get("expires_in") || 3600) * 1000,
    };
    persistSession(value);
    history.replaceState({}, "", location.pathname);
    return { type: params.get("type") || "invite" };
  }
  async function refreshSession() {
    if (!session?.refresh_token) throw new Error("no_refresh_token");
    const data = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: session.refresh_token },
      token: config.publishableKey,
    });
    data.expires_at = Date.now() + Number(data.expires_in || 3600) * 1000;
    persistSession(data);
    return data;
  }
  async function getUser() {
    if (!session?.access_token) return null;
    if (session.expires_at && session.expires_at < Date.now() + 30000)
      await refreshSession();
    try {
      return await request("/auth/v1/user");
    } catch (error) {
      if (error.status === 401) {
        await refreshSession();
        return request("/auth/v1/user");
      }
      throw error;
    }
  }
  async function uploadImage(file, folder) {
    const types = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (!file || !types[file.type])
      throw new Error("Selecione uma imagem JPG, PNG ou WebP.");
    if (file.size > 5242880)
      throw new Error("A imagem deve ter no máximo 5 MB.");
    if (!["products", "banners", "services"].includes(folder))
      throw new Error("Destino de upload inválido.");
    if (!(await getUser())) throw new Error("Sessão administrativa expirada.");
    const path = `${folder}/${crypto.randomUUID()}.${types[file.type]}`;
    const response = await fetch(
      `${config.url}/storage/v1/object/blackout-media/${path}`,
      {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": file.type,
        },
        body: file,
      },
    );
    if (!response.ok)
      throw new Error(
        "Upload recusado pelo Storage. Verifique sua sessão e tente novamente.",
      );
    return `${config.url}/storage/v1/object/public/blackout-media/${path}`;
  }
  async function checkAdmin(user) {
    const rows = await request(
      `/rest/v1/admin_users?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`,
    );
    return Array.isArray(rows) && rows.length === 1;
  }

  function setPath(path, replace = true) {
    history[replace ? "replaceState" : "pushState"](
      { view: viewByRoute[path] || null },
      "",
      path,
    );
  }
  function renderLogin(message = "") {
    setPath("/login");
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
    root.innerHTML = `<section class="login-page login-reference-page">
      <div class="login-brand" aria-hidden="true"></div>
      <div class="login-panel">
        <form id="login-form" class="login-card login-reference-card">
          <span class="eyebrow">ÁREA ADMINISTRATIVA</span>
          <h2>ENTRAR NO <em>PAINEL</em></h2>
          <p>Use suas credenciais autorizadas para gerenciar a BLACKOUT INFOR GAMES.</p>
          <label class="login-control" for="admin-email">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>
            <input id="admin-email" name="email" type="email" autocomplete="username" placeholder="E-mail" value="${escapeHtml(rememberedEmail)}" required>
          </label>
          <label class="login-control" for="admin-password">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
            <input id="admin-password" name="password" type="password" autocomplete="current-password" placeholder="Senha" minlength="6" required>
            <button id="toggle-password" class="password-toggle" type="button" aria-label="Mostrar senha" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.3-5 9-5 9 5 9 5-3.3 5-9 5-9-5-9-5Z"></path><circle cx="12" cy="12" r="2.5"></circle><path class="password-slash" d="m4 4 16 16"></path></svg></button>
          </label>
          <div class="login-options">
            <label class="remember-option"><input name="remember" type="checkbox" checked><span aria-hidden="true"></span><em>Lembrar de mim</em></label>
            <button class="admin-link" id="recover-password" type="button">Esqueceu a senha?</button>
          </div>
          <button class="admin-primary login-submit" type="submit"><span>→</span><b>Entrar</b></button>
          <div id="login-error" class="form-error ${message ? "show" : ""}">${escapeHtml(message)}</div>
          <div class="login-platforms" aria-label="Plataformas atendidas"><span>PlayStation</span><span>Nintendo</span><span>Xbox</span><span>PC GAMER</span></div>
          <div class="login-card-footer"><span>BLACKOUT INFOR GAMES</span><small>TUDO PARA O SEU MUNDO GAMER</small></div>
        </form>
      </div>
    </section>`;
    document
      .querySelector("#login-form")
      .addEventListener("submit", handleLogin);
    document
      .querySelector("#recover-password")
      .addEventListener("click", handleRecovery);
    document.querySelector("#toggle-password").addEventListener("click", (event) => {
      const toggle = event.currentTarget;
      const password = document.querySelector("#admin-password");
      const visible = password.type === "text";
      password.type = visible ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!visible));
      toggle.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector(".admin-primary");
    const errorNode = form.querySelector("#login-error");
    button.disabled = true;
    button.innerHTML = "<span>↻</span><b>Entrando…</b>";
    errorNode.classList.remove("show");
    try {
      const data = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email: form.email.value.trim(), password: form.password.value },
        token: config.publishableKey,
      });
      data.expires_at = Date.now() + Number(data.expires_in || 3600) * 1000;
      persistSession(data);
      currentUser = data.user;
      if (!(await checkAdmin(currentUser))) {
        persistSession(null);
        renderUnauthorized();
        return;
      }
      if (form.remember?.checked)
        localStorage.setItem(REMEMBERED_EMAIL_KEY, form.email.value.trim());
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      renderShell();
      selectView(requestedView, { replace: true });
      toast("Acesso autorizado");
    } catch (error) {
      errorNode.textContent =
        error.status === 400
          ? "E-mail ou senha inválidos."
          : "Não foi possível entrar. Tente novamente.";
      errorNode.classList.add("show");
      button.disabled = false;
      button.innerHTML = "<span>→</span><b>Entrar</b>";
    }
  }
  async function handleRecovery() {
    const email = document.querySelector("#admin-email").value.trim();
    const errorNode = document.querySelector("#login-error");
    if (!email) {
      errorNode.textContent = "Informe seu e-mail para recuperar a senha.";
      errorNode.classList.add("show");
      return;
    }
    try {
      await request("/auth/v1/recover", {
        method: "POST",
        body: { email, redirect_to: `${location.origin}/login` },
        token: config.publishableKey,
      });
      toast("Confira seu e-mail para redefinir a senha");
    } catch {
      errorNode.textContent =
        "Não foi possível enviar a recuperação. Tente novamente.";
      errorNode.classList.add("show");
    }
  }

  function renderUnauthorized() {
    setPath("/login");
    root.innerHTML = `<section class="unauthorized"><strong>ACESSO BLOQUEADO</strong><p>Este usuário está autenticado, mas não possui permissão administrativa para acessar a operação da BLACKOUT.</p><button class="admin-primary" id="back-login">Voltar ao login</button></section>`;
    document.querySelector("#back-login").onclick = async () => {
      persistSession(null);
      renderLogin();
    };
  }
  function renderPasswordSetup(type) {
    root.innerHTML = `<section class="login-page"><div class="login-brand"><div class="brand-lockup"><span class="brand-title">BLACKOUT</span><span class="brand-sub">INFOR GAMES</span></div><div class="login-brand-copy"><span>Acesso protegido</span><h1>${type === "recovery" ? "RECUPERE SEU ACESSO" : "ATIVE SEU PAINEL"}</h1><p>Defina uma senha forte para concluir a configuração da sua conta administrativa.</p></div><div class="login-security">A senha é enviada diretamente ao Supabase e nunca passa por outro servidor.</div></div><div class="login-panel"><form id="password-form" class="login-card"><span class="eyebrow">Segurança da conta</span><h2>DEFINIR SENHA</h2><p>Use pelo menos oito caracteres.</p><div class="field"><label for="new-password">Nova senha</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="confirm-password">Confirmar senha</label><input id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></div><button class="admin-primary" type="submit">Salvar e entrar</button><div id="password-error" class="form-error"></div></form></div></section>`;
    document
      .querySelector("#password-form")
      .addEventListener("submit", handlePasswordSetup);
  }
  async function handlePasswordSetup(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorNode = form.querySelector("#password-error");
    const button = form.querySelector(".admin-primary");
    if (form.password.value !== form.confirmPassword.value) {
      errorNode.textContent = "As senhas não coincidem.";
      errorNode.classList.add("show");
      return;
    }
    button.disabled = true;
    button.textContent = "Salvando…";
    try {
      await request("/auth/v1/user", {
        method: "PUT",
        body: { password: form.password.value },
      });
      currentUser = await getUser();
      if (!(await checkAdmin(currentUser))) {
        renderUnauthorized();
        return;
      }
      renderShell();
      selectView(requestedView, { replace: true });
      toast("Senha definida e acesso liberado");
    } catch {
      errorNode.textContent =
        "Não foi possível definir a senha. Solicite um novo convite.";
      errorNode.classList.add("show");
      button.disabled = false;
      button.textContent = "Salvar e entrar";
    }
  }

  function navMarkup() {
    return modules
      .map(
        ([id, icon, label]) =>
          `<button data-admin-view="${id}" class="${id === "dashboard" ? "active" : ""}"><span>${icon}</span>${label}</button>`,
      )
      .join("");
  }
  function renderShell() {
    root.innerHTML = `<div class="sidebar-backdrop" data-close-menu></div><div class="admin-shell"><aside class="admin-sidebar"><div class="sidebar-brand"><strong>BLACKOUT</strong><small>INFOR GAMES · PAINEL ADMIN</small></div><nav class="admin-nav" aria-label="Navegação administrativa">${navMarkup()}</nav><div class="sidebar-bottom"><div class="admin-account"><strong>Administrador</strong><small>${escapeHtml(currentUser?.email || "")}</small></div><button class="signout" id="admin-signout">Sair com segurança</button></div></aside><section class="admin-main"><header class="admin-topbar"><button class="menu-toggle" aria-label="Abrir menu">☰</button><div class="topbar-title"><h1>Visão geral</h1><p>Operação BLACKOUT em tempo real</p></div><div class="topbar-actions"><button class="top-action refresh-data" aria-label="Atualizar dados" title="Atualizar dados">↻</button><span class="updated-label">Atualizado agora</span><button class="top-action notification-action" aria-label="Notificações" title="Notificações">♢</button><button class="admin-avatar" aria-label="Menu do administrador">${escapeHtml((currentUser?.email || "A").charAt(0).toUpperCase())}</button></div></header><div id="admin-content" class="admin-content">${dashboardSkeleton()}</div></section></div>`;
    bindShell();
  }
  function bindShell() {
    document.querySelector(".menu-toggle").onclick = () => toggleMenu(true);
    document.querySelector("[data-close-menu]").onclick = () =>
      toggleMenu(false);
    document.querySelector("#admin-signout").onclick = signOut;
    document.querySelector(".refresh-data").onclick = refreshCurrentView;
    document.querySelector(".notification-action").onclick = () => {
      const alerts = document.querySelector("#attention-panel");
      if (alerts)
        alerts.scrollIntoView({ behavior: "smooth", block: "center" });
      else toast("Nenhum alerta operacional");
    };
    document.querySelector(".admin-avatar").onclick = () =>
      toast(currentUser?.email || "Administrador");
    document
      .querySelectorAll("[data-admin-view]")
      .forEach(
        (button) =>
          (button.onclick = () => selectView(button.dataset.adminView)),
      );
  }
  function toggleMenu(open) {
    document.querySelector(".admin-sidebar").classList.toggle("open", open);
    document.querySelector(".sidebar-backdrop").classList.toggle("open", open);
  }
  function refreshCurrentView() {
    if (currentView === "dashboard") return loadDashboard(true);
    const catalog = window.BLACKOUT_ADMIN_CATALOG;
    if (currentView === "products" && catalog)
      return catalog.loadProducts(true);
    if (currentView === "categories" && catalog)
      return catalog.loadCategories(true);
    if (currentView === "stock" && catalog) return catalog.loadStock(true);
    const operations = window.BLACKOUT_ADMIN_OPERATIONS;
    if (currentView === "orders" && operations)
      return operations.loadOrders(true);
    if (currentView === "customers" && operations)
      return operations.loadCustomers(true);
    if (currentView === "services" && operations)
      return operations.loadServices(true);
    if (currentView === "offers" && operations)
      return operations.loadOffers(true);
    if (currentView === "coupons" && window.BLACKOUT_ADMIN_COUPONS)
      return window.BLACKOUT_ADMIN_COUPONS.loadCoupons(true);
    if (
      currentView === "payment-methods" &&
      window.BLACKOUT_ADMIN_PAYMENT_METHODS
    )
      return window.BLACKOUT_ADMIN_PAYMENT_METHODS.loadPaymentMethods(true);
    if (currentView === "banners" && operations)
      return operations.loadBanners(true);
    if (currentView === "settings" && operations)
      return operations.loadSettings(true);
    toast("Módulo indisponível");
  }
  function selectView(view, { replace = false } = {}) {
    view = routeByView[view] ? view : "dashboard";
    currentView = view;
    requestedView = view;
    setPath(routeByView[view], replace);
    toggleMenu(false);
    if (dashboardTimer) {
      clearTimeout(dashboardTimer);
      dashboardTimer = null;
    }
    document
      .querySelectorAll("[data-admin-view]")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.adminView === view),
      );
    if (view === "dashboard") {
      document.querySelector(".admin-topbar h1").textContent = "Visão geral";
      document.querySelector(".admin-topbar p").textContent =
        "Operação BLACKOUT em tempo real";
      loadDashboard();
      return;
    }
    const label = modules.find((item) => item[0] === view)?.[2] || "Módulo";
    document.querySelector(".admin-topbar h1").textContent = label;
    const catalog = window.BLACKOUT_ADMIN_CATALOG;
    if (view === "products" && catalog) {
      document.querySelector(".admin-topbar p").textContent =
        "Catálogo, preços e disponibilidade";
      catalog.loadProducts();
      return;
    }
    if (view === "categories" && catalog) {
      document.querySelector(".admin-topbar p").textContent =
        "Organização do catálogo da loja";
      catalog.loadCategories();
      return;
    }
    if (view === "stock" && catalog) {
      document.querySelector(".admin-topbar p").textContent =
        "Disponibilidade e níveis mínimos";
      catalog.loadStock();
      return;
    }
    if (view === "coupons" && window.BLACKOUT_ADMIN_COUPONS) {
      document.querySelector(".admin-topbar p").textContent =
        "Descontos e regras do checkout";
      window.BLACKOUT_ADMIN_COUPONS.loadCoupons();
      return;
    }
    if (view === "payment-methods" && window.BLACKOUT_ADMIN_PAYMENT_METHODS) {
      document.querySelector(".admin-topbar p").textContent =
        "Opções disponíveis no checkout";
      window.BLACKOUT_ADMIN_PAYMENT_METHODS.loadPaymentMethods();
      return;
    }
    const operations = window.BLACKOUT_ADMIN_OPERATIONS;
    const operationLoaders = {
      orders: "loadOrders",
      customers: "loadCustomers",
      services: "loadServices",
      offers: "loadOffers",
      banners: "loadBanners",
      settings: "loadSettings",
    };
    const subtitles = {
      orders: "Venda, pagamento e andamento",
      customers: "Relacionamento e histórico de compras",
      services: "Assistência técnica e ordens de serviço",
      offers: "Preços promocionais do catálogo",
      banners: "Campanhas visuais da vitrine",
      settings: "Dados e regras gerais da loja",
    };
    if (operations && operationLoaders[view]) {
      document.querySelector(".admin-topbar p").textContent = subtitles[view];
      operations[operationLoaders[view]]();
      return;
    }
    document.querySelector(".admin-topbar p").textContent =
      "Módulo administrativo";
    document.querySelector("#admin-content").innerHTML =
      `<section class="admin-card module-placeholder"><span>!</span><h2>MÓDULO INDISPONÍVEL</h2><p>Recarregue a página para concluir a inicialização do painel.</p></section>`;
  }
  function dashboardSkeleton() {
    return `<div class="content-head"><div><h2>CENTRAL DE COMANDO</h2><p>Carregando indicadores reais da operação…</p></div></div><div class="period-filter skeleton-period">${Array.from({ length: 4 }, () => "<span></span>").join("")}</div><div class="primary-kpi-grid">${Array.from({ length: 4 }, () => '<div class="command-kpi skeleton"><div class="skeleton-line"></div><div class="skeleton-line big"></div><div class="skeleton-line"></div></div>').join("")}</div><div class="secondary-kpi-grid">${Array.from({ length: 4 }, () => '<div class="mini-kpi skeleton"><div class="skeleton-line"></div><div class="skeleton-line big"></div></div>').join("")}</div><div class="command-grid"><div class="admin-card sales-card skeleton"><div class="skeleton-line big"></div>${Array.from({ length: 5 }, () => '<div class="skeleton-line"></div>').join("")}</div><div class="admin-card skeleton"><div class="skeleton-line big"></div>${Array.from({ length: 5 }, () => '<div class="skeleton-line"></div>').join("")}</div></div>`;
  }
  async function loadDashboard(manual = false) {
    const container = document.querySelector("#admin-content");
    if (!container) return;
    if (dashboardTimer) {
      clearTimeout(dashboardTimer);
      dashboardTimer = null;
    }
    if (!lastMetrics || manual) container.innerHTML = dashboardSkeleton();
    const refreshButton = document.querySelector(".refresh-data");
    if (refreshButton) refreshButton.classList.add("spinning");
    try {
      const [metrics, serviceRows] = await Promise.all([
        request("/rest/v1/rpc/admin_dashboard_metrics", {
          method: "POST",
          body: { period_key: dashboardPeriod },
        }),
        request("/rest/v1/service_orders?select=id,status").catch(() => []),
      ]);
      lastMetrics = metrics || {};
      if (Array.isArray(serviceRows))
        lastMetrics.services_total = serviceRows.filter(
          (item) => !["entregue", "cancelado"].includes(item.status),
        ).length;
      renderDashboard(lastMetrics);
      const label = document.querySelector(".updated-label");
      if (label) label.textContent = "Atualizado agora";
    } catch (error) {
      container.innerHTML = `<section class="admin-card module-placeholder"><span>!</span><h2>DADOS INDISPONÍVEIS</h2><p>${error.status === 404 ? "Execute a migration da central de comando para ativar os novos indicadores." : "Não foi possível carregar o dashboard. Verifique a conexão e tente novamente."}</p><button class="admin-primary" id="retry-dashboard" style="max-width:240px;margin:12px auto">Tentar novamente</button></section>`;
      document.querySelector("#retry-dashboard").onclick = () =>
        loadDashboard(true);
    } finally {
      if (refreshButton) refreshButton.classList.remove("spinning");
    }
  }
  function growthMarkup(value) {
    if (value === null || value === undefined)
      return '<span class="trend neutral">Sem base anterior</span>';
    const number = Number(value);
    const tone = number > 0 ? "up" : number < 0 ? "down" : "neutral";
    return `<span class="trend ${tone}">${number > 0 ? "↑ " : number < 0 ? "↓ " : ""}${Math.abs(number).toLocaleString("pt-BR")}% vs. período anterior</span>`;
  }
  function statusText(status) {
    return (
      {
        recebido: "Novo",
        aguardando_pagamento: "Aguardando pagamento",
        pago: "Pago",
        em_preparacao: "Em preparação",
        pronto: "Pronto",
        concluido: "Concluído",
        cancelado: "Cancelado",
      }[status] || String(status || "Não informado").replaceAll("_", " ")
    );
  }
  function chartMarkup(metrics) {
    const series = Array.isArray(metrics.sales_series)
      ? metrics.sales_series
      : [];
    const values = series.map((item) =>
      Number(chartMode === "revenue" ? item.revenue : item.orders || 0),
    );
    if (!series.length || values.every((value) => value === 0))
      return '<div class="chart-empty"><span>⌁</span><strong>Sem movimentação no período</strong><p>O gráfico será preenchido automaticamente quando houver pedidos.</p></div>';
    const width = 760,
      height = 230,
      padX = 34,
      padY = 25,
      max = Math.max(...values, 1);
    const step =
      series.length > 1 ? (width - padX * 2) / (series.length - 1) : 0;
    const points = values.map((value, index) => ({
      x: padX + index * step,
      y: height - padY - (value / max) * (height - padY * 2),
      value,
      item: series[index],
    }));
    const path = points
      .map(
        (point, index) =>
          `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" ");
    const area = `${path} L ${points.at(-1).x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;
    return `<div class="sales-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Desempenho de vendas"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c7ff" stop-opacity=".28"/><stop offset="1" stop-color="#22c7ff" stop-opacity="0"/></linearGradient></defs>${[0, 0.25, 0.5, 0.75, 1].map((ratio) => `<line x1="${padX}" x2="${width - padX}" y1="${padY + (height - padY * 2) * ratio}" y2="${padY + (height - padY * 2) * ratio}" class="chart-grid-line"/>`).join("")}<path d="${area}" fill="url(#chart-fill)"/><path d="${path}" class="chart-line"/>${points.map((point) => `<g class="chart-point"><circle cx="${point.x}" cy="${point.y}" r="5"><title>${escapeHtml(point.item.label)} — ${Number(point.item.orders || 0)} pedidos — ${money(point.item.revenue)}</title></circle></g>`).join("")}</svg><div class="chart-labels">${series.map((item, index) => (index === 0 || index === series.length - 1 || series.length <= 7 ? `<span>${escapeHtml(item.label)}</span>` : "<span></span>")).join("")}</div></div>`;
  }
  function renderDashboard(metrics) {
    const orders = Array.isArray(metrics.recent_orders)
      ? metrics.recent_orders
      : [];
    const low = Array.isArray(metrics.low_stock_products)
      ? metrics.low_stock_products
      : [];
    const top = Array.isArray(metrics.top_products) ? metrics.top_products : [];
    const alerts = Array.isArray(metrics.attention_items)
      ? metrics.attention_items
      : [];
    const periodLabels = {
      today: "Hoje",
      "7d": "7 dias",
      "30d": "30 dias",
      month: "Este mês",
    };
    document.querySelector("#admin-content").innerHTML =
      `<div class="content-head"><div><h2>CENTRAL DE COMANDO</h2><p>Vendas, pedidos e operação calculados diretamente no Supabase.</p></div><span class="date-chip">${periodLabels[dashboardPeriod]}</span></div><div class="period-filter" aria-label="Filtrar período">${Object.entries(
        periodLabels,
      )
        .map(
          ([key, label]) =>
            `<button data-period="${key}" class="${dashboardPeriod === key ? "active" : ""}">${label}</button>`,
        )
        .join(
          "",
        )}</div><div class="primary-kpi-grid"><article class="command-kpi tone-cyan"><div class="kpi-top"><span class="kpi-icon">R$</span><small>FATURAMENTO</small></div><strong>${money(metrics.revenue)}</strong>${growthMarkup(metrics.revenue_change)}</article><article class="command-kpi tone-blue"><div class="kpi-top"><span class="kpi-icon">▤</span><small>PEDIDOS</small></div><strong>${Number(metrics.orders_total || 0)}</strong>${growthMarkup(metrics.orders_change)}</article><article class="command-kpi tone-green"><div class="kpi-top"><span class="kpi-icon">◈</span><small>TICKET MÉDIO</small></div><strong>${money(metrics.average_ticket)}</strong><span class="trend neutral">Pedidos pagos no período</span></article><article class="command-kpi tone-orange"><div class="kpi-top"><span class="kpi-icon">✓</span><small>VENDAS CONCLUÍDAS</small></div><strong>${Number(metrics.completed_sales || 0)}</strong><span class="trend neutral">Pagas ou concluídas</span></article></div><div class="secondary-kpi-grid"><article class="mini-kpi warning"><span>⚠</span><div><small>ESTOQUE BAIXO</small><strong>${Number(metrics.low_stock || 0)}</strong></div></article><article class="mini-kpi info"><span>♙</span><div><small>CLIENTES</small><strong>${Number(metrics.customers_total || 0)}</strong></div></article><article class="mini-kpi success"><span>⚙</span><div><small>SERVIÇOS</small><strong>${Number(metrics.services_total || 0)}</strong></div></article><article class="mini-kpi danger"><span>⌛</span><div><small>PENDENTES</small><strong>${Number(metrics.orders_pending || 0)}</strong></div></article></div><section class="admin-card sales-card"><div class="card-head"><div><h3>Desempenho de vendas</h3><span>Dados consolidados por dia</span></div><div class="chart-switch"><button data-chart-mode="revenue" class="${chartMode === "revenue" ? "active" : ""}">Faturamento</button><button data-chart-mode="orders" class="${chartMode === "orders" ? "active" : ""}">Pedidos</button></div></div><div id="sales-chart-container">${chartMarkup(metrics)}</div></section><div class="command-grid"><section class="admin-card"><div class="card-head"><div><h3>Pedidos recentes</h3><span>Últimos ${orders.length} do período</span></div><button class="card-link" data-quick-view="orders">Ver todos</button></div>${orders.length ? `<div class="orders-table-wrap"><table class="orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Data</th></tr></thead><tbody>${orders.map((order) => `<tr data-order-id="${escapeHtml(order.id)}"><td>#${escapeHtml(order.id)}</td><td>${escapeHtml(order.customer_name)}</td><td>${money(order.total)}</td><td>${escapeHtml(order.payment_method || "Não informado")}</td><td><span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(statusText(order.status))}</span></td><td>${dateTime(order.created_at)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty-state rich-empty"><span>🛒</span><strong>Nenhum pedido recebido</strong><p>Os novos pedidos aparecerão aqui automaticamente.</p></div>'}</section><section class="admin-card"><div class="card-head"><div><h3>Estoque baixo</h3><span>${low.length} produtos exigem atenção</span></div><button class="card-link" data-quick-view="stock">Gerenciar</button></div>${low.length ? `<div class="stock-list">${low.map((product) => `<div class="stock-row ${product.stock_status === "critical" ? "critical" : ""}"><div class="product-thumb">${product.image_url ? `<img src="${escapeHtml(assetUrl(product.image_url))}" alt="">` : escapeHtml(product.name?.charAt(0) || "P")}</div><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} • Estoque ${Number(product.stock)} / Mínimo ${Number(product.stock_min)}</small></div><span class="stock-badge ${product.stock_status}">${product.stock_status === "critical" ? "Crítico" : "No mínimo"}</span></div>`).join("")}</div>` : '<div class="empty-state rich-empty"><span>✓</span><strong>Estoque saudável</strong><p>Nenhum produto chegou ao limite mínimo.</p></div>'}</section></div><div class="command-grid lower-grid"><section class="admin-card"><div class="card-head"><div><h3>Produtos mais vendidos</h3><span>Top 5 do período</span></div></div>${top.length ? `<div class="ranking-list">${top.map((product, index) => `<div class="ranking-row"><b>${index + 1}</b><div class="product-thumb">${product.image_url ? `<img src="${escapeHtml(assetUrl(product.image_url))}" alt="">` : escapeHtml(product.name?.charAt(0) || "P")}</div><div><strong>${escapeHtml(product.name)}</strong><small>${Number(product.quantity_sold || 0)} vendas</small></div><span>${money(product.revenue_generated)}</span></div>`).join("")}</div>` : '<div class="empty-state rich-empty"><span>⌁</span><strong>Ainda sem ranking</strong><p>O ranking usa somente pedidos pagos ou concluídos.</p></div>'}</section><div class="side-stack"><section class="admin-card quick-actions"><div class="card-head"><h3>Ações rápidas</h3></div><div class="quick-grid"><button data-quick-view="products">＋<span>Novo produto</span></button><button data-quick-view="orders">＋<span>Novo pedido</span></button><button data-quick-view="customers">＋<span>Novo cliente</span></button><button data-quick-view="services">＋<span>Novo serviço</span></button></div></section>${alerts.length ? `<section class="admin-card attention-panel" id="attention-panel"><div class="card-head"><h3>Requer atenção</h3><span>${alerts.length} alertas</span></div><div class="alert-list">${alerts.map((alert) => `<button data-alert-type="${escapeHtml(alert.type)}" class="alert-row ${escapeHtml(alert.level)}"><span>!</span><div><strong>${escapeHtml(alert.label)}</strong><small>${Number(alert.count)} ocorrência${Number(alert.count) === 1 ? "" : "s"}</small></div></button>`).join("")}</div></section>` : ""}</div></div>`;
    bindDashboardInteractions(metrics);
  }
  function bindDashboardInteractions(metrics) {
    document.querySelectorAll("[data-period]").forEach(
      (button) =>
        (button.onclick = () => {
          dashboardPeriod = button.dataset.period;
          lastMetrics = null;
          loadDashboard(true);
        }),
    );
    document.querySelectorAll("[data-chart-mode]").forEach(
      (button) =>
        (button.onclick = () => {
          chartMode = button.dataset.chartMode;
          document
            .querySelectorAll("[data-chart-mode]")
            .forEach((item) =>
              item.classList.toggle("active", item === button),
            );
          document.querySelector("#sales-chart-container").innerHTML =
            chartMarkup(metrics);
        }),
    );
    document
      .querySelectorAll("[data-quick-view]")
      .forEach(
        (button) =>
          (button.onclick = () => selectView(button.dataset.quickView)),
      );
    document
      .querySelectorAll("[data-order-id]")
      .forEach((row) => (row.onclick = () => selectView("orders")));
    document.querySelectorAll("[data-alert-type]").forEach(
      (button) =>
        (button.onclick = () => {
          const target = button.dataset.alertType.includes("stock")
            ? "stock"
            : "orders";
          selectView(target);
        }),
    );
    dashboardTimer = setTimeout(() => {
      if (
        document.visibilityState === "visible" &&
        document
          .querySelector('[data-admin-view="dashboard"]')
          ?.classList.contains("active")
      )
        loadDashboard();
    }, 30000);
  }
  async function signOut() {
    try {
      if (session?.access_token)
        await request("/auth/v1/logout", { method: "POST" });
    } catch {}
    persistSession(null);
    currentUser = null;
    renderLogin("Sessão encerrada com segurança.");
  }
  window.BLACKOUT_ADMIN = {
    request,
    uploadImage,
    toast,
    money,
    dateTime,
    escapeHtml,
    selectView,
  };
  async function init() {
    if (!config) {
      root.textContent = "Configuração do Supabase não encontrada.";
      return;
    }
    const callback = consumeAuthCallback();
    if (callback) {
      renderPasswordSetup(callback.type);
      return;
    }
    session = readSession();
    if (!session) {
      renderLogin();
      return;
    }
    try {
      currentUser = await getUser();
      if (!currentUser) {
        persistSession(null);
        renderLogin();
        return;
      }
      if (!(await checkAdmin(currentUser))) {
        renderUnauthorized();
        return;
      }
      renderShell();
      selectView(requestedView, { replace: true });
    } catch {
      persistSession(null);
      renderLogin("Sua sessão expirou. Entre novamente.");
    }
  }
  window.addEventListener("popstate", () => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    requestedView = viewByRoute[path] || "dashboard";
    if (!session || !currentUser) {
      renderLogin();
      return;
    }
    selectView(requestedView, { replace: true });
  });
  init();
})();
