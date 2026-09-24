(() => {
  const aliases = value => String(value || '').toLocaleLowerCase('pt-BR');

  function mapProduct(row) {
    return {
      id: Number(row.id),
      name: row.name,
      category: row.category,
      subcategory: row.subcategory || '',
      condition: row.condition || 'Novo',
      status: row.product_status || (Number(row.stock) > 0 ? 'Em estoque' : 'Esgotado'),
      platform: row.platform,
      price: Number(row.price),
      sku: row.sku || `BIG-${row.id}`,
      old: Number(row.old_price || row.price),
      discount: Number(row.discount || 0),
      image: (typeof row.image_url === 'string' && row.image_url.trim()) || demoProductImages[Number(row.id)] || null,
      icon: row.icon || '🎮',
      glow: row.glow || '#ff641e',
      stock: Number(row.stock || 0),
      brand: row.brand || '',
      rating: row.rating == null ? null : Number(row.rating),
      desc: row.description || '',
      searchTerms: row.search_terms || ''
    };
  }

  loadProducts = async function () {
    state.productsLoad = 'loading';
    try {
      const rows = await supabaseRequest('products?select=*&active=eq.true&order=id.asc');
      if (!Array.isArray(rows)) throw new Error('Resposta inválida');
      products = rows.map(mapProduct);
      state.productsLoad = 'ready';
    } catch (error) {
      state.productsLoad = 'error';
      console.warn('Catálogo indisponível:', error.message);
    } finally {
      if (['home', 'catalog', 'offers', 'product'].includes(state.route)) render();
      const search = document.querySelector('#search-panel.open #global-search');
      if (search) search.dispatchEvent(new Event('input', {bubbles:true}));
    }
  };

  function subcategories(category = state.filter) {
    return [...new Set(products
      .filter(item => item.category === category)
      .map(item => item.subcategory)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  catalogList = function (offers = false) {
    let list = state.filter === 'Todos' ? products : products.filter(item => item.category === state.filter);
    if (state.filter !== 'Todos' && state.subcategory && state.subcategory !== 'Todos' && subcategories(state.filter).includes(state.subcategory)) {
      list = list.filter(item => item.subcategory === state.subcategory);
    }
    if (offers || state.catalogOnlyDiscount) list = list.filter(item => item.discount > 0);
    if (state.catalogOnlyStock) list = list.filter(item => Number(item.stock) > 0);
    const query = aliases(state.catalogSearch.trim());
    if (query) {
      list = list.filter(item => [item.name, item.brand, item.category, item.subcategory, item.platform, item.searchTerms]
        .some(value => aliases(value).includes(query)));
    }
    if (state.catalogSort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (state.catalogSort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (state.catalogSort === 'discount') list = [...list].sort((a, b) => b.discount - a.discount);
    return list;
  };

  const originalCard = card;
  card = function (item) {
    if (!item.subcategory && !item.condition) return originalCard(item);
    const visual = item.image
      ? `<img src="${html(item.image)}" alt="${html(item.name)}" loading="lazy" decoding="async">`
      : `<span class="product-fallback">${html(item.icon)}</span>`;
    const soldOut = Number(item.stock) <= 0;
    const meta = [item.condition || 'Novo', item.subcategory || item.category].filter(Boolean).join(' · ');
    return `<article class="product-card platform-default" style="--product-glow:${html(item.glow)}">${item.discount > 0 ? `<span class="badge">-${Number(item.discount)}%</span>` : ''}<button class="favorite ${state.favorites.includes(item.id) ? 'on' : ''}" data-favorite="${Number(item.id)}" aria-label="Favoritar ${html(item.name)}">${state.favorites.includes(item.id) ? '♥' : '♡'}</button><div class="product-visual ${item.image ? 'has-image' : ''}" data-product="${Number(item.id)}">${visual}</div><div class="product-info"><small class="product-platform">${html(item.platform)}</small><h3>${html(item.name)}</h3><p class="product-meta">${html(meta)} <i></i> ${html(item.brand || 'BLACKOUT')}</p><div class="price">${money(item.price)}</div>${item.old > item.price ? `<div class="old-price">${money(item.old)}</div>` : '<div class="old-price placeholder">&nbsp;</div>'}<div class="stock-inline ${soldOut ? 'out' : ''}">● ${soldOut ? 'ESGOTADO' : `${html(item.status || 'Em estoque')} · ${Number(item.stock)} ${Number(item.stock) === 1 ? 'unidade' : 'unidades'}`}</div><div class="card-actions"><button class="buy" data-add="${Number(item.id)}" ${soldOut ? 'disabled' : ''}><span>⌑</span>${soldOut ? 'Sem estoque' : 'Adicionar ao carrinho'}</button><button class="details" data-product="${Number(item.id)}" aria-label="Ver detalhes de ${html(item.name)}">›</button></div></div></article>`;
  };

  const originalCatalog = catalog;
  catalog = function (offers = false) {
    const markup = originalCatalog(offers);
    if (state.filter === 'Todos') return markup;
    const values = subcategories(state.filter);
    if (!values.length) return markup;
    if (!values.includes(state.subcategory)) state.subcategory = 'Todos';
    const row = `<div class="catalog-subfilter-row" aria-label="Subcategorias de ${html(state.filter)}"><span>${html(state.filter)}</span><button class="${state.subcategory === 'Todos' ? 'active' : ''}" data-subcategory="Todos">Todos</button>${values.map(value => `<button class="${state.subcategory === value ? 'active' : ''}" data-subcategory="${html(value)}">${html(value)}</button>`).join('')}</div>`;
    return markup.replace('<div class="catalog-tools">', `${row}<div class="catalog-tools">`);
  };

  const originalBind = bind;
  bind = function () {
    originalBind();
    document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => {
      const next = button.dataset.filter;
      if (state.filter !== next) state.subcategory = 'Todos';
      state.filter = next;
      render();
    });
    document.querySelectorAll('[data-subcategory]').forEach(button => button.onclick = () => {
      state.subcategory = button.dataset.subcategory;
      render();
    });
  };

  document.querySelector('#global-search')?.addEventListener('input', event => {
    queueMicrotask(() => {
      const query = aliases(event.target.value.trim());
      if (!query || state.productsLoad === 'loading') return;
      const hits = products.filter(item => [item.name, item.brand, item.category, item.subcategory, item.platform, item.searchTerms]
        .some(value => aliases(value).includes(query))).slice(0, 8);
      const results = document.querySelector('#search-results');
      if (!results) return;
      results.innerHTML = hits.length ? hits.map(item => `<div class="search-hit" data-search-id="${item.id}" data-search-type="Produto"><span><small>Produto · ${html(item.subcategory || item.category)}</small><br><strong>${html(item.name)}</strong></span><b>›</b></div>`).join('') : '<div class="empty">Nenhum resultado encontrado.</div>';
      results.querySelectorAll('[data-search-id]').forEach(hit => hit.onclick = () => {
        state.selected = Number(hit.dataset.searchId);
        go('product');
      });
    });
  }, true);

  state.subcategory = state.subcategory || 'Todos';
  setTimeout(() => loadProducts(), 0);
})();
