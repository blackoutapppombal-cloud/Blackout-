(() => {
  const state = {
    products: [],
    categories: [],
    search: '',
    category: 'all',
    status: 'all',
    stockSearch: '',
    stockFilter: 'all'
  };

  const api = () => window.BLACKOUT_ADMIN;
  const content = () => document.querySelector('#admin-content');
  const escapeHtml = value => api().escapeHtml(value);
  const money = value => api().money(value);
  const assetUrl = value => {
    if (!value) return '';
    const url = String(value);
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const base = String(window.BLACKOUT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    return base ? `${base}/${url.replace(/^\.\//, '')}` : `/${url.replace(/^\.\//, '')}`;
  };
  const slugify = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  function moduleSkeleton(title) {
    return `<div class="module-head"><div><h2>${title}</h2><p>Carregando dados do Supabase…</p></div></div><div class="catalog-stats">${Array.from({length:4},()=>'<div class="catalog-stat skeleton"><div class="skeleton-line"></div><div class="skeleton-line big"></div></div>').join('')}</div><section class="admin-card catalog-panel skeleton">${Array.from({length:7},()=>'<div class="skeleton-line"></div>').join('')}</section>`;
  }

  function moduleError(title, message, retry) {
    content().innerHTML = `<section class="admin-card module-placeholder"><span>!</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><button class="admin-primary" id="catalog-retry">Tentar novamente</button></section>`;
    document.querySelector('#catalog-retry').onclick = retry;
  }

  async function fetchProducts() {
    const rows = await api().request('/rest/v1/products?select=*&order=updated_at.desc,id.desc');
    state.products = Array.isArray(rows) ? rows : [];
    return state.products;
  }

  async function fetchCategories(allowMissing = false) {
    try {
      const rows = await api().request('/rest/v1/categories?select=*&order=sort_order.asc,name.asc');
      state.categories = Array.isArray(rows) ? rows : [];
    } catch (error) {
      if (!allowMissing) throw error;
      state.categories = [];
    }
    return state.categories;
  }

  function categoryOptions(selected = '') {
    const names = [...new Set([
      ...state.categories.map(item => item.name),
      ...state.products.map(item => item.category),
      selected
    ].filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
    return names.map(name => `<option value="${escapeHtml(name)}" ${name===selected?'selected':''}>${escapeHtml(name)}</option>`).join('');
  }

  function productImage(product) {
    const url = assetUrl(product.image_url);
    return url ? `<img src="${escapeHtml(url)}" alt="">` : `<span>${escapeHtml(product.icon || '🎮')}</span>`;
  }

  function stockState(product) {
    const stock = Number(product.stock || 0);
    const minimum = Number(product.stock_min || 0);
    if (stock === 0) return ['critical', 'Sem estoque'];
    if (stock === 1) return ['warning', 'Última unidade'];
    if (stock <= minimum) return ['warning', 'Estoque baixo'];
    return ['healthy', 'Em estoque'];
  }

  function filteredProducts() {
    const needle = state.search.trim().toLocaleLowerCase('pt-BR');
    return state.products.filter(product => {
      const matchesSearch = !needle || [product.name, product.brand, product.platform, product.category, product.subcategory, product.sku, product.search_terms].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(needle));
      const matchesCategory = state.category === 'all' || product.category === state.category;
      const now = Date.now();
      const offerActive = Number(product.discount) > 0 && (!product.promotion_starts_at || new Date(product.promotion_starts_at).getTime() <= now) && (!product.promotion_ends_at || new Date(product.promotion_ends_at).getTime() >= now);
      const incomplete = !String(product.name || '').trim() || !String(product.category || '').trim() || Number(product.price) <= 0 || !String(product.description || '').trim();
      const matchesStatus = state.status === 'all'
        || (state.status === 'active' && product.active)
        || (state.status === 'inactive' && !product.active)
        || (state.status === 'offer' && offerActive)
        || (state.status === 'out' && Number(product.stock) === 0)
        || (state.status === 'low' && Number(product.stock) > 0 && Number(product.stock) <= Number(product.stock_min))
        || (state.status === 'missing-image' && !String(product.image_url || '').trim())
        || (state.status === 'incomplete' && incomplete);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  function renderProducts() {
    const products = filteredProducts();
    const active = state.products.filter(product => product.active).length;
    const low = state.products.filter(product => product.active && Number(product.stock) <= Number(product.stock_min)).length;
    const inventoryValue = state.products.reduce((total, product) => total + Number(product.price || 0) * Number(product.stock || 0), 0);
    content().innerHTML = `
      <div class="module-head"><div><span class="module-kicker">CATÁLOGO</span><h2>Produtos</h2><p>Cadastre itens e controle preço, visibilidade e disponibilidade.</p></div><button class="admin-primary compact" id="new-product">＋ Novo produto</button></div>
      <div class="catalog-stats">
        <article class="catalog-stat"><small>TOTAL</small><strong>${state.products.length}</strong><span>produtos cadastrados</span></article>
        <article class="catalog-stat"><small>ATIVOS NA LOJA</small><strong>${active}</strong><span>visíveis no catálogo</span></article>
        <article class="catalog-stat ${low?'warning':''}"><small>ESTOQUE BAIXO</small><strong>${low}</strong><span>no mínimo ou zerados</span></article>
        <article class="catalog-stat"><small>VALOR EM ESTOQUE</small><strong>${money(inventoryValue)}</strong><span>preço atual × unidades</span></article>
      </div>
      <section class="admin-card catalog-panel">
        <div class="catalog-toolbar">
          <label class="search-control"><span>⌕</span><input id="product-search" type="search" placeholder="Buscar produto, marca ou plataforma" value="${escapeHtml(state.search)}"></label>
          <select id="product-category" aria-label="Filtrar por categoria"><option value="all">Todas as categorias</option>${categoryOptions(state.category==='all'?'':state.category)}</select>
          <select id="product-status" aria-label="Filtrar por status"><option value="all" ${state.status==='all'?'selected':''}>Todos os status</option><option value="active" ${state.status==='active'?'selected':''}>Ativos</option><option value="inactive" ${state.status==='inactive'?'selected':''}>Inativos</option><option value="low" ${state.status==='low'?'selected':''}>Estoque baixo</option></select>
          <span class="result-count">${products.length} resultado${products.length===1?'':'s'}</span>
        </div>
        ${products.length ? `<div class="catalog-table-wrap"><table class="catalog-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Loja</th><th>Ações</th></tr></thead><tbody>${products.map(product => {
          const [tone,label] = stockState(product);
          return `<tr><td><div class="product-cell"><div class="catalog-thumb">${productImage(product)}</div><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand || 'Sem marca')} • ${escapeHtml(product.platform || 'Sem plataforma')}</small></div></div></td><td>${escapeHtml(product.category)}</td><td><strong>${money(product.price)}</strong>${Number(product.old_price)>Number(product.price)?`<small class="old-value">${money(product.old_price)}</small>`:''}</td><td><span class="inventory-pill ${tone}">${Number(product.stock)} • ${label}</span></td><td><button class="visibility-toggle ${product.active?'on':''}" data-product-toggle="${product.id}" aria-label="${product.active?'Desativar':'Ativar'} ${escapeHtml(product.name)}"><span></span>${product.active?'Ativo':'Inativo'}</button></td><td><button class="table-action" data-product-edit="${product.id}">Editar</button></td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty-state rich-empty"><span>⌕</span><strong>Nenhum produto encontrado</strong><p>Ajuste os filtros ou cadastre um novo produto.</p></div>'}
      </section>`;
    bindProducts();
  }

  function bindProducts() {
    document.querySelector('#new-product').onclick = () => openProductDialog();
    document.querySelector('#product-search').oninput = event => { state.search = event.target.value; renderProducts(); document.querySelector('#product-search')?.focus(); };
    document.querySelector('#product-category').onchange = event => { state.category = event.target.value; renderProducts(); };
    document.querySelector('#product-status').onchange = event => { state.status = event.target.value; renderProducts(); };
    document.querySelectorAll('[data-product-edit]').forEach(button => button.onclick = () => openProductDialog(Number(button.dataset.productEdit)));
    document.querySelectorAll('[data-product-toggle]').forEach(button => button.onclick = () => toggleProduct(Number(button.dataset.productToggle), button));
  }

  async function toggleProduct(id, button) {
    const product = state.products.find(item => Number(item.id) === id);
    if (!product) return;
    button.disabled = true;
    try {
      await api().request(`/rest/v1/products?id=eq.${id}`, {method:'PATCH', body:{active:!product.active}, headers:{Prefer:'return=minimal'}});
      product.active = !product.active;
      renderProducts();
      api().toast(product.active ? 'Produto ativado na loja' : 'Produto ocultado da loja');
    } catch {
      button.disabled = false;
      api().toast('Não foi possível atualizar o produto');
    }
  }

  function openProductDialog(id = null) {
    const product = id ? state.products.find(item => Number(item.id) === id) : null;
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog';
    dialog.innerHTML = `<form method="dialog" class="entity-form" id="product-form">
      <div class="dialog-head"><div><span class="module-kicker">${product?'EDIÇÃO':'NOVO ITEM'}</span><h2>${product?'Editar produto':'Cadastrar produto'}</h2></div><button type="button" class="dialog-close" aria-label="Fechar">×</button></div>
      <div class="form-grid">
        <label class="field wide"><span>Nome do produto</span><input name="name" value="${escapeHtml(product?.name||'')}" required></label>
        <label class="field"><span>Categoria</span><select name="category" required><option value="">Selecione</option>${categoryOptions(product?.category||'')}</select></label>
        <label class="field"><span>Marca</span><input name="brand" value="${escapeHtml(product?.brand||'')}"></label>
        <label class="field"><span>Plataforma</span><input name="platform" value="${escapeHtml(product?.platform||'')}"></label>
        <label class="field"><span>Preço atual</span><input name="price" type="number" min="0" step="0.01" value="${product?.price??''}" required></label>
        <label class="field"><span>Preço anterior</span><input name="old_price" type="number" min="0" step="0.01" value="${product?.old_price??''}"></label>
        <label class="field"><span>Desconto (%)</span><input name="discount" type="number" min="0" max="100" step="1" value="${product?.discount??0}"></label>
        <label class="field"><span>Estoque atual</span><input name="stock" type="number" min="0" step="1" value="${product?.stock??0}" required></label>
        <label class="field"><span>Estoque mínimo</span><input name="stock_min" type="number" min="0" step="1" value="${product?.stock_min??3}" required></label>
        <label class="field wide"><span>Imagem (URL ou caminho em assets)</span><input name="image_url" value="${escapeHtml(product?.image_url||'')}" placeholder="./assets/produto.png"></label>
        <label class="field wide"><span>Enviar imagem do dispositivo (JPG, PNG ou WebP; até 5 MB)</span><input name="image_file" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <label class="field"><span>Ícone</span><input name="icon" value="${escapeHtml(product?.icon||'🎮')}" maxlength="8"></label>
        <label class="field"><span>Cor de destaque</span><input name="glow" type="color" value="${escapeHtml(product?.glow||'#ff641e')}"></label>
        <label class="field wide"><span>Descrição</span><textarea name="description" rows="4">${escapeHtml(product?.description||'')}</textarea></label>
        <label class="check-field wide"><input name="active" type="checkbox" ${product?.active!==false?'checked':''}><span>Produto visível na loja</span></label>
      </div>
      <div class="form-error" id="product-form-error"></div>
      <div class="dialog-actions"><button type="button" class="secondary-action dialog-cancel">Cancelar</button><button type="submit" class="admin-primary compact">${product?'Salvar alterações':'Cadastrar produto'}</button></div>
    </form>`;
    document.body.appendChild(dialog);
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('.dialog-close').onclick = close;
    dialog.querySelector('.dialog-cancel').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.querySelector('#product-form').onsubmit = event => saveProduct(event, product, close);
    dialog.showModal();
  }

  async function saveProduct(event, product, close) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const errorNode = form.querySelector('#product-form-error');
    const values = new FormData(form);
    const payload = {
      name: values.get('name').trim(), category: values.get('category'), brand: values.get('brand').trim(), platform: values.get('platform').trim(),
      price: Number(values.get('price')), old_price: Number(values.get('old_price') || values.get('price')), discount: Number(values.get('discount') || 0),
      stock: Number(values.get('stock')), stock_min: Number(values.get('stock_min')), image_url: values.get('image_url').trim() || null,
      icon: values.get('icon').trim() || '🎮', glow: values.get('glow') || '#ff641e', description: values.get('description').trim(), active: values.get('active') === 'on'
    };
    button.disabled = true; button.textContent = 'Salvando…'; errorNode.classList.remove('show');
    try {
      const imageFile = values.get('image_file');
      if (imageFile && imageFile.size) payload.image_url = await api().uploadImage(imageFile, 'products');
      const path = product ? `/rest/v1/products?id=eq.${product.id}` : '/rest/v1/products';
      await api().request(path, {method:product?'PATCH':'POST', body:payload, headers:{Prefer:'return=minimal'}});
      close();
      await loadProducts(true);
      api().toast(product ? 'Produto atualizado' : 'Produto cadastrado');
    } catch (error) {
      errorNode.textContent = error.status === 409 ? 'Já existe um registro com esses dados.' : (error.message && error.message !== 'request_failed' ? error.message : 'Não foi possível salvar. Confira os campos e tente novamente.');
      errorNode.classList.add('show'); button.disabled = false; button.textContent = product ? 'Salvar alterações' : 'Cadastrar produto';
    }
  }

  async function loadProducts(force = false) {
    content().innerHTML = moduleSkeleton('PRODUTOS');
    try {
      await Promise.all([fetchProducts(), fetchCategories(true)]);
      renderProducts();
      if (force) api().toast('Produtos atualizados');
    } catch {
      moduleError('PRODUTOS INDISPONÍVEIS', 'Não foi possível carregar os produtos. Verifique sua conexão e sessão administrativa.', () => loadProducts(true));
    }
  }

  function renderCategories() {
    const counts = state.products.reduce((map, product) => { map[product.category] = (map[product.category] || 0) + 1; return map; }, {});
    const active = state.categories.filter(category => category.active).length;
    content().innerHTML = `
      <div class="module-head"><div><span class="module-kicker">ORGANIZAÇÃO</span><h2>Categorias</h2><p>Organize a navegação do catálogo sem perder os produtos vinculados.</p></div><button class="admin-primary compact" id="new-category">＋ Nova categoria</button></div>
      <div class="catalog-stats category-stats"><article class="catalog-stat"><small>TOTAL</small><strong>${state.categories.length}</strong><span>categorias cadastradas</span></article><article class="catalog-stat"><small>ATIVAS</small><strong>${active}</strong><span>disponíveis para uso</span></article><article class="catalog-stat"><small>PRODUTOS ORGANIZADOS</small><strong>${state.products.filter(product=>product.category).length}</strong><span>com categoria definida</span></article></div>
      <section class="admin-card catalog-panel">
        <div class="card-head"><div><h3>Estrutura do catálogo</h3><span>Renomear atualiza automaticamente os produtos vinculados.</span></div></div>
        ${state.categories.length ? `<div class="category-grid">${state.categories.map(category => `<article class="category-card"><div class="category-icon">${escapeHtml(category.icon||'◇')}</div><div class="category-copy"><strong>${escapeHtml(category.name)}</strong><span>${counts[category.name]||0} produto${counts[category.name]===1?'':'s'}</span><small>${category.active?'Disponível':'Desativada'}</small></div><div class="category-actions"><button class="visibility-toggle ${category.active?'on':''}" data-category-toggle="${category.id}" aria-label="${category.active?'Desativar':'Ativar'} categoria"><span></span></button><button class="table-action" data-category-edit="${category.id}">Editar</button><button class="table-action danger" data-category-delete="${category.id}" ${counts[category.name]?'disabled title="Remova os produtos desta categoria antes de excluir"':''}>Excluir</button></div></article>`).join('')}</div>` : '<div class="empty-state rich-empty"><span>◇</span><strong>Nenhuma categoria cadastrada</strong><p>Execute a migração admin-003 e cadastre a primeira categoria.</p></div>'}
      </section>`;
    document.querySelector('#new-category').onclick = () => openCategoryDialog();
    document.querySelectorAll('[data-category-edit]').forEach(button => button.onclick = () => openCategoryDialog(Number(button.dataset.categoryEdit)));
    document.querySelectorAll('[data-category-toggle]').forEach(button => button.onclick = () => toggleCategory(Number(button.dataset.categoryToggle), button));
    document.querySelectorAll('[data-category-delete]').forEach(button => button.onclick = () => deleteCategory(Number(button.dataset.categoryDelete), button));
  }

  function openCategoryDialog(id = null) {
    const category = id ? state.categories.find(item => Number(item.id) === id) : null;
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog small';
    dialog.innerHTML = `<form method="dialog" class="entity-form" id="category-form"><div class="dialog-head"><div><span class="module-kicker">CATEGORIA</span><h2>${category?'Editar categoria':'Nova categoria'}</h2></div><button type="button" class="dialog-close" aria-label="Fechar">×</button></div><div class="form-grid"><label class="field wide"><span>Nome</span><input name="name" value="${escapeHtml(category?.name||'')}" required></label><label class="field"><span>Ícone</span><input name="icon" value="${escapeHtml(category?.icon||'◇')}" maxlength="8"></label><label class="field"><span>Ordem</span><input name="sort_order" type="number" min="0" step="1" value="${category?.sort_order??state.categories.length}"></label><label class="check-field wide"><input name="active" type="checkbox" ${category?.active!==false?'checked':''}><span>Categoria ativa</span></label></div><div class="form-error" id="category-form-error"></div><div class="dialog-actions"><button type="button" class="secondary-action dialog-cancel">Cancelar</button><button type="submit" class="admin-primary compact">Salvar categoria</button></div></form>`;
    document.body.appendChild(dialog);
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('.dialog-close').onclick = close; dialog.querySelector('.dialog-cancel').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.querySelector('#category-form').onsubmit = event => saveCategory(event, category, close);
    dialog.showModal();
  }

  async function saveCategory(event, category, close) {
    event.preventDefault();
    const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); const errorNode = form.querySelector('#category-form-error'); const values = new FormData(form);
    const name = values.get('name').trim(); const extra = {icon:values.get('icon').trim()||'◇', sort_order:Number(values.get('sort_order')||0), active:values.get('active')==='on'};
    button.disabled = true; button.textContent = 'Salvando…'; errorNode.classList.remove('show');
    try {
      if (category) {
        if (name !== category.name) await api().request('/rest/v1/rpc/admin_rename_category', {method:'POST', body:{category_id:category.id,new_name:name}});
        await api().request(`/rest/v1/categories?id=eq.${category.id}`, {method:'PATCH', body:extra, headers:{Prefer:'return=minimal'}});
      } else {
        await api().request('/rest/v1/categories', {method:'POST', body:{name,slug:slugify(name),...extra}, headers:{Prefer:'return=minimal'}});
      }
      close(); await loadCategories(true); api().toast(category?'Categoria atualizada':'Categoria criada');
    } catch (error) {
      errorNode.textContent = error.status === 409 ? 'Já existe uma categoria com esse nome.' : 'Não foi possível salvar a categoria.'; errorNode.classList.add('show'); button.disabled = false; button.textContent = 'Salvar categoria';
    }
  }

  async function toggleCategory(id, button) {
    const category = state.categories.find(item => Number(item.id) === id); if (!category) return; button.disabled = true;
    try { await api().request(`/rest/v1/categories?id=eq.${id}`, {method:'PATCH',body:{active:!category.active},headers:{Prefer:'return=minimal'}}); category.active=!category.active; renderCategories(); api().toast('Categoria atualizada'); }
    catch { button.disabled=false; api().toast('Não foi possível atualizar a categoria'); }
  }

  async function deleteCategory(id, button) {
    const category = state.categories.find(item => Number(item.id) === id); if (!category || !confirm(`Excluir a categoria “${category.name}”?`)) return; button.disabled=true;
    try { await api().request('/rest/v1/rpc/admin_delete_category',{method:'POST',body:{category_id:id}}); await loadCategories(true); api().toast('Categoria excluída'); }
    catch { button.disabled=false; api().toast('A categoria possui produtos vinculados e não pode ser excluída'); }
  }

  async function loadCategories(force = false) {
    content().innerHTML = moduleSkeleton('CATEGORIAS');
    try { await Promise.all([fetchCategories(false), fetchProducts()]); renderCategories(); if(force)api().toast('Categorias atualizadas'); }
    catch (error) { moduleError('ATIVE O MÓDULO DE CATEGORIAS', error.status===404?'Execute o arquivo admin-003-catalog-management.sql no Supabase para liberar esta tela.':'Não foi possível carregar as categorias.', () => loadCategories(true)); }
  }

  function filteredStock() {
    const needle = state.stockSearch.trim().toLocaleLowerCase('pt-BR');
    return state.products.filter(product => {
      const stock = Number(product.stock || 0); const minimum = Number(product.stock_min || 0);
      const matchesSearch = !needle || [product.name, product.category, product.brand].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(needle));
      const matchesFilter = state.stockFilter === 'all' || (state.stockFilter === 'out' && stock === 0) || (state.stockFilter === 'low' && stock > 0 && stock <= minimum) || (state.stockFilter === 'healthy' && stock > minimum);
      return matchesSearch && matchesFilter;
    });
  }

  function renderStock() {
    const products = filteredStock();
    const totalUnits = state.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const out = state.products.filter(product => Number(product.stock || 0) === 0).length;
    const low = state.products.filter(product => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= Number(product.stock_min || 0)).length;
    const healthy = state.products.filter(product => Number(product.stock || 0) > Number(product.stock_min || 0)).length;
    content().innerHTML = `
      <div class="module-head"><div><span class="module-kicker">OPERAÇÃO</span><h2>Estoque</h2><p>Acompanhe disponibilidade e ajuste os níveis sem sair da listagem.</p></div><button class="secondary-action" id="stock-products">Gerenciar produtos</button></div>
      <div class="catalog-stats"><article class="catalog-stat"><small>UNIDADES</small><strong>${totalUnits}</strong><span>em todos os produtos</span></article><article class="catalog-stat ${out?'danger':''}"><small>SEM ESTOQUE</small><strong>${out}</strong><span>exigem reposição</span></article><article class="catalog-stat ${low?'warning':''}"><small>ESTOQUE BAIXO</small><strong>${low}</strong><span>no nível mínimo</span></article><article class="catalog-stat"><small>SAUDÁVEL</small><strong>${healthy}</strong><span>acima do mínimo</span></article></div>
      <section class="admin-card catalog-panel">
        <div class="catalog-toolbar stock-toolbar"><label class="search-control"><span>⌕</span><input id="stock-search" type="search" placeholder="Buscar produto ou categoria" value="${escapeHtml(state.stockSearch)}"></label><select id="stock-filter" aria-label="Filtrar situação do estoque"><option value="all" ${state.stockFilter==='all'?'selected':''}>Todas as situações</option><option value="out" ${state.stockFilter==='out'?'selected':''}>Sem estoque</option><option value="low" ${state.stockFilter==='low'?'selected':''}>Estoque baixo</option><option value="healthy" ${state.stockFilter==='healthy'?'selected':''}>Estoque saudável</option></select><span class="result-count">${products.length} produto${products.length===1?'':'s'}</span></div>
        ${products.length ? `<div class="catalog-table-wrap"><table class="catalog-table stock-table"><thead><tr><th>Produto</th><th>Situação</th><th>Atual</th><th>Mínimo</th><th>Ajuste rápido</th></tr></thead><tbody>${products.map(product => { const [tone,label]=stockState(product); return `<tr data-stock-row="${product.id}"><td><div class="product-cell"><div class="catalog-thumb">${productImage(product)}</div><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} • ${escapeHtml(product.brand||'Sem marca')}</small></div></div></td><td><span class="inventory-pill ${tone}">${label}</span></td><td><input class="stock-number" data-stock-value type="number" min="0" step="1" value="${Number(product.stock||0)}" aria-label="Estoque atual de ${escapeHtml(product.name)}"></td><td><input class="stock-number" data-stock-min type="number" min="0" step="1" value="${Number(product.stock_min||0)}" aria-label="Estoque mínimo de ${escapeHtml(product.name)}"></td><td><div class="stock-actions"><button data-stock-delta="-1" title="Retirar uma unidade">−</button><button data-stock-delta="1" title="Adicionar uma unidade">＋</button><button class="table-action save-stock" data-stock-save>Salvar</button></div></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-state rich-empty"><span>▤</span><strong>Nenhum produto nesta situação</strong><p>Altere o filtro para visualizar os demais itens.</p></div>'}
      </section>`;
    bindStock();
  }

  function bindStock() {
    document.querySelector('#stock-products').onclick = () => api().selectView('products');
    document.querySelector('#stock-search').oninput = event => { state.stockSearch=event.target.value; renderStock(); document.querySelector('#stock-search')?.focus(); };
    document.querySelector('#stock-filter').onchange = event => { state.stockFilter=event.target.value; renderStock(); };
    document.querySelectorAll('[data-stock-row]').forEach(row => {
      const stockInput=row.querySelector('[data-stock-value]');
      row.querySelectorAll('[data-stock-delta]').forEach(button => button.onclick=()=>{stockInput.value=Math.max(0,Number(stockInput.value||0)+Number(button.dataset.stockDelta));stockInput.classList.add('changed')});
      row.querySelector('[data-stock-save]').onclick=()=>saveStockRow(row);
      row.querySelectorAll('.stock-number').forEach(input=>input.oninput=()=>input.classList.add('changed'));
    });
  }

  async function saveStockRow(row) {
    const id=Number(row.dataset.stockRow); const product=state.products.find(item=>Number(item.id)===id); if(!product)return;
    const stock=Math.max(0,Number(row.querySelector('[data-stock-value]').value||0)); const stockMin=Math.max(0,Number(row.querySelector('[data-stock-min]').value||0)); const button=row.querySelector('[data-stock-save]');
    button.disabled=true; button.textContent='Salvando…';
    try { await api().request(`/rest/v1/products?id=eq.${id}`,{method:'PATCH',body:{stock,stock_min:stockMin},headers:{Prefer:'return=minimal'}}); product.stock=stock; product.stock_min=stockMin; renderStock(); api().toast(`Estoque de ${product.name} atualizado`); }
    catch { button.disabled=false; button.textContent='Salvar'; api().toast('Não foi possível atualizar o estoque'); }
  }

  async function loadStock(force = false) {
    content().innerHTML=moduleSkeleton('ESTOQUE');
    try { await fetchProducts(); renderStock(); if(force)api().toast('Estoque atualizado'); }
    catch { moduleError('ESTOQUE INDISPONÍVEL','Não foi possível carregar os níveis de estoque.',()=>loadStock(true)); }
  }

  window.BLACKOUT_ADMIN_CATALOG = {loadProducts, loadCategories, loadStock};
})();
