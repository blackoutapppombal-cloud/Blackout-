(() => {
  if (window.BLACKOUT_MOBILE_CATALOG) return;

  const sortOptions = [
    ['relevance', 'Mais relevantes'],
    ['price-asc', 'Menor preço'],
    ['price-desc', 'Maior preço'],
    ['discount', 'Maior desconto']
  ];
  const preferredCategories = ['Todos', 'Consoles', 'Jogos', 'Controles', 'Acessórios', 'Periféricos'];
  const preferredSubcategories = ['Controles', 'Headsets', 'Fones Bluetooth', 'Cabos', 'Carregadores', 'Cases', 'Mouses', 'Teclados', 'Caixas de Som', 'PS4', 'PS5'];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  let sheetLayer = null;
  let sheetUsesHistory = false;
  let returnFocus = null;
  let filterDraft = null;

  state.subcategory = state.subcategory || 'Todos';
  state.catalogPlatform = state.catalogPlatform || 'Todos';
  state.catalogMaxPrice = Number.isFinite(Number(state.catalogMaxPrice)) ? Number(state.catalogMaxPrice) : null;

  function icon(name) {
    const paths = {
      Todos: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
      Consoles: '<path d="M4 8.5h16v9H4z"/><path d="M8 12v2M7 13h2M15.5 12.5h.01M18 14.5h.01"/>',
      Jogos: '<path d="M8 9h8c2.5 0 4 2.1 4.7 5.2l.3 1.4c.4 2-1.9 3.1-3.2 1.7L15.7 15H8.3l-2.1 2.3C4.9 18.7 2.6 17.6 3 15.6l.3-1.4C4 11.1 5.5 9 8 9Z"/><path d="M8 11.5v3M6.5 13h3M16.5 12.2h.01M18 14h.01"/>',
      Controles: '<path d="M8 8.5h8c2.8 0 4.4 2.5 5 6l.2 1.2c.4 2.2-2.2 3.5-3.7 1.8L15 14.8H9l-2.5 2.7c-1.5 1.7-4.1.4-3.7-1.8L3 14.5c.6-3.5 2.2-6 5-6Z"/><path d="M8 11v3M6.5 12.5h3M16 11.7h.01M18 13.5h.01"/>',
      Acessórios: '<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 12h3v7H5a1 1 0 0 1-1-1v-6ZM20 12h-3v7h2a1 1 0 0 0 1-1v-6Z"/>',
      Periféricos: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M9 13h.01M12 13h.01M15 13h.01M18 13h.01M8 16h8"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
      sort: '<path d="M8 4v16M5 7l3-3 3 3M16 20V4M13 17l3 3 3-3"/>',
      filter: '<path d="M4 5h16l-6.5 7.2V19l-3 1v-7.8L4 5Z"/>',
      chevron: '<path d="m8 10 4 4 4-4"/>',
      close: '<path d="m7 7 10 10M17 7 7 17"/>',
      reset: '<path d="M4 11a8 8 0 1 1 2.3 5.7M4 5v6h6"/>',
      check: '<path d="m6 12 4 4 8-9"/>',
      generic: '<path d="M5 7h14v10H5z"/><path d="M8 10h8M8 14h5"/>'
    };
    return '<svg class="catalog-app-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.generic) + '</svg>';
  }

  function categoryMatches(item, category) {
    if (category === 'Todos') return true;
    if (category === 'Controles') return item.category === 'Controles' || item.subcategory === 'Controles';
    if (category === 'Periféricos') return item.category === 'Periféricos' || ['Mouses', 'Teclados'].includes(item.subcategory);
    return item.category === category;
  }

  function categoryProducts(category) {
    return products.filter(item => categoryMatches(item, category));
  }

  function categoryNames() {
    const actual = [...new Set(products.map(item => item.category).filter(Boolean))];
    const result = preferredCategories.filter(name => name === 'Todos' || categoryProducts(name).length);
    actual.forEach(name => { if (!result.includes(name)) result.push(name); });
    return result;
  }

  function subcategoryNames(category) {
    if (category === 'Todos') return [];
    const values = [...new Set(categoryProducts(category).map(item => item.subcategory).filter(Boolean))]
      .filter(value => value !== category);
    return values.sort((a, b) => {
      const ai = preferredSubcategories.indexOf(a);
      const bi = preferredSubcategories.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      return a.localeCompare(b, 'pt-BR');
    });
  }

  function platformNames(category, subcategory) {
    return [...new Set(categoryProducts(category)
      .filter(item => subcategory === 'Todos' || item.subcategory === subcategory)
      .map(item => item.platform)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  function priceCeiling(category, subcategory, platform) {
    const list = categoryProducts(category || 'Todos')
      .filter(item => !subcategory || subcategory === 'Todos' || item.subcategory === subcategory)
      .filter(item => !platform || platform === 'Todos' || item.platform === platform);
    const maximum = Math.max(0, ...list.map(item => Number(item.price) || 0));
    return Math.max(100, Math.ceil(maximum / 100) * 100);
  }

  function currentMaximum() {
    const ceiling = priceCeiling(state.filter, state.subcategory, state.catalogPlatform);
    return state.catalogMaxPrice == null ? ceiling : Math.min(Number(state.catalogMaxPrice), ceiling);
  }

  function activeFilterCount() {
    let count = 0;
    if (state.filter !== 'Todos') count++;
    if (state.subcategory !== 'Todos') count++;
    if (state.catalogPlatform !== 'Todos') count++;
    if (state.catalogOnlyStock) count++;
    if (state.catalogOnlyDiscount) count++;
    if (state.catalogMaxPrice != null && currentMaximum() < priceCeiling(state.filter, state.subcategory, state.catalogPlatform)) count++;
    return count;
  }

  catalogList = function (offers) {
    let list = categoryProducts(state.filter);
    const availableSubcategories = subcategoryNames(state.filter);
    if (state.subcategory !== 'Todos' && availableSubcategories.includes(state.subcategory)) {
      list = list.filter(item => item.subcategory === state.subcategory);
    }
    if (state.catalogPlatform !== 'Todos') list = list.filter(item => item.platform === state.catalogPlatform);
    if (offers || state.catalogOnlyDiscount) list = list.filter(item => Number(item.discount) > 0);
    if (state.catalogOnlyStock) list = list.filter(item => Number(item.stock) > 0);
    if (state.catalogMaxPrice != null) list = list.filter(item => Number(item.price) <= currentMaximum());
    const query = normalize(state.catalogSearch.trim());
    if (query) {
      list = list.filter(item => [item.name, item.brand, item.category, item.subcategory, item.platform, item.searchTerms]
        .some(value => normalize(value).includes(query)));
    }
    if (state.catalogSort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (state.catalogSort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (state.catalogSort === 'discount') list = [...list].sort((a, b) => b.discount - a.discount);
    return list;
  };

  function sortLabel() {
    const found = sortOptions.find(option => option[0] === state.catalogSort);
    return found ? found[1] : sortOptions[0][1];
  }

  function categoriesMarkup() {
    return '<nav class="catalog-filter-row catalog-app-categories" aria-label="Categorias principais" role="tablist">' +
      categoryNames().map(name => '<button type="button" role="tab" aria-selected="' + (state.filter === name) + '" class="catalog-chip ' + (state.filter === name ? 'active' : '') + '" data-filter="' + html(name) + '">' + icon(name) + '<span>' + html(name) + '</span></button>').join('') +
      '</nav>';
  }

  function subcategoriesMarkup() {
    const values = subcategoryNames(state.filter);
    if (!values.length) return '';
    if (!values.includes(state.subcategory)) state.subcategory = 'Todos';
    return '<section class="catalog-subcategory-section" aria-labelledby="catalog-subcategory-title">' +
      '<div class="catalog-subcategory-title">' + icon(state.filter) + '<h2 id="catalog-subcategory-title">' + html(state.filter) + '</h2></div>' +
      '<div class="catalog-subfilter-row" role="tablist" aria-label="Subcategorias de ' + html(state.filter) + '">' +
      '<button type="button" role="tab" aria-selected="' + (state.subcategory === 'Todos') + '" class="' + (state.subcategory === 'Todos' ? 'active' : '') + '" data-subcategory="Todos">Todos</button>' +
      values.map(value => '<button type="button" role="tab" aria-selected="' + (state.subcategory === value) + '" class="' + (state.subcategory === value ? 'active' : '') + '" data-subcategory="' + html(value) + '">' + html(value) + '</button>').join('') +
      '</div></section>';
  }

  function catalogToolbarMarkup() {
    const count = activeFilterCount();
    return '<div class="catalog-tools catalog-app-tools">' +
      '<label class="catalog-search">' + icon('search') + '<input data-catalog-search type="search" value="' + html(state.catalogSearch) + '" placeholder="Buscar jogos, consoles, acessórios..." aria-label="Buscar no catálogo"></label>' +
      '<button class="catalog-sort-button" type="button" data-catalog-sort-trigger aria-haspopup="dialog">' + icon('sort') + '<span><small>Ordenar por</small><strong>' + html(sortLabel()) + '</strong></span>' + icon('chevron') + '</button>' +
      '<button class="catalog-filter-button ' + (count ? 'has-filters' : '') + '" type="button" data-catalog-filter-trigger aria-haspopup="dialog">' + icon('filter') + '<span>Filtros</span>' + (count ? '<b aria-label="' + count + ' filtros ativos">' + count + '</b>' : '') + '</button></div>';
  }

  catalog = function (offers) {
    const heroLink = storefrontBanners[2] && bannerLink(storefrontBanners[2].link_url)
      ? '<a ' + bannerAnchor(storefrontBanners[2], 'catalog', 'Abrir destaque do catálogo') + ' style="position:absolute;inset:0;z-index:2"></a>'
      : '';
    return '<section class="catalog-page"><section class="catalog-hero catalog-hero-art" aria-label="Catálogo BLACKOUT Infor Games"><h1 class="catalog-hero-title">Catálogo BLACKOUT Infor Games</h1>' +
      bannerImage(2, './assets/blackout-catalog-hero-new.png', 'Consoles, jogos e acessórios gamer com a identidade BLACKOUT Infor Games', 1609, 977, 'decoding="async" fetchpriority="high"') + heroLink + '</section>' +
      categoriesMarkup() + subcategoriesMarkup() + catalogToolbarMarkup() +
      '<div id="catalog-results">' + catalogResultsMarkup(Boolean(offers)) + '</div>' +
      '<section class="catalog-benefits"><article><span>▣</span><div><strong>ENTREGA DIGITAL</strong><small>Receba na hora</small></div></article><article><span>◇</span><div><strong>COMPRA SEGURA</strong><small>Seus dados protegidos</small></div></article><article><span>◉</span><div><strong>SUPORTE ESPECIALIZADO</strong><small>Atendimento via WhatsApp</small></div></article><article><span>⌑</span><div><strong>OFERTAS EXCLUSIVAS</strong><small>Jogos com até 70% off</small></div></article></section></section>';
  };

  function sheetShell(title, content, type) {
    return '<div class="catalog-sheet-layer is-opening" data-catalog-sheet-layer>' +
      '<button class="catalog-sheet-overlay" type="button" data-sheet-dismiss aria-label="Fechar ' + html(title) + '"></button>' +
      '<section class="catalog-bottom-sheet catalog-' + type + '-sheet" role="dialog" aria-modal="true" aria-labelledby="catalog-sheet-title">' +
      '<button class="catalog-sheet-handle" type="button" aria-label="Arraste para fechar"><span></span></button>' +
      '<header><h2 id="catalog-sheet-title">' + html(title) + '</h2><button class="catalog-sheet-close" type="button" data-sheet-dismiss aria-label="Fechar">' + icon('close') + '</button></header>' +
      '<div class="catalog-sheet-content">' + content + '</div></section></div>';
  }

  function destroySheet() {
    if (!sheetLayer) return;
    const layer = sheetLayer;
    sheetLayer = null;
    sheetUsesHistory = false;
    document.documentElement.classList.remove('catalog-sheet-open');
    layer.classList.remove('is-open');
    layer.classList.add('is-closing');
    setTimeout(() => layer.remove(), 220);
    const target = returnFocus;
    returnFocus = null;
    setTimeout(() => target && target.isConnected && target.focus({preventScroll:true}), 0);
  }

  function closeSheet(fromHistory) {
    if (!sheetLayer) return;
    if (!fromHistory && sheetUsesHistory) {
      const closingLayer = sheetLayer;
      sheetUsesHistory = false;
      history.back();
      setTimeout(() => { if (sheetLayer === closingLayer) destroySheet(); }, 350);
      return;
    }
    destroySheet();
  }

  function bindDrag(sheet) {
    const handle = sheet.querySelector('.catalog-sheet-handle');
    let startY = null;
    let distance = 0;
    handle.addEventListener('pointerdown', event => {
      startY = event.clientY;
      distance = 0;
      handle.setPointerCapture && handle.setPointerCapture(event.pointerId);
      sheet.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', event => {
      if (startY == null) return;
      distance = Math.max(0, event.clientY - startY);
      sheet.style.transform = 'translateY(' + distance + 'px)';
    });
    const release = () => {
      if (startY == null) return;
      startY = null;
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
      if (distance > 80) closeSheet(false);
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
  }

  function mountSheet(markup, trigger) {
    if (sheetLayer) destroySheet();
    returnFocus = trigger || document.activeElement;
    document.body.insertAdjacentHTML('beforeend', markup);
    const layers = document.querySelectorAll('[data-catalog-sheet-layer]');
    sheetLayer = layers[layers.length - 1];
    document.documentElement.classList.add('catalog-sheet-open');
    history.replaceState(Object.assign({}, history.state, {route:state.route, scrollY:window.scrollY}), '', location.href);
    history.pushState(Object.assign({}, history.state, {catalogSheet:true, route:state.route, scrollY:window.scrollY}), '', location.href);
    sheetUsesHistory = true;
    requestAnimationFrame(() => {
      if (!sheetLayer) return;
      sheetLayer.classList.remove('is-opening');
      sheetLayer.classList.add('is-open');
      sheetLayer.querySelector('.catalog-sheet-close').focus({preventScroll:true});
    });
    sheetLayer.querySelectorAll('[data-sheet-dismiss]').forEach(button => { button.onclick = () => closeSheet(false); });
    bindDrag(sheetLayer.querySelector('.catalog-bottom-sheet'));
    return sheetLayer;
  }

  function sortOption(value, label) {
    const selected = state.catalogSort === value;
    return '<button type="button" class="catalog-sheet-option ' + (selected ? 'selected' : '') + '" data-sort-value="' + value + '" aria-pressed="' + selected + '">' +
      '<span class="sheet-radio">' + (selected ? icon('check') : '') + '</span><strong>' + html(label) + '</strong></button>';
  }

  function openSort(trigger) {
    const content = '<div class="catalog-sort-options">' + sortOptions.map(option => sortOption(option[0], option[1])).join('') + '</div>';
    const panel = mountSheet(sheetShell('ORDENAR POR', content, 'sort'), trigger);
    panel.querySelectorAll('[data-sort-value]').forEach(button => {
      button.onclick = () => {
        state.catalogSort = button.dataset.sortValue;
        closeSheet(false);
      };
    });
  }

  function makeDraft() {
    const ceiling = priceCeiling(state.filter, state.subcategory, state.catalogPlatform);
    return {
      category: state.filter,
      subcategory: state.subcategory,
      platform: state.catalogPlatform,
      stock: Boolean(state.catalogOnlyStock),
      discount: Boolean(state.catalogOnlyDiscount),
      maxPrice: state.catalogMaxPrice == null ? ceiling : Math.min(Number(state.catalogMaxPrice), ceiling)
    };
  }

  function choiceControl(label, field, value, values, allLabel) {
    const display = value === 'Todos' ? allLabel : value;
    const choices = ['Todos'].concat(values.filter(item => item !== 'Todos'));
    return '<div class="catalog-filter-control"><span>' + html(label) + '</span>' +
      '<button type="button" class="catalog-choice-trigger" data-filter-field="' + field + '" aria-expanded="false"><strong>' + html(display) + '</strong>' + icon('chevron') + '</button>' +
      '<div class="catalog-choice-menu" data-choice-menu="' + field + '" hidden>' +
      choices.map(option => '<button type="button" class="' + (option === value ? 'selected' : '') + '" data-filter-option="' + field + '" data-filter-option-value="' + html(option) + '">' + (option === 'Todos' ? html(allLabel) : html(option)) + (option === value ? icon('check') : '') + '</button>').join('') +
      '</div></div>';
  }

  function filterContent() {
    const subs = subcategoryNames(filterDraft.category);
    if (!subs.includes(filterDraft.subcategory)) filterDraft.subcategory = 'Todos';
    const platforms = platformNames(filterDraft.category, filterDraft.subcategory);
    if (!platforms.includes(filterDraft.platform)) filterDraft.platform = 'Todos';
    const ceiling = priceCeiling(filterDraft.category, filterDraft.subcategory, filterDraft.platform);
    filterDraft.maxPrice = Math.min(Number(filterDraft.maxPrice) || ceiling, ceiling);
    const progress = Math.max(0, Math.min(100, filterDraft.maxPrice / ceiling * 100));
    return '<div class="catalog-filter-grid"><div class="catalog-filter-selects">' +
      choiceControl('Categoria', 'category', filterDraft.category, categoryNames(), 'Todos') +
      choiceControl('Subcategoria', 'subcategory', filterDraft.subcategory, subs, 'Todos') +
      choiceControl('Plataforma', 'platform', filterDraft.platform, platforms, 'Todas') +
      '</div><fieldset class="catalog-availability"><legend>Disponibilidade</legend>' +
      '<button type="button" class="catalog-check ' + (filterDraft.stock ? 'checked' : '') + '" data-filter-toggle="stock" role="checkbox" aria-checked="' + filterDraft.stock + '"><span>' + (filterDraft.stock ? icon('check') : '') + '</span>Em estoque</button>' +
      '<button type="button" class="catalog-check ' + (filterDraft.discount ? 'checked' : '') + '" data-filter-toggle="discount" role="checkbox" aria-checked="' + filterDraft.discount + '"><span>' + (filterDraft.discount ? icon('check') : '') + '</span>Somente ofertas</button>' +
      '</fieldset></div><div class="catalog-price-filter"><label for="catalog-price-range">Faixa de preço</label>' +
      '<input id="catalog-price-range" type="range" min="0" max="' + ceiling + '" step="10" value="' + filterDraft.maxPrice + '" style="--range-progress:' + progress + '%">' +
      '<div><span>' + money(0) + '</span><strong data-filter-price-value>' + money(filterDraft.maxPrice) + '</strong></div></div>' +
      '<footer class="catalog-filter-actions"><button type="button" class="catalog-clear-filters" data-clear-catalog-filters>' + icon('reset') + '<span>Limpar filtros</span></button>' +
      '<button type="button" class="catalog-apply-filters" data-apply-catalog-filters>' + icon('filter') + '<span>Aplicar filtros</span></button></footer>';
  }

  function bindFilterPanel(panel) {
    panel.querySelectorAll('[data-filter-field]').forEach(button => {
      button.onclick = () => {
        const menu = panel.querySelector('[data-choice-menu="' + button.dataset.filterField + '"]');
        const opening = menu.hidden;
        panel.querySelectorAll('.catalog-choice-menu').forEach(node => { node.hidden = true; });
        panel.querySelectorAll('[data-filter-field]').forEach(node => node.setAttribute('aria-expanded', 'false'));
        menu.hidden = !opening;
        button.setAttribute('aria-expanded', String(opening));
      };
    });
    panel.querySelectorAll('[data-filter-option]').forEach(button => {
      button.onclick = () => {
        const field = button.dataset.filterOption;
        filterDraft[field] = button.dataset.filterOptionValue;
        if (field === 'category') {
          filterDraft.subcategory = 'Todos';
          filterDraft.platform = 'Todos';
        }
        if (field === 'subcategory') filterDraft.platform = 'Todos';
        filterDraft.maxPrice = priceCeiling(filterDraft.category, filterDraft.subcategory, filterDraft.platform);
        refreshFilterPanel();
      };
    });
    panel.querySelectorAll('[data-filter-toggle]').forEach(button => {
      button.onclick = () => {
        filterDraft[button.dataset.filterToggle] = !filterDraft[button.dataset.filterToggle];
        refreshFilterPanel();
      };
    });
    const range = panel.querySelector('#catalog-price-range');
    range.oninput = () => {
      filterDraft.maxPrice = Number(range.value);
      range.style.setProperty('--range-progress', (Number(range.value) / Number(range.max) * 100) + '%');
      panel.querySelector('[data-filter-price-value]').textContent = money(filterDraft.maxPrice);
    };
    panel.querySelector('[data-clear-catalog-filters]').onclick = () => {
      filterDraft = {category:'Todos', subcategory:'Todos', platform:'Todos', stock:false, discount:false, maxPrice:priceCeiling('Todos', 'Todos', 'Todos')};
      refreshFilterPanel();
    };
    panel.querySelector('[data-apply-catalog-filters]').onclick = () => {
      const ceiling = priceCeiling(filterDraft.category, filterDraft.subcategory, filterDraft.platform);
      state.filter = filterDraft.category;
      state.subcategory = filterDraft.subcategory;
      state.catalogPlatform = filterDraft.platform;
      state.catalogOnlyStock = filterDraft.stock;
      state.catalogOnlyDiscount = filterDraft.discount;
      state.catalogMaxPrice = filterDraft.maxPrice < ceiling ? filterDraft.maxPrice : null;
      closeSheet(false);
    };
  }

  function refreshFilterPanel() {
    if (!sheetLayer) return;
    const content = sheetLayer.querySelector('.catalog-sheet-content');
    content.innerHTML = filterContent();
    bindFilterPanel(sheetLayer);
  }

  function openFilters(trigger) {
    filterDraft = makeDraft();
    const panel = mountSheet(sheetShell('FILTROS', filterContent(), 'filter'), trigger);
    bindFilterPanel(panel);
  }

  const previousBind = bind;
  bind = function () {
    previousBind();
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.onclick = () => {
        const next = button.dataset.filter;
        if (state.filter !== next) {
          state.subcategory = 'Todos';
          state.catalogPlatform = 'Todos';
          state.catalogMaxPrice = null;
        }
        state.filter = next;
        render();
      };
    });
    document.querySelectorAll('[data-subcategory]').forEach(button => {
      button.onclick = () => {
        state.subcategory = button.dataset.subcategory;
        state.catalogPlatform = 'Todos';
        state.catalogMaxPrice = null;
        render();
      };
    });
    const sortButton = document.querySelector('[data-catalog-sort-trigger]');
    if (sortButton) sortButton.onclick = () => openSort(sortButton);
    const filterButton = document.querySelector('[data-catalog-filter-trigger]');
    if (filterButton) filterButton.onclick = () => openFilters(filterButton);
    requestAnimationFrame(() => {
      const activeCategory = document.querySelector('.catalog-app-categories .active');
      const activeSubcategory = document.querySelector('.catalog-subfilter-row .active');
      if (activeCategory) activeCategory.scrollIntoView({block:'nearest', inline:'center'});
      if (activeSubcategory) activeSubcategory.scrollIntoView({block:'nearest', inline:'center'});
    });
  };

  window.addEventListener('popstate', () => { if (sheetLayer) closeSheet(true); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && sheetLayer) closeSheet(false); });

  window.BLACKOUT_MOBILE_CATALOG = {
    categoryNames,
    subcategoryNames,
    platformNames,
    priceCeiling,
    activeFilterCount,
    openSort,
    openFilters,
    closeSheet
  };

  if (['catalog', 'offers'].includes(state.route)) render();
})();
