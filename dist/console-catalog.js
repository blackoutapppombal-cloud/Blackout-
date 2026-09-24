(() => {
  const consoleSeeds = [
    {
      id: 9001,
      name: 'PlayStation 4 Slim',
      category: 'Consoles',
      platform: 'PlayStation 4',
      price: 1500,
      old: 1500,
      discount: 0,
      image: './assets/console-ps4-slim-mobile.jpg',
      icon: 'PS4',
      glow: '#00a8ff',
      stock: 3,
      brand: 'PlayStation',
      rating: null,
      desc: 'Desempenho, catálogo de grandes jogos e entretenimento em um design compacto.',
      variants: [
        {id: 91001, option_name: 'Armazenamento', option_value: '500 GB', price: 1500, stock: 2, sku: 'BIG-PS4-SLIM-500GB', active: true, sort_order: 1},
        {id: 91002, option_name: 'Armazenamento', option_value: '1 TB', price: 1700, stock: 1, sku: 'BIG-PS4-SLIM-1TB', active: true, sort_order: 2}
      ],
      features: ['Grandes jogos exclusivos', 'Ótimo desempenho', 'Online e multiplayer', 'Fácil de configurar']
    },
    {
      id: 2,
      name: 'Nintendo Switch Lite',
      category: 'Consoles',
      platform: 'Nintendo Switch',
      price: 1300,
      old: 1300,
      discount: 0,
      image: './assets/console-switch-lite-mobile.jpg',
      icon: 'SW',
      glow: '#ff342e',
      stock: 2,
      sku: 'BIG-SWITCH-LITE',
      brand: 'Nintendo',
      rating: null,
      desc: 'Leve, portátil e pronto para jogar onde você quiser.',
      variants: [],
      features: ['Portátil e leve', 'Jogue onde quiser', 'Bateria de longa duração', 'Ideal para viagens']
    },
    {
      id: 9002,
      name: 'PlayStation 2 Slim',
      category: 'Consoles',
      platform: 'PlayStation 2',
      price: 400,
      old: 400,
      discount: 0,
      image: './assets/console-ps2-slim-mobile.jpg',
      icon: 'PS2',
      glow: '#00a8ff',
      stock: 3,
      sku: 'BIG-PS2-SLIM',
      brand: 'PlayStation',
      rating: null,
      desc: 'Compacto e pronto para jogar, com acessórios e jogos inclusos.',
      variants: [],
      included: ['1 controle', 'Memory Card', 'Pendrive 16 GB com jogos'],
      features: ['Centenas de jogos clássicos', 'Fácil de instalar', 'Já vai com jogos', 'Diversão garantida']
    }
  ];

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matchesSeed = (product, seed) => {
    const name = normalize(product?.name);
    if (seed.id === 9001) return /playstation 4|ps4/.test(name) && /slim/.test(name);
    if (seed.id === 9002) return /playstation 2|ps2/.test(name) && /slim/.test(name);
    return /nintendo switch lite/.test(name);
  };
  const cleanVariant = item => ({
    id: Number(item.id),
    option_name: item.option_name || 'Opção',
    option_value: item.option_value || '',
    price: Number(item.price || 0),
    stock: Number(item.stock || 0),
    sku: item.sku || '',
    active: item.active !== false,
    sort_order: Number(item.sort_order || 0)
  });
  let remoteVariants = [];
  let cartMigrated = false;
  state.variantSelections = state.variantSelections || {};

  function variantsFor(product, seed) {
    const remote = remoteVariants.filter(item => Number(item.product_id) === Number(product.id) && item.active !== false).map(cleanVariant);
    return (remote.length ? remote : seed.variants).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  function ensureConsoleProducts() {
    const current = Array.isArray(products) ? products : [];
    const otherProducts = current.filter(item => item.category !== 'Consoles');
    const currentConsoles = current.filter(item => item.category === 'Consoles');
    const consoles = consoleSeeds.map(seed => {
      const existing = currentConsoles.find(item => matchesSeed(item, seed));
      const product = {...seed, ...(existing || {})};
      product.name = seed.name;
      product.category = 'Consoles';
      product.platform = seed.platform;
      product.price = seed.price;
      product.old = seed.old;
      product.discount = 0;
      product.stock = seed.stock;
      product.sku = existing?.sku || seed.sku || `BIG-${product.id}`;
      product.image = seed.image;
      product.desc = existing?.desc || seed.desc;
      product.included = seed.included || [];
      product.features = seed.features;
      product.variants = variantsFor(product, seed);
      if (product.variants.length) {
        product.price = Math.min(...product.variants.map(item => item.price));
        product.stock = product.variants.reduce((sum, item) => sum + item.stock, 0);
      }
      return product;
    });
    products = [...otherProducts, ...consoles];
    migrateVariantCart();
  }

  function selectedVariant(product, requestedId = null) {
    const variants = (product?.variants || []).filter(item => item.active !== false);
    if (!variants.length) return null;
    const id = Number(requestedId || state.variantSelections[product.id]);
    const variant = variants.find(item => item.id === id) || variants[0];
    state.variantSelections[product.id] = variant.id;
    return variant;
  }

  function cartKey(product, variant = null) {
    return variant ? `${product.id}:${variant.id}` : String(product.id);
  }

  function decodeCartKey(key) {
    const [productId, variantId] = String(key).split(':').map(Number);
    return {productId, variantId: Number.isInteger(variantId) ? variantId : null};
  }

  function lineForKey(key, quantity = state.cart[key]) {
    const {productId, variantId} = decodeCartKey(key);
    const product = products.find(item => item.id === productId);
    if (!product) return null;
    const variant = variantId ? (product.variants || []).find(item => item.id === variantId) : selectedVariant(product);
    return {
      key: String(key),
      product,
      variant,
      quantity: Number(quantity || 0),
      price: Number(variant?.price ?? product.price),
      stock: Number(variant?.stock ?? product.stock),
      sku: variant?.sku || product.sku || `BIG-${product.id}`,
      option: variant ? `${variant.option_name}: ${variant.option_value}` : ''
    };
  }

  function cartLines() {
    return Object.entries(state.cart).map(([key, quantity]) => lineForKey(key, quantity)).filter(line => line && Number.isInteger(line.quantity) && line.quantity > 0);
  }

  function requestItems() {
    return cartLines().map(line => ({
      product_id: Number(line.product.id),
      ...(line.variant ? {variant_id: Number(line.variant.id)} : {}),
      quantity: line.quantity
    }));
  }

  function migrateVariantCart() {
    if (cartMigrated) return;
    let changed = false;
    Object.entries({...state.cart}).forEach(([key, quantity]) => {
      if (key.includes(':')) return;
      const product = products.find(item => item.id === Number(key));
      const variant = selectedVariant(product);
      if (!variant) return;
      const nextKey = cartKey(product, variant);
      state.cart[nextKey] = Number(state.cart[nextKey] || 0) + Number(quantity || 0);
      delete state.cart[key];
      changed = true;
    });
    cartMigrated = true;
    if (changed) save();
  }

  function variantOptions(product, selected, context = 'card') {
    if (!product.variants?.length) return '';
    const label = selected?.option_name || product.variants[0].option_name;
    return `<div class="console-variants ${context === 'detail' ? 'detail-variants' : ''}"><span>${html(label)}:</span><div role="group" aria-label="${html(label)}">${product.variants.map(variant => `<button type="button" class="console-variant ${selected?.id === variant.id ? 'active' : ''}" data-console-variant="${product.id}:${variant.id}" aria-pressed="${selected?.id === variant.id}">${html(variant.option_value)}${selected?.id === variant.id ? '<b aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></div>`;
  }

  function consoleCard(product) {
    const variant = selectedVariant(product);
    const price = Number(variant?.price ?? product.price);
    const stock = Number(variant?.stock ?? product.stock);
    const visual = product.image ? `<img src="${html(product.image)}" alt="${html(product.name)}" loading="eager" decoding="async">` : `<span class="console-fallback">${html(product.icon)}</span>`;
    const included = product.included?.length ? `<div class="console-included"><strong>ACOMPANHA:</strong>${product.included.map((item, index) => `<span><i>${index === 0 ? '◉' : index === 1 ? '▣' : '◆'}</i>${html(item)}</span>`).join('')}</div>` : '';
    return `<article class="console-card" data-console-card="${product.id}" style="--console-accent:${html(product.glow)}">
      <button class="favorite ${state.favorites.includes(product.id) ? 'on' : ''}" data-favorite="${product.id}" aria-label="Favoritar ${html(product.name)}">${state.favorites.includes(product.id) ? '♥' : '♡'}</button>
      <div class="console-brand"><span>${html(product.platform)}</span><b>BLACKOUT <em>INFOR GAMES</em></b></div>
      <button class="console-media" type="button" data-product="${product.id}" aria-label="Ver detalhes de ${html(product.name)}">${visual}</button>
      <div class="console-copy"><h3>${html(product.name)}</h3><p>${html(product.desc)}</p>${variantOptions(product, variant)}${included}
        <div class="console-commerce"><div><div class="console-price" data-console-price>${money(price)}</div><span class="console-stock ${stock > 0 ? '' : 'out'}" data-console-stock>● ${stock > 0 ? `Em estoque · ${stock} ${stock === 1 ? 'unidade' : 'unidades'}` : 'Sem estoque'}</span></div></div>
        <div class="console-features">${product.features.map(item => `<span><i>✓</i>${html(item)}</span>`).join('')}</div>
        <button class="console-add" data-add="${product.id}" ${stock <= 0 ? 'disabled' : ''}><span aria-hidden="true">🛒</span>${stock > 0 ? 'Adicionar ao carrinho' : 'Sem estoque'}</button>
      </div>
    </article>`;
  }

  const baseCard = card;
  card = product => product.category === 'Consoles' ? consoleCard(product) : baseCard(product);

  const baseProduct = product;
  product = function () {
    ensureConsoleProducts();
    const item = products.find(entry => entry.id === state.selected) || products[0];
    if (item?.category !== 'Consoles') return baseProduct();
    const variant = selectedVariant(item);
    const price = Number(variant?.price ?? item.price);
    const stock = Number(variant?.stock ?? item.stock);
    const visual = item.image ? `<img src="${html(item.image)}" alt="${html(item.name)}" data-product-id="${item.id}">` : html(item.icon);
    setWhats(`Olá! Gostaria de informações sobre ${item.name}${variant ? ` ${variant.option_value}` : ''}.`);
    return `<button class="link-btn" data-route="catalog">← Voltar aos consoles</button><section class="detail section console-detail"><div class="detail-art has-image">${visual}</div><div><span class="eyebrow">${html(item.brand)} • ${html(item.platform)}</span><h1>${html(item.name)}</h1><p>${html(item.desc)}</p>${variantOptions(item, variant, 'detail')}<div class="price">${money(price)}</div><p>ou 10x de <strong>${money(price / 10)}</strong> sem juros</p><p class="stock">● ${stock > 0 ? `Em estoque — ${stock} ${stock === 1 ? 'unidade' : 'unidades'}` : 'Sem estoque'}</p>${item.included?.length ? `<div class="detail-included"><strong>Itens inclusos</strong>${item.included.map(value => `<span>✓ ${html(value)}</span>`).join('')}</div>` : ''}<div class="qty"><button data-qty="-1">−</button><span id="detail-qty">${state.detailQty}</span><button data-qty="1">+</button></div><div class="detail-actions"><button class="primary" data-buy-now="${item.id}" ${stock <= 0 ? 'disabled' : ''}>Comprar agora</button><button class="secondary" data-add="${item.id}" ${stock <= 0 ? 'disabled' : ''}>Adicionar ao carrinho</button></div><div class="tabs"><h2>Descrição e especificações</h2><div class="specs">${item.features.map(value => `<span>✓ ${html(value)}</span>`).join('')}</div></div></div></section>`;
  };

  const baseAddToCart = addToCart;
  addToCart = function (id, quantity = 1, variantId = null) {
    ensureConsoleProducts();
    const item = products.find(entry => entry.id === Number(id));
    if (!item?.variants?.length) return baseAddToCart(Number(id), quantity);
    const variant = selectedVariant(item, variantId);
    if (!variant || !Number.isInteger(quantity) || quantity < 1) return false;
    const key = cartKey(item, variant);
    const next = Number(state.cart[key] || 0) + quantity;
    if (next > variant.stock) { toast('Quantidade indisponível para esta opção'); return false; }
    state.cart[key] = next;
    save();
    return true;
  };

  const baseCreateOrder = createOrder;
  createOrder = async function () {
    if (!window.BlackoutCommerce) return baseCreateOrder();
    const data = state.checkoutData;
    if (!state.checkoutAttempt) state.checkoutAttempt = crypto.randomUUID();
    const items = requestItems();
    if (!items.length) throw new Error('Seu carrinho está vazio.');
    const address = data.deliveryMethod === 'entrega' ? {cep:data.cep,street:data.street,number:data.number,complement:data.complement,neighborhood:data.neighborhood,city:data.city,state:data.state,reference:data.reference} : null;
    const order = await window.BlackoutCommerce.place(items, state.coupon || null, data.deliveryMethod, data.paymentMethod, {name:data.name,email:data.email,phone:data.phone}, address, state.checkoutAttempt, state.quote?.total);
    state.lastOrder = order;
    localStorage.setItem('blackout-last-order', JSON.stringify(order));
    return order;
  };

  function updateCard(cardNode, item, variant) {
    cardNode.querySelectorAll('[data-console-variant]').forEach(button => {
      const active = Number(button.dataset.consoleVariant.split(':')[1]) === variant.id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      const check = button.querySelector('b');
      if (active && !check) button.insertAdjacentHTML('beforeend', '<b aria-hidden="true">✓</b>');
      if (!active && check) check.remove();
    });
    cardNode.querySelector('[data-console-price]').textContent = money(variant.price);
    const stock = cardNode.querySelector('[data-console-stock]');
    stock.textContent = variant.stock > 0 ? `● Em estoque · ${variant.stock} ${variant.stock === 1 ? 'unidade' : 'unidades'}` : '● Sem estoque';
    stock.classList.toggle('out', variant.stock <= 0);
    const add = cardNode.querySelector('[data-add]');
    add.disabled = variant.stock <= 0;
    add.innerHTML = `<span aria-hidden="true">🛒</span>${variant.stock > 0 ? 'Adicionar ao carrinho' : 'Sem estoque'}`;
  }

  const baseBind = bind;
  bind = function () {
    baseBind();
    document.querySelectorAll('[data-console-variant]').forEach(button => button.onclick = () => {
      const [productId, variantId] = button.dataset.consoleVariant.split(':').map(Number);
      const item = products.find(entry => entry.id === productId);
      const variant = selectedVariant(item, variantId);
      state.variantSelections[productId] = variantId;
      const cardNode = button.closest('[data-console-card]');
      if (cardNode) updateCard(cardNode, item, variant);
      else { state.detailQty = Math.max(1, Math.min(Number(variant.stock) || 1, state.detailQty)); render(); }
    });
    document.querySelectorAll('[data-line-qty]').forEach(button => button.onclick = () => {
      const key = button.dataset.lineQty;
      const delta = Number(button.dataset.delta);
      const line = lineForKey(key);
      if (!line) return;
      if (delta > 0 && line.quantity >= line.stock) { toast('Quantidade indisponível no estoque'); return; }
      state.cart[key] = line.quantity + delta;
    document.querySelectorAll('.console-detail [data-qty]').forEach(button => button.onclick = () => {
      const item = products.find(entry => entry.id === state.selected);
      const variant = selectedVariant(item);
      const available = Number(variant?.stock ?? item?.stock ?? 1);
      state.detailQty = Math.max(1, Math.min(available || 1, state.detailQty + Number(button.dataset.qty)));
      const value = document.querySelector('#detail-qty');
      if (value) value.textContent = state.detailQty;
    });
      if (state.cart[key] <= 0) delete state.cart[key];
      save();
      render();
    });
    document.querySelectorAll('[data-line-remove]').forEach(button => button.onclick = () => {
      delete state.cart[button.dataset.lineRemove];
      save();
      render();
    });
  };

  function decorateConsoleCatalog() {
    const page = document.querySelector('.catalog-page');
    if (!page || state.route !== 'catalog' || state.filter !== 'Consoles') return;
    page.classList.add('consoles-page');
    const hero = page.querySelector('.catalog-hero');
    if (hero) {
      hero.className = 'console-hero';
      hero.setAttribute('aria-label', 'Consoles BLACKOUT Infor Games');
      hero.innerHTML = `<div class="console-hero-copy"><span>BLACKOUT INFOR GAMES</span><h1>CONSOLES</h1><p>AS MELHORES PLATAFORMAS<br>PARA A SUA DIVERSÃO.</p><div><b>PlayStation</b><b>Nintendo</b><b>PS2</b></div></div><img src="./assets/home-category-consoles.png" alt="Consoles PlayStation e Nintendo" width="680" height="430" decoding="async" fetchpriority="high">`;
    }
    const benefits = page.querySelector('.catalog-benefits');
    if (benefits) benefits.innerHTML = '<article><span>▣</span><div><strong>PRONTA ENTREGA</strong><small>Produtos disponíveis</small></div></article><article><span>◇</span><div><strong>GARANTIA E SEGURANÇA</strong><small>Compra protegida</small></div></article><article><span>▰</span><div><strong>PARCELAMENTO</strong><small>Pagamento facilitado</small></div></article>';
  }

  const baseRender = render;
  render = function (options) {
    ensureConsoleProducts();
    baseRender(options);
    decorateConsoleCatalog();
  };

  window.BLACKOUT_CONSOLES = {cartLines, requestItems, lineForKey, selectedVariant, ensureConsoleProducts};
  ensureConsoleProducts();
  supabaseRequest('product_variants?select=*&active=eq.true&order=sort_order.asc,id.asc').then(rows => {
    if (Array.isArray(rows)) remoteVariants = rows;
    ensureConsoleProducts();
    if (['catalog', 'product', 'cart', 'checkout'].includes(state.route)) render();
  }).catch(() => {});
})();
