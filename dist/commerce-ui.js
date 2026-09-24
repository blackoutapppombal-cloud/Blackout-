(() => {
  const commerce = window.BlackoutCommerce;
  if (!commerce) return;
  const paymentLabel = value => ({ pending: 'Pagamento pendente', paid: 'Pago', failed: 'Falha no pagamento', cancelled: 'Cancelado', refunded: 'Reembolsado' })[value] || value || 'Pagamento pendente';
  const orderKey = 'blackout-last-order';
  const variantCart = window.BLACKOUT_CONSOLES;
  const esc = value => html(value == null ? '' : value);
  const cartItems = () => variantCart ? variantCart.requestItems() : Object.entries(state.cart).map(([id, quantity]) => ({
    product_id: Number(id), quantity: Number(quantity)
  })).filter(item => Number.isInteger(item.product_id) && Number.isInteger(item.quantity) && item.quantity > 0);
  const cartKey = () => JSON.stringify(cartItems());
  const orderFromStorage = () => {
    try { return JSON.parse(localStorage.getItem(orderKey) || 'null'); } catch { return null; }
  };
  state.coupon = '';
  state.quote = null;
  state.quoteError = '';
  state.paymentMethods = [];
  state.savedAddresses = [];
  state.lastOrder = orderFromStorage();
  state.accountOrders = [];
  state.ordersLoading = Boolean(commerce.user);
  state.ordersError = '';
  state.checkoutAttempt = null;
  let quotedKey = '';
  let syncedKey = '';
  let orderFetched = '';
  let accountOrdersFetched = false;
  let accountReady = false;
  let attemptKey = '';

  async function refreshQuote(force = false) {
    if (!['cart', 'checkout'].includes(state.route) || !cartItems().length) return;
    const key = JSON.stringify([cartItems(), state.coupon, state.checkoutData.deliveryMethod || 'retirada']);
    if (!force && key === quotedKey) return;
    quotedKey = key;
    state.quote = null;
    state.quoteError = '';
    try {
      const quote = await commerce.quote(cartItems(), state.coupon, state.checkoutData.deliveryMethod || 'retirada');
      if (key === quotedKey) state.quote = quote;
    } catch (error) {
      if (key === quotedKey) state.quoteError = error.message || 'Erro de conexão.';
    }
    if (key === quotedKey && ['cart', 'checkout'].includes(state.route)) render();
  }

  cart = function () {
    const items = variantCart ? variantCart.cartLines() : cartItems().map(item => {
      const product = products.find(p => p.id === item.product_id);
      return product ? {key:String(product.id), product, quantity:item.quantity, price:Number(product.price), stock:Number(product.stock), sku:product.sku || 'BIG-' + product.id, option:''} : null;
    }).filter(Boolean);
    if (!items.length) return '<div class="empty"><h1>Seu carrinho está vazio</h1><p>Explore o catálogo e prepare seu próximo upgrade.</p><button class="primary" data-route="catalog">Ver catálogo</button></div>';
    const quote = state.quote;
    const estimated = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const rows = items.map(line => { const p=line.product,q=line.quantity; return '<div class="cart-item">' +
      '<div class="mini-art">' + (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" data-product-id="' + Number(p.id) + '">' : esc(p.icon)) + '</div>' +
      '<div><strong>' + esc(p.name) + '</strong>' + (line.option ? '<small class="cart-variant">' + esc(line.option) + '</small>' : '') + '<small class="cart-sku">Código: ' + esc(line.sku) + '</small>' +
      '<div class="price">' + money(line.price) + ' <small>cada</small></div>' +
      '<div class="qty"><button data-line-qty="' + esc(line.key) + '" data-delta="-1" aria-label="Diminuir quantidade">−</button><span>' + q + '</span><button data-line-qty="' + esc(line.key) + '" data-delta="1" aria-label="Aumentar quantidade">+</button></div>' +
      '<small>Subtotal: ' + money(line.price * q) + '</small></div><button class="remove" data-line-remove="' + esc(line.key) + '">Remover</button></div>'; }).join('');
    return '<div class="page-head"><div><h1 class="page-title">SEU CARRINHO</h1><p class="page-sub">Revise seus itens antes de avançar.</p></div></div>' +
      '<div class="cart-layout"><div>' + rows + '<button class="secondary" data-route="catalog">Continuar comprando</button></div>' +
      '<aside class="summary"><h2>Resumo</h2><div class="coupon"><input id="cart-coupon" aria-label="Cupom de desconto" placeholder="Cupom de desconto" value="' + esc(state.coupon) + '"><button data-coupon>Aplicar</button></div>' +
      (state.quoteError ? '<p class="checkout-error" role="alert">' + esc(state.quoteError) + '</p>' : '') +
      '<div class="summary-row"><span>Subtotal' + (quote ? '' : ' estimado') + '</span><b>' + money(quote ? Number(quote.subtotal) : estimated) + '</b></div>' +
      '<div class="summary-row"><span>Desconto</span><b>' + (quote ? money(Number(quote.discount_total)) : 'A validar') + '</b></div>' +
      '<div class="summary-row"><span>Frete</span><b>' + (quote ? money(Number(quote.shipping_total)) : 'A calcular') + '</b></div>' +
      '<div class="summary-row total"><span>Total</span><b>' + (quote ? money(Number(quote.total)) : 'A confirmar') + '</b></div>' +
      '<button class="primary" data-route="checkout" style="width:100%">Finalizar compra</button></aside></div>';
  };

  checkoutContent = function () {
    const data = state.checkoutData;
    const field = (key, label, type = 'text', extra = '') => '<div class="form-field"><label for="co-' + key + '">' + label + '</label><input id="co-' + key + '" data-checkout-field="' + key + '" type="' + type + '" value="' + esc(data[key]) + '" ' + extra + '></div>';
    if (state.checkoutStep === 1) return '<h2>Dados do cliente</h2><div class="form-grid">' +
      field('name', 'Nome completo', 'text', 'autocomplete="name" required') +
      field('email', 'E-mail', 'email', 'autocomplete="email" required') +
      field('phone', 'Telefone', 'tel', 'autocomplete="tel" inputmode="tel" required') + '</div>';
    if (state.checkoutStep === 2) {
      const saved = state.savedAddresses.length ? '<label for="saved-address">Endereço salvo</label><select id="saved-address" data-saved-address><option value="">Novo endereço</option>' +
        state.savedAddresses.map(a => '<option value="' + a.id + '">' + esc(a.label) + ' — ' + esc(a.street) + ', ' + esc(a.number) + '</option>').join('') + '</select>' : '';
      return '<h2>Endereço de entrega</h2><p>Necessário apenas se você escolher entrega.</p>' + saved + '<div class="form-grid">' +
        field('cep', 'CEP', 'text', 'inputmode="numeric" autocomplete="postal-code"') + field('street', 'Rua', 'text', 'autocomplete="street-address"') +
        field('number', 'Número') + field('complement', 'Complemento') + field('neighborhood', 'Bairro') +
        field('city', 'Cidade', 'text', 'autocomplete="address-level2"') + field('state', 'Estado (UF)', 'text', 'maxlength="2" autocomplete="address-level1"') +
        field('reference', 'Referência') + '</div>' +
        (commerce.user ? '<button class="secondary" type="button" data-save-address style="margin-top:12px">Salvar endereço</button>' : '');
    }
    if (state.checkoutStep === 3) return '<h2>Como você quer receber?</h2><div class="menu-list checkout-choices">' +
      '<button type="button" data-checkout-choice="delivery:entrega" class="' + (data.deliveryMethod === 'entrega' ? 'selected' : '') + '">🚚 Entrega <b>' +
      (state.storeSettings?.delivery_checkout_enabled ? 'Frete calculado na revisão' : 'Indisponível no momento') + '</b></button>' +
      '<button type="button" data-checkout-choice="delivery:retirada" class="' + (data.deliveryMethod === 'retirada' ? 'selected' : '') + '">🏪 Retirada na loja</button></div>';
    if (state.checkoutStep === 4) return '<h2>Pagamento</h2><p>O pedido ficará pendente até confirmação do pagamento pela loja.</p><div class="menu-list checkout-choices">' +
      (state.paymentMethods.length ? state.paymentMethods.map(method => '<button type="button" data-checkout-choice="payment:' + esc(method.code) + '" class="' +
      (data.paymentMethod === method.code ? 'selected' : '') + '">' + esc(method.label) + '</button>').join('') :
      '<p>Métodos de pagamento indisponíveis. Tente novamente.</p>') + '</div>';
    if (state.checkoutStep === 5) {
      const quote = state.quote;
      return '<h2>Revise seu pedido</h2><p>' + esc(data.name) + ' · ' + esc(data.email) + '</p>' +
        '<p>' + (data.deliveryMethod === 'retirada' ? 'Retirada na loja' : 'Entrega: ' + esc(data.street) + ', ' + esc(data.number) + ' — ' + esc(data.city) + '/' + esc(data.state)) + '</p>' +
        '<p>Pagamento: ' + esc(state.paymentMethods.find(m => m.code === data.paymentMethod)?.label || data.paymentMethod) + '</p>' +
        (state.quoteError ? '<p class="checkout-error" role="alert">' + esc(state.quoteError) + '</p>' : '') +
        (quote ? '<div class="summary-row"><span>Subtotal</span><b>' + money(Number(quote.subtotal)) + '</b></div>' +
          '<div class="summary-row"><span>Desconto</span><b>' + money(Number(quote.discount_total)) + '</b></div>' +
          '<div class="summary-row"><span>Frete</span><b>' + money(Number(quote.shipping_total)) + '</b></div>' +
          '<div class="summary-row total"><span>Total</span><b>' + money(Number(quote.total)) + '</b></div>' :
          '<p>Calculando preço e estoque oficiais...</p>') + '<p>Pagamento pendente de confirmação.</p>';
    }
    const order = state.lastOrder;
    return '<div class="empty"><h2>PEDIDO REALIZADO</h2><p>Número: <strong>' + esc(order?.order_number) + '</strong></p>' +
      '<p>Entrega: ' + (order?.delivery_method === 'retirada' ? 'Retirada na loja' : 'Entrega') + '</p>' +
      '<p>Pagamento: ' + esc(order?.payment_method) + '</p><p>Status: ' + esc(paymentLabel(order?.payment_status)) + '</p>' +
      '<p>Total: <strong>' + money(Number(order?.total || 0)) + '</strong></p>' +
      '<div class="order-items">' + (order?.items || []).map(item => '<p>' + esc(item.name) + (item.variant_value ? ' · ' + esc(item.variant_value) : '') + ' · ' + esc(item.sku) + ' · ' + item.quantity + ' × ' + money(Number(item.unit_price)) + '</p>').join('') + '</div></div>';
  };

  validateCheckoutStep = function () {
    const data = state.checkoutData;
    if (state.checkoutStep === 1) {
      if (String(data.name || '').trim().length < 2) return showCheckoutError('Informe seu nome completo.', 'name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || '').trim())) return showCheckoutError('Informe um e-mail válido.', 'email');
      const phone = String(data.phone || '').replace(/\D/g, '');
      if (phone.length < 10 || phone.length > 11) return showCheckoutError('Informe um telefone válido.', 'phone');
    }
    if (state.checkoutStep === 3) {
      if (!data.deliveryMethod) return showCheckoutError('Escolha entrega ou retirada.');
      if (data.deliveryMethod === 'entrega') {
        if (!state.storeSettings?.delivery_checkout_enabled) return showCheckoutError('Entrega indisponível no momento. Escolha retirada na loja.');
        const valid = String(data.cep || '').replace(/\D/g, '').length === 8 && String(data.street || '').trim() &&
          String(data.number || '').trim() && String(data.neighborhood || '').trim() && String(data.city || '').trim() &&
          /^[A-Z]{2}$/.test(String(data.state || '').toUpperCase());
        if (!valid) { state.checkoutStep = 2; render(); return showCheckoutError('Preencha o endereço completo para entrega.', 'cep'); }
      }
    }
    if (state.checkoutStep === 4 && !state.paymentMethods.some(m => m.code === data.paymentMethod)) return showCheckoutError('Escolha uma forma de pagamento disponível.');
    if (state.checkoutStep === 5 && !state.quote) return showCheckoutError(state.quoteError || 'Aguarde a validação de preço e estoque.');
    return true;
  };

  orders = function () {
    const order = state.lastOrder || state.accountOrders[0];
    if (!order && (state.ordersLoading || (commerce.user && !accountOrdersFetched))) return '<div class="page-head"><h1 class="page-title">Seus pedidos</h1></div><div class="order-skeleton" aria-label="Carregando pedidos"><span></span><span></span><span></span></div>';
    if (!order && state.ordersError) return '<div class="empty"><h1>Seus pedidos</h1><p>' + esc(state.ordersError) + '</p><button class="primary" data-retry-orders>Tentar novamente</button></div>';
    if (!order) return '<div class="empty"><h1>Seus pedidos</h1><p>Nenhum pedido disponível neste aparelho.</p><button class="primary" data-route="catalog">Ver catálogo</button></div>';
    return '<div class="page-head"><div><h1 class="page-title">PEDIDO #' + esc(order.order_number) + '</h1><p class="page-sub">Acompanhe o pedido realizado.</p></div><span class="status-pill">' + esc(paymentLabel(order.payment_status)) + '</span></div>' +
      '<section class="summary" style="position:static;max-width:700px"><div class="summary-row"><span>Entrega</span><b>' + (order.delivery_method === 'retirada' ? 'Retirada na loja' : 'Entrega') + '</b></div>' +
      '<div class="summary-row"><span>Pagamento</span><b>' + esc(order.payment_method) + '</b></div><div class="summary-row"><span>Status</span><b>' + esc(order.status || 'recebido') + '</b></div>' +
      (order.items || []).map(item => '<div class="summary-row"><span>' + esc(item.name) + (item.variant_value ? ' · ' + esc(item.variant_value) : '') + ' · ' + esc(item.sku) + ' × ' + item.quantity + '</span><b>' + money(Number(item.subtotal || 0)) + '</b></div>').join('') +
      '<div class="summary-row total"><span>Total</span><b>' + money(Number(order.total || 0)) + '</b></div></section>';
  };

  profile = function () {
    if (commerce.user) return '<div class="profile-card"><div class="avatar">👤</div><div><h2 style="margin:0">Minha conta</h2><p style="margin:5px 0;color:#91a1ab">' +
      esc(commerce.user.email) + '</p></div><button class="secondary" data-auth-logout>Sair</button></div><div class="menu-list"><button data-route="orders">Meus pedidos <span>›</span></button><button data-route="cart">Meu carrinho <span>›</span></button></div>';
    return '<div class="profile-card"><div class="avatar">👤</div><div><h2 style="margin:0">Minha conta</h2><p style="margin:5px 0;color:#91a1ab">Entre para sincronizar o carrinho e salvar endereços.</p></div></div>' +
      '<section class="summary" style="position:static;max-width:500px;margin:20px auto"><h2>Entrar ou criar conta</h2><div class="form-grid"><div class="form-field"><label for="auth-email">E-mail</label><input id="auth-email" type="email" autocomplete="email"></div><div class="form-field"><label for="auth-password">Senha</label><input id="auth-password" type="password" autocomplete="current-password"></div></div>' +
      '<p id="auth-error" class="checkout-error" role="alert" hidden></p><div class="detail-actions" style="margin-top:16px"><button class="primary" data-auth="login">Entrar</button><button class="secondary" data-auth="signup">Criar conta</button></div></section>';
  };

  async function syncAccountCart() {
    if (!commerce.user) return;
    try {
      const remote = await commerce.loadCart();
      for (const [key, quantity] of Object.entries(remote || {})) {
        const line = variantCart?.lineForKey(key, quantity);
        const product = line?.product || products.find(p => p.id === Number(key));
        const available = line?.stock ?? product?.stock;
        state.cart[key] = product ? Math.min(Number(available), Math.max(Number(state.cart[key] || 0), Number(quantity) || 0)) : Math.max(Number(state.cart[key] || 0), Number(quantity) || 0);
      }
      state.cart = Object.fromEntries(Object.entries(state.cart).filter(([, quantity]) => quantity > 0));
      localStorage.setItem('blackout-cart', JSON.stringify(state.cart));
      await commerce.saveCart(state.cart);
      syncedKey = cartKey();
      state.savedAddresses = await commerce.addresses();
      accountOrdersFetched = false;
      accountReady = true;
      updateCart();
      render();
    } catch (error) { console.warn('Sincronização de conta indisponível:', error.message); }
  }

  async function refreshOrder() {
    if (commerce.user && !accountOrdersFetched) {
      accountOrdersFetched = true;
      state.ordersLoading = true;
      state.ordersError = '';
      try {
        state.accountOrders = await commerce.orders();
      } catch (error) { state.ordersError = error.message || 'Não foi possível carregar seus pedidos.'; console.warn('Histórico indisponível:', error.message); }
      finally { state.ordersLoading = false; if (state.route === 'orders') render(); }
    }
    const order = state.lastOrder;
    if (!order?.order_number || !order?.tracking_token || orderFetched === order.order_number) return;
    orderFetched = order.order_number;
    try {
      const fresh = await commerce.getOrder(order.order_number, order.tracking_token);
      if (fresh) {
        state.lastOrder = { ...order, ...fresh };
        localStorage.setItem(orderKey, JSON.stringify(state.lastOrder));
        if (state.route === 'orders') render();
      }
    } catch (error) { orderFetched = ''; console.warn('Acompanhamento indisponível:', error.message); }
  }

  const oldRender = render;
  render = function (options) {
    oldRender(options);
    if (state.route === 'cart' || state.route === 'checkout') refreshQuote();
    if (state.route === 'orders') refreshOrder();
    const currentCart = cartKey();
    const currentAttempt = JSON.stringify([currentCart, state.coupon, state.checkoutData.deliveryMethod, state.checkoutData.paymentMethod]);
    if (currentAttempt !== attemptKey) { attemptKey = currentAttempt; state.checkoutAttempt = null; }
    if (commerce.user && accountReady && currentCart !== syncedKey) {
      syncedKey = currentCart;
      commerce.saveCart(state.cart).catch(error => console.warn('Carrinho da conta indisponível:', error.message));
    }
    const coupon = document.querySelector('[data-coupon]');
    if (coupon) coupon.onclick = () => {
      state.coupon = document.querySelector('#cart-coupon')?.value.trim().toUpperCase() || '';
      refreshQuote(true);
    };
    document.querySelector('[data-saved-address]')?.addEventListener('change', event => {
      const address = state.savedAddresses.find(a => String(a.id) === event.target.value);
      if (!address) return;
      for (const key of ['cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'reference'])
        state.checkoutData[key] = address[key] || '';
      render();
    });
    document.querySelector('[data-save-address]')?.addEventListener('click', async () => {
      const d = state.checkoutData;
      try {
        await commerce.saveAddress({ label: 'Endereço', cep: d.cep, street: d.street, number: d.number,
          complement: d.complement, neighborhood: d.neighborhood, city: d.city,
          state: String(d.state || '').toUpperCase(), reference: d.reference });
        state.savedAddresses = await commerce.addresses();
        toast('Endereço salvo');
      } catch (error) { showCheckoutError(error.message); }
    });
    document.querySelectorAll('[data-auth]').forEach(button => button.onclick = async () => {
      const email = document.querySelector('#auth-email')?.value.trim();
      const password = document.querySelector('#auth-password')?.value;
      button.disabled = true;
      try {
        if (button.dataset.auth === 'signup') {
          await commerce.signUp(email, password);
          toast('Confira seu e-mail para confirmar a conta.');
        } else {
          await commerce.signIn(email, password);
          await syncAccountCart();
          toast('Conta conectada');
        }
      } catch (error) {
        const node = document.querySelector('#auth-error');
        if (node) { node.textContent = error.message; node.hidden = false; }
      } finally { button.disabled = false; }
    });
    document.querySelector('[data-retry-orders]')?.addEventListener('click', () => { accountOrdersFetched = false; state.ordersLoading = true; render(); });
    document.querySelector('[data-auth-logout]')?.addEventListener('click', () => {
      commerce.signOut();
      state.savedAddresses = [];
      render();
    });
  };

  const oldAddToCart = addToCart;
  addToCart = function (...args) {
    const added = oldAddToCart(...args);
    if (added && commerce.user && accountReady) {
      syncedKey = cartKey();
      commerce.saveCart(state.cart).catch(error => console.warn('Carrinho da conta indisponível:', error.message));
    }
    return added;
  };
  const oldGo = go;
  go = function (route) {
    if (route === 'checkout' && state.checkoutStep === 6) state.checkoutStep = 1;
    oldGo(route);
  };

  window.addEventListener('click', async event => {
    const button = event.target.closest('[data-checkout]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.checkoutBusy) return;
    if (button.dataset.checkout === 'prev') { state.checkoutStep--; render({ resetScroll: true }); return; }
    if (!validateCheckoutStep()) return;
    if (state.checkoutStep < 5) { state.checkoutStep++; render({ resetScroll: true }); return; }
    state.checkoutBusy = true;
    button.disabled = true;
    button.textContent = 'Processando pedido...';
    try {
      await createOrder();
      state.checkoutStep = 6;
      state.cart = {};
      accountOrdersFetched = false;
      localStorage.setItem('blackout-cart', '{}');
      updateCart();
      quotedKey = '';
      render();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Confirmar pedido';
      showCheckoutError(error.message || 'Erro de conexão. Tente novamente.');
      toast(error.message || 'Erro de conexão. Tente novamente.');
      quotedKey = '';
      refreshQuote(true);
    } finally { state.checkoutBusy = false; }
  }, true);

  window.addEventListener('click', event => {
    if (event.target.closest('[data-remove]')) toast('Produto removido');
  });
  Promise.allSettled([commerce.methods()]).then(results => {
    if (results[0].status === 'fulfilled') state.paymentMethods = results[0].value || [];
    if (state.route === 'checkout' || state.route === 'cart') render();
  });
  if (commerce.user) syncAccountCart();
  render();
})();
