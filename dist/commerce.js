(() => {
  const config = window.BLACKOUT_SUPABASE;
  const key = 'blackout-customer-session';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  const saveSession = value => {
    session = value;
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
    window.dispatchEvent(new Event('blackout-auth-change'));
  };
  async function timedFetch(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); }
  }
  async function refreshSession() {
    if (!session?.refresh_token) return null;
    if (session.expires_at && Date.now() < session.expires_at - 60000) return session;
    const response = await timedFetch(config.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!response.ok) { saveSession(null); return null; }
    const value = await response.json();
    saveSession({ ...value, expires_at: Date.now() + value.expires_in * 1000 });
    return session;
  }
  async function request(path, { method = 'GET', body, authenticated = false, headers = {} } = {}) {
    if (!config?.url || !config?.publishableKey) throw new Error('Conexão com a loja indisponível.');
    if (session?.refresh_token) await refreshSession();
    if (authenticated && !session?.access_token) throw new Error('Entre na sua conta.');
    const response = await timedFetch(config.url + path, {
      method,
      headers: {
        apikey: config.publishableKey,
        Authorization: 'Bearer ' + (session?.access_token || config.publishableKey),
        'Content-Type': 'application/json',
        ...headers
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!response.ok) throw new Error(data?.message || data?.error_description || 'Erro de conexão com a loja.');
    return data;
  }
  const rpc = (name, body) => request('/rest/v1/rpc/' + name, { method: 'POST', body });
  window.BlackoutCommerce = {
    get user() { return session?.user || null; },
    request, rpc,
    quote: (items, coupon, deliveryMethod) => rpc('checkout_quote', {
      p_items: items, p_coupon: coupon || null, p_delivery_method: deliveryMethod
    }),
    place: (items, coupon, deliveryMethod, paymentMethod, customer, address, attempt, expectedTotal) =>
      rpc('checkout_place_order', {
        p_items: items, p_coupon: coupon || null, p_delivery_method: deliveryMethod,
        p_payment_method: paymentMethod, p_customer: customer, p_address: address,
        p_idempotency_key: attempt, p_expected_total: expectedTotal
      }),
    getOrder: (number, token) => rpc('checkout_get_order', {
      p_order_number: number, p_tracking_token: token
    }),
    methods: () => request('/rest/v1/checkout_payment_methods?select=code,label&active=eq.true&order=created_at.asc'),
    orders: () => request('/rest/v1/orders?select=order_number,items,subtotal,discount_total,shipping_total,total,status,payment_status,delivery_method,payment_method,created_at&order=created_at.desc&limit=20', { authenticated: true }),
    settings: () => request('/rest/v1/store_settings?select=store_name,support_phone,whatsapp,support_email,address,business_hours,instagram,delivery_checkout_enabled,delivery_fee,free_shipping_min,maintenance_mode&id=eq.1'),
    async signIn(email, password) {
      const value = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
      saveSession({ ...value, expires_at: Date.now() + value.expires_in * 1000 });
      return value.user;
    },
    async signUp(email, password) {
      return request('/auth/v1/signup', { method: 'POST', body: { email, password } });
    },
    signOut() { saveSession(null); },
    async loadCart() {
      if (!session?.user) return null;
      const rows = await request('/rest/v1/customer_carts?select=items&user_id=eq.' + session.user.id, { authenticated: true });
      return rows?.[0]?.items || {};
    },
    async saveCart(items) {
      if (!session?.user) return;
      return request('/rest/v1/customer_carts?on_conflict=user_id', {
        method: 'POST', authenticated: true,
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: { user_id: session.user.id, items, updated_at: new Date().toISOString() }
      });
    },
    async addresses() {
      if (!session?.user) return [];
      return request('/rest/v1/customer_addresses?select=*&user_id=eq.' + session.user.id + '&order=created_at.desc', { authenticated: true });
    },
    async saveAddress(address) {
      if (!session?.user) return;
      return request('/rest/v1/customer_addresses', {
        method: 'POST', authenticated: true, headers: { Prefer: 'return=representation' },
        body: { user_id: session.user.id, ...address }
      });
    }
  };
})();
