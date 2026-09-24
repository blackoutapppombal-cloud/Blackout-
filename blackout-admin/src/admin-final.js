(() => {
  let selectedProductId = null;
  let qualityCache = null;
  let searchCache = null;
  let searchTimer = null;
  const enhanced = new WeakSet();
  const api = () => window.BLACKOUT_ADMIN;
  const content = () => document.querySelector('#admin-content');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const assetUrl = value => {
    if (!value) return '';
    const raw = String(value);
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    const base = String(window.BLACKOUT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    return base ? `${base}/${raw.replace(/^\.\//, '')}` : `/${raw.replace(/^\.\//, '')}`;
  };

  function issue(type, severity, view, entity, id, label, detail) {
    return {type, severity, view, entity, id, label, detail};
  }

  async function qualityFallback() {
    const [products, categories, services, banners] = await Promise.all([
      api().request('/rest/v1/products?select=*&order=updated_at.desc'),
      api().request('/rest/v1/categories?select=*&order=sort_order.asc'),
      api().request('/rest/v1/services?select=*&order=sort_order.asc'),
      api().request('/rest/v1/banners?select=*&order=sort_order.asc')
    ]);
    const now = Date.now();
    const categoryMap = new Map((categories || []).map(item => [item.name, item]));
    const issues = [];
    (products || []).forEach(product => {
      if (!product.active) return;
      if (!String(product.image_url || '').trim()) issues.push(issue('missing_image','critical','products','product',product.id,product.name,'Produto sem foto principal'));
      if (Number(product.stock) === 0) issues.push(issue('out_of_stock','critical','stock','product',product.id,product.name,'Produto ativo sem estoque'));
      if (!String(product.category || '').trim() || !categoryMap.has(product.category)) issues.push(issue('missing_category','critical','products','product',product.id,product.name,'Categoria ausente ou inválida'));
      if (Number(product.price) <= 0) issues.push(issue('invalid_price','critical','products','product',product.id,product.name,'Preço precisa ser maior que zero'));
      if (!String(product.description || '').trim()) issues.push(issue('incomplete_product','warning','products','product',product.id,product.name,'Descrição do produto incompleta'));
      if (Number(product.discount) > 0 && product.promotion_ends_at && new Date(product.promotion_ends_at).getTime() < now) issues.push(issue('expired_offer','warning','offers','product',product.id,product.name,'Oferta vencida ainda possui desconto'));
    });
    (categories || []).forEach(category => {
      if (!category.active && (products || []).some(product => product.active && product.category === category.name)) issues.push(issue('inactive_category','warning','categories','category',category.id,category.name,'Categoria inativa possui produtos ativos'));
    });
    (services || []).forEach(service => {
      if (service.active && (!String(service.description || '').trim() || (service.price_type !== 'consult' && Math.max(Number(service.price||0),Number(service.promotional_price||0),Number(service.starting_price||0)) <= 0))) issues.push(issue('incomplete_service','warning','services','service',service.id,service.name,'Serviço ativo com dados incompletos'));
    });
    (banners || []).forEach(banner => {
      if (banner.active && !String(banner.image_url || '').trim()) issues.push(issue('broken_banner','warning','banners','banner',banner.id,banner.title,'Banner ativo sem imagem'));
    });
    const checks = Math.max(1, products.length * 5 + categories.length * 2 + services.length * 3 + banners.length * 2);
    return {
      score: Math.max(0, Math.round((1 - Math.min(issues.length / checks, 1)) * 100)), issues_total: issues.length, issues,
      products_total: products.length, products_active: products.filter(item => item.active).length,
      products_inactive: products.filter(item => !item.active).length,
      products_out_of_stock: products.filter(item => item.active && Number(item.stock) === 0).length,
      products_low_stock: products.filter(item => item.active && Number(item.stock) > 0 && Number(item.stock) <= Number(item.stock_min)).length,
      products_without_image: products.filter(item => item.active && !String(item.image_url || '').trim()).length,
      products_without_category: products.filter(item => item.active && !String(item.category || '').trim()).length,
      stock_units: products.reduce((sum,item) => sum + Number(item.stock || 0), 0), categories_total: categories.length,
      offers_active: products.filter(item => item.active && Number(item.discount) > 0 && (!item.promotion_starts_at || new Date(item.promotion_starts_at).getTime() <= now) && (!item.promotion_ends_at || new Date(item.promotion_ends_at).getTime() >= now)).length,
      services_active: services.filter(item => item.active).length,
      banners_active: banners.filter(item => item.active).length,
      updated_at: new Date().toISOString()
    };
  }

  async function fetchQuality(force = false) {
    if (qualityCache && !force) return qualityCache;
    try {
      qualityCache = await api().request('/rest/v1/rpc/admin_store_quality', {method:'POST', body:{}});
    } catch {
      qualityCache = await qualityFallback();
    }
    return qualityCache;
  }

  function qualitySkeleton() {
    return `<div class="module-head"><div><span class="module-kicker">CONTROLE DE QUALIDADE</span><h2>Verificação da loja</h2><p>Analisando produtos, catálogo e campanhas reais…</p></div></div><section class="admin-card final-skeleton">${Array.from({length:7},()=>'<span></span>').join('')}</section>`;
  }

  function focusTarget(item) {
    api().selectView(item.view);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const selectors = item.entity === 'product'
        ? [`[data-product-edit="${item.id}"]`, `[data-stock-row="${item.id}"]`]
        : item.entity === 'category' ? [`[data-category-edit="${item.id}"]`]
        : item.entity === 'service' ? [`[data-service-edit="${item.id}"]`]
        : item.entity === 'banner' ? [`[data-banner-edit="${item.id}"]`] : [];
      const target = selectors.map(selector => document.querySelector(selector)).find(Boolean);
      if (target) {
        clearInterval(timer);
        target.scrollIntoView({behavior:'smooth',block:'center'});
        target.classList.add('attention-target');
        if (/edit/.test(target.getAttributeNames().join(' '))) target.click();
      } else if (attempts >= 25) clearInterval(timer);
    }, 120);
  }

  function renderQuality(data) {
    const issues = Array.isArray(data.issues) ? data.issues : [];
    const critical = issues.filter(item => item.severity === 'critical').length;
    const warning = issues.length - critical;
    content().innerHTML = `<div class="module-head"><div><span class="module-kicker">CONTROLE DE QUALIDADE</span><h2>Verificação da loja</h2><p>Diagnóstico calculado somente com dados reais do Supabase.</p></div><button class="secondary-action" id="quality-refresh">Verificar novamente</button></div>
      <section class="quality-hero admin-card"><div class="quality-score" style="--score:${Number(data.score||0)}"><strong>${Number(data.score||0)}%</strong><span>LOJA COMPLETA</span></div><div><span class="module-kicker">RESULTADO ATUAL</span><h3>${issues.length ? `${issues.length} ${issues.length===1?'ITEM PRECISA':'ITENS PRECISAM'} DE ATENÇÃO` : 'LOJA PRONTA PARA VENDER'}</h3><p>${critical ? `${critical} problema${critical===1?' crítico':'s críticos'} deve${critical===1?'':'m'} ser corrigido${critical===1?'':'s'} primeiro.` : 'Nenhum problema crítico encontrado.'}</p></div><div class="quality-legend"><span><i class="critical"></i>${critical} críticos</span><span><i class="warning"></i>${warning} avisos</span></div></section>
      <div class="quality-metrics"><article><small>PRODUTOS</small><strong>${Number(data.products_total||0)}</strong><span>${Number(data.products_active||0)} ativos · ${Number(data.products_inactive||0)} inativos</span></article><article><small>ESTOQUE</small><strong>${Number(data.stock_units||0)}</strong><span>${Number(data.products_out_of_stock||0)} zerados · ${Number(data.products_low_stock||0)} baixos</span></article><article><small>CATÁLOGO</small><strong>${Number(data.categories_total||0)}</strong><span>categorias organizadas</span></article><article><small>VITRINE</small><strong>${Number(data.offers_active||0)}</strong><span>ofertas · ${Number(data.banners_active||0)} banners</span></article></div>
      <section class="admin-card quality-list"><div class="card-head"><div><h3>Atenção necessária</h3><span>Clique em corrigir para abrir o registro certo.</span></div></div>${issues.length ? issues.map((item,index)=>`<article class="quality-issue ${escapeHtml(item.severity)}"><b>${String(index+1).padStart(2,'0')}</b><span class="issue-dot">!</span><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></div><button class="table-action" data-quality-index="${index}">Corrigir</button></article>`).join('') : '<div class="quality-clean"><span>✓</span><strong>Nenhuma inconsistência estrutural encontrada</strong><p>Continue revisando imagens e campanhas antes de grandes publicações.</p></div>'}</section>`;
    document.querySelector('#quality-refresh').onclick = () => loadQuality(true);
    document.querySelectorAll('[data-quality-index]').forEach(button => button.onclick = () => focusTarget(issues[Number(button.dataset.qualityIndex)]));
  }

  async function loadQuality(force = false) {
    if (!api() || !content()) return;
    content().innerHTML = qualitySkeleton();
    try { renderQuality(await fetchQuality(force)); if (force) api().toast('Verificação atualizada'); }
    catch { content().innerHTML = '<section class="admin-card module-placeholder"><span>!</span><h2>VERIFICAÇÃO INDISPONÍVEL</h2><p>Não foi possível analisar a loja agora.</p></section>'; }
  }

  async function fallbackSearch(term) {
    if (!searchCache) {
      const [products,orders,services,categories] = await Promise.all([
        api().request('/rest/v1/products?select=id,name,category,platform,stock,sku&limit=300'),
        api().request('/rest/v1/orders?select=id,order_number,customer_name,customer_phone,status&order=created_at.desc&limit=150').catch(()=>[]),
        api().request('/rest/v1/services?select=id,name,model,description&limit=100').catch(()=>[]),
        api().request('/rest/v1/categories?select=id,name&limit=100').catch(()=>[])
      ]);
      searchCache = [
        ...products.map(item=>({type:'product',view:'products',id:item.id,label:item.name,detail:[item.category,item.platform,`Estoque ${item.stock}`].filter(Boolean).join(' • ')})),
        ...orders.map(item=>({type:'order',view:'orders',id:item.id,label:`#${item.order_number||item.id}`,detail:[item.customer_name,item.customer_phone,item.status].filter(Boolean).join(' • ')})),
        ...services.map(item=>({type:'service',view:'services',id:item.id,label:item.name,detail:[item.model,item.description].filter(Boolean).join(' • ')})),
        ...categories.map(item=>({type:'category',view:'categories',id:item.id,label:item.name,detail:'Categoria do catálogo'}))
      ];
    }
    const needle = term.toLocaleLowerCase('pt-BR');
    return searchCache.filter(item => `${item.label} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(needle)).slice(0,30);
  }

  async function runSearch(term, results) {
    if (term.length < 2) { results.innerHTML = '<div class="search-hint">Digite pelo menos duas letras.</div>'; return; }
    results.innerHTML = '<div class="search-hint">Buscando no Supabase…</div>';
    let rows;
    try { rows = await api().request('/rest/v1/rpc/admin_global_search',{method:'POST',body:{search_term:term}}); }
    catch { rows = await fallbackSearch(term); }
    results.innerHTML = rows.length ? rows.map((item,index)=>`<button data-search-index="${index}"><span>${escapeHtml(({product:'▦',order:'▤',service:'⚙',category:'◇'})[item.type]||'⌕')}</span><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail||'')}</small></div><em>${escapeHtml(({product:'Produto',order:'Pedido',service:'Serviço',category:'Categoria'})[item.type]||'Registro')}</em></button>`).join('') : '<div class="search-hint">Nenhum resultado encontrado.</div>';
    results.querySelectorAll('[data-search-index]').forEach(button => button.onclick = () => { const item=rows[Number(button.dataset.searchIndex)]; document.querySelector('#admin-global-search')?.close(); focusTarget({...item,entity:item.type}); });
  }

  function openSearch() {
    let dialog = document.querySelector('#admin-global-search');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'admin-global-search';
      dialog.className = 'global-search-dialog';
      dialog.innerHTML = `<div class="global-search-head"><span>⌕</span><input type="search" placeholder="Buscar produto, pedido, serviço…" autocomplete="off"><button type="button" aria-label="Fechar">×</button></div><div class="global-search-results"><div class="search-hint">Encontre qualquer área da operação em segundos.</div></div>`;
      document.body.appendChild(dialog);
      const input=dialog.querySelector('input'),results=dialog.querySelector('.global-search-results');
      dialog.querySelector('button').onclick=()=>dialog.close();
      input.oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(input.value.trim(),results),250)};
      dialog.addEventListener('close',()=>{input.value='';results.innerHTML='<div class="search-hint">Encontre qualquer área da operação em segundos.</div>'});
    }
    dialog.showModal();
    requestAnimationFrame(()=>dialog.querySelector('input').focus());
  }

  async function decorateDashboard() {
    const host = content();
    if (!host || host.dataset.finalDashboard || !host.querySelector('.primary-kpi-grid') || host.querySelector('.module-head')) return;
    host.dataset.finalDashboard = 'loading';
    try {
      const data = await fetchQuality();
      if (!host.isConnected || !host.querySelector('.primary-kpi-grid')) return;
      const anchor = host.querySelector('.secondary-kpi-grid');
      anchor?.insertAdjacentHTML('afterend', `<section class="dashboard-quality-strip"><button data-dashboard-quality><span class="quality-mini-score">${Number(data.score||0)}%</span><div><strong>Verificação da loja</strong><small>${Number(data.issues_total||0) ? `${Number(data.issues_total)} item${Number(data.issues_total)===1?'':'s'} precisa${Number(data.issues_total)===1?'':'m'} de atenção` : 'Nenhuma inconsistência encontrada'}</small></div><em>Revisar →</em></button><div><article><small>PRODUTOS</small><strong>${Number(data.products_total||0)}</strong></article><article><small>SEM FOTO</small><strong>${Number(data.products_without_image||0)}</strong></article><article><small>SEM ESTOQUE</small><strong>${Number(data.products_out_of_stock||0)}</strong></article><article><small>OFERTAS</small><strong>${Number(data.offers_active||0)}</strong></article></div></section>`);
      host.querySelector('[data-dashboard-quality]')?.addEventListener('click',()=>{api().selectView('quality');loadQuality()});
      host.dataset.finalDashboard = 'ready';
    } catch { host.dataset.finalDashboard = 'error'; }
  }

  function bindShell() {
    const nav = document.querySelector('[data-admin-view="quality"]');
    if (nav && !nav.dataset.finalBound) {
      nav.dataset.finalBound = 'true';
      nav.addEventListener('click', () => loadQuality());
    }
    const actions = document.querySelector('.topbar-actions');
    if (actions && !actions.querySelector('.admin-search-trigger')) {
      actions.insertAdjacentHTML('afterbegin','<button class="admin-search-trigger" type="button" aria-label="Busca administrativa global"><span>⌕</span><em>Buscar</em><kbd>Ctrl K</kbd></button>');
    }
    const trigger = document.querySelector('.admin-search-trigger');
    if (trigger && !trigger.dataset.finalBound) { trigger.dataset.finalBound='true'; trigger.onclick=openSearch; }
  }

  function enhanceProductList() {
    const status = document.querySelector('#product-status');
    if (!status || status.dataset.finalEnhanced) return;
    status.dataset.finalEnhanced = 'true';
    const options = [['offer','Em promoção'],['out','Sem estoque'],['missing-image','Sem foto'],['incomplete','Incompletos']];
    options.forEach(([value,label]) => { if (![...status.options].some(option=>option.value===value)) status.add(new Option(label,value)); });
    const search = document.querySelector('#product-search');
    if (search?.oninput) {
      const original = search.oninput;
      search.oninput = event => { const value=event.target.value; clearTimeout(searchTimer); searchTimer=setTimeout(()=>original({target:{value}}),220); };
    }
    document.querySelectorAll('[data-product-edit]').forEach(button => {
      const cell = button.parentElement;
      const id = button.dataset.productEdit;
      if (!cell.querySelector('[data-product-duplicate]')) button.insertAdjacentHTML('afterend',`<button class="table-action" data-product-duplicate="${id}">Duplicar</button><button class="table-action danger" data-product-delete="${id}">Excluir</button>`);
    });
    const table = document.querySelector('.catalog-table-wrap .catalog-table');
    if (table && !table.dataset.paginated) {
      const rows = [...table.tBodies[0].rows];
      if (rows.length > 30) {
        table.dataset.paginated='true';
        let page=1; const pages=Math.ceil(rows.length/30);
        table.parentElement.insertAdjacentHTML('afterend',`<div class="admin-pagination"><button data-page-prev>←</button><span></span><button data-page-next>→</button></div>`);
        const pagination=table.parentElement.nextElementSibling;
        const update=()=>{rows.forEach((row,index)=>row.hidden=index<(page-1)*30||index>=page*30);pagination.querySelector('span').textContent=`Página ${page} de ${pages}`;pagination.querySelector('[data-page-prev]').disabled=page===1;pagination.querySelector('[data-page-next]').disabled=page===pages;};
        pagination.querySelector('[data-page-prev]').onclick=()=>{page=Math.max(1,page-1);update()};
        pagination.querySelector('[data-page-next]').onclick=()=>{page=Math.min(pages,page+1);update()};update();
      }
    }
  }

  async function duplicateProduct(id) {
    try {
      const rows = await api().request(`/rest/v1/products?select=*&id=eq.${id}`);
      const source = rows?.[0]; if (!source) throw new Error();
      const copy = {...source,name:`${source.name} (cópia)`,sku:null,active:false,publication_status:'draft'};
      ['id','created_at','updated_at'].forEach(key=>delete copy[key]);
      await api().request('/rest/v1/products',{method:'POST',body:copy,headers:{Prefer:'return=minimal'}});
      api().selectView('products');api().toast('Produto duplicado como rascunho');
    } catch { api().toast('Não foi possível duplicar o produto'); }
  }

  async function deleteProduct(id) {
    const rows = await api().request(`/rest/v1/products?select=name&id=eq.${id}`).catch(()=>[]);
    const name = rows?.[0]?.name || 'este produto';
    if (!confirm(`Excluir “${name}”? Esta ação não pode ser desfeita.`)) return;
    try { await api().request(`/rest/v1/products?id=eq.${id}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});api().selectView('products');api().toast('Produto excluído'); }
    catch { api().toast('Não foi possível excluir. Verifique pedidos ou relações vinculadas.'); }
  }

  function imageWorkshop(form, values = {}) {
    const input=form.querySelector('[name="image_file"]');
    if (!input || form.querySelector('.image-workshop')) return;
    input.closest('label').insertAdjacentHTML('afterend',`<section class="image-workshop field wide"><div class="image-workshop-head"><span>COMO APARECERÁ NO APLICATIVO</span><small>Enquadramento quadrado · WebP otimizado</small></div><div class="image-workshop-grid"><div class="image-card-preview"><canvas width="720" height="720"></canvas><span class="image-empty">Selecione uma imagem</span></div><div class="image-controls"><button type="button" data-image-action="zoom-in">＋ Aumentar</button><button type="button" data-image-action="zoom-out">− Diminuir</button><button type="button" data-image-action="up">↑ Cima</button><button type="button" data-image-action="down">↓ Baixo</button><button type="button" data-image-action="left">← Esquerda</button><button type="button" data-image-action="right">→ Direita</button><button type="button" data-image-action="center">◎ Centralizar</button><small data-image-status>Nenhum novo arquivo selecionado.</small></div></div></section>`);
    const workshop=form.querySelector('.image-workshop'),canvas=workshop.querySelector('canvas'),ctx=canvas.getContext('2d');
    const empty=workshop.querySelector('.image-empty'),status=workshop.querySelector('[data-image-status]');
    const state={image:null,zoom:1,x:0,y:0,file:null,timer:null};
    const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);if(!state.image)return;const base=Math.min(canvas.width/state.image.naturalWidth,canvas.height/state.image.naturalHeight);const scale=base*state.zoom;const width=state.image.naturalWidth*scale,height=state.image.naturalHeight*scale;ctx.drawImage(state.image,(canvas.width-width)/2+state.x,(canvas.height-height)/2+state.y,width,height);empty.hidden=true;};
    const optimize=()=>{if(!state.file)return;clearTimeout(state.timer);state.timer=setTimeout(()=>canvas.toBlob(blob=>{if(!blob)return;const file=new File([blob],`${state.file.name.replace(/\.[^.]+$/,'')}.webp`,{type:'image/webp'});const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;status.textContent=`Imagem otimizada: ${Math.max(1,Math.round(file.size/1024))} KB · 720×720`;},'image/webp',.86),180)};
    const load=(src,file=null)=>{const image=new Image();if(!file)image.crossOrigin='anonymous';image.onload=()=>{state.image=image;state.file=file;state.zoom=1;state.x=0;state.y=0;draw();if(file)optimize()};image.src=src;};
    input.addEventListener('change',()=>{const file=input.files?.[0];if(file)load(URL.createObjectURL(file),file)});
    workshop.querySelectorAll('[data-image-action]').forEach(button=>button.onclick=()=>{if(!state.image)return;const action=button.dataset.imageAction;if(action==='zoom-in')state.zoom=Math.min(3,state.zoom+.1);if(action==='zoom-out')state.zoom=Math.max(.5,state.zoom-.1);if(action==='up')state.y-=24;if(action==='down')state.y+=24;if(action==='left')state.x-=24;if(action==='right')state.x+=24;if(action==='center'){state.x=0;state.y=0;state.zoom=1}draw();optimize()});
    if (values.image_url) load(assetUrl(values.image_url));
  }

  async function productGallery(form, values = {}) {
    if (form.dataset.galleryEnhanced) return;
    form.dataset.galleryEnhanced = 'true';
    let existing = [], available = true;
    if (selectedProductId) {
      try { existing = await api().request(`/rest/v1/product_images?select=*&product_id=eq.${selectedProductId}&order=sort_order.asc,id.asc`); }
      catch { available = false; }
    }
    if (!Array.isArray(existing)) existing = [];
    if (!existing.length && values.image_url) existing.push({id:null,image_url:values.image_url,is_primary:true,sort_order:0,legacy:true});
    const state = {available,items:existing.map((item,index)=>({key:`existing-${item.id||index}`,id:item.id||null,url:item.image_url,file:null,primary:Boolean(item.is_primary)||index===0,removed:false,legacy:Boolean(item.legacy)})),removed:new Set()};
    form.__productGallery = state;
    const workshop=form.querySelector('.image-workshop');
    if (!workshop) return;
    workshop.insertAdjacentHTML('afterend', `<section class="product-gallery wide"><div class="product-gallery-head"><div><strong>Imagens do produto</strong><small>Escolha a principal, reordene ou remova miniaturas.</small></div><label>＋ Adicionar imagens<input type="file" data-gallery-files accept="image/jpeg,image/png,image/webp" multiple></label></div><div class="product-gallery-list" data-gallery-list></div>${available?'':'<p class="gallery-unavailable">A galeria múltipla será ativada após aplicar a migração final; a imagem principal continua funcionando.</p>'}</section>`);
    const gallery=form.querySelector('.product-gallery'),list=gallery.querySelector('[data-gallery-list]'),input=gallery.querySelector('[data-gallery-files]');
    const normalizePrimary=()=>{const visible=state.items.filter(item=>!item.removed);if(visible.length&&!visible.some(item=>item.primary))visible[0].primary=true;state.items.filter(item=>item.removed).forEach(item=>item.primary=false)};
    const render=()=>{normalizePrimary();const visible=state.items.filter(item=>!item.removed);list.innerHTML=visible.length?visible.map((item,index)=>`<article data-gallery-key="${escapeHtml(item.key)}" class="${item.primary?'primary':''}"><div>${item.url?`<img src="${escapeHtml(item.url)}" alt="" loading="lazy">`:'<span>Imagem</span>'}</div><button type="button" data-gallery-primary title="Definir como principal">${item.primary?'Principal':'Tornar principal'}</button><span><button type="button" data-gallery-move="-1" ${index===0?'disabled':''}>←</button><button type="button" data-gallery-move="1" ${index===visible.length-1?'disabled':''}>→</button><button type="button" data-gallery-remove>×</button></span></article>`).join(''):'<div class="gallery-empty">Nenhuma imagem adicional. Use “Adicionar imagens”.</div>';bind()};
    const bind=()=>{list.querySelectorAll('[data-gallery-key]').forEach(card=>{const item=state.items.find(entry=>entry.key===card.dataset.galleryKey);if(!item)return;card.querySelector('[data-gallery-primary]').onclick=()=>{state.items.forEach(entry=>entry.primary=entry===item);render()};card.querySelector('[data-gallery-remove]').onclick=()=>{item.removed=true;if(item.id)state.removed.add(item.id);render()};card.querySelectorAll('[data-gallery-move]').forEach(button=>button.onclick=()=>{const visible=state.items.filter(entry=>!entry.removed),from=visible.indexOf(item),to=from+Number(button.dataset.galleryMove);if(to<0||to>=visible.length)return;const other=visible[to],a=state.items.indexOf(item),b=state.items.indexOf(other);[state.items[a],state.items[b]]=[state.items[b],state.items[a]];render()})})};
    input.onchange=()=>{[...input.files].forEach((file,index)=>state.items.push({key:`new-${Date.now()}-${index}`,id:null,url:URL.createObjectURL(file),file,primary:!state.items.some(item=>!item.removed&&item.primary),removed:false}));input.value='';render()};
    render();
  }

  async function syncProductImages(productId, {primaryUrl = null} = {}) {
    const form=document.querySelector('#product-form'),state=form?.__productGallery;
    if (!form || !state || !state.available || !productId) return;
    if (primaryUrl && !state.items.some(item=>!item.removed&&item.url===primaryUrl)) {
      state.items.forEach(item=>item.primary=false);
      state.items.unshift({key:`saved-${Date.now()}`,id:null,url:primaryUrl,file:null,primary:true,removed:false});
    }
    const visible=state.items.filter(item=>!item.removed);
    if (visible.length&&!visible.some(item=>item.primary))visible[0].primary=true;
    await Promise.all([...state.removed].map(id=>api().request(`/rest/v1/product_images?id=eq.${id}`,{method:'DELETE',headers:{Prefer:'return=minimal'}})));
    const persisted=visible.filter(item=>item.id);
    await Promise.all(persisted.map(item=>api().request(`/rest/v1/product_images?id=eq.${item.id}`,{method:'PATCH',body:{is_primary:false},headers:{Prefer:'return=minimal'}})));
    for (let index=0;index<visible.length;index+=1) {
      const item=visible[index];
      if (item.file) item.url=await api().uploadImage(item.file,'products');
      const payload={product_id:Number(productId),image_url:item.url,alt_text:String(form.name?.value||''),is_primary:Boolean(item.primary),sort_order:index};
      if (item.id) await api().request(`/rest/v1/product_images?id=eq.${item.id}`,{method:'PATCH',body:payload,headers:{Prefer:'return=minimal'}});
      else await api().request('/rest/v1/product_images',{method:'POST',body:payload,headers:{Prefer:'return=minimal'}});
    }
    const primary=visible.find(item=>item.primary)||visible[0];
    if (primary?.url !== undefined) await api().request(`/rest/v1/products?id=eq.${productId}`,{method:'PATCH',body:{image_url:primary?.url||null},headers:{Prefer:'return=minimal'}});
  }

  function productStudio(form, values = {}) {
    if (form.dataset.studioEnhanced) return;
    form.dataset.studioEnhanced='true';
    form.querySelector('[name="subcategory"]')?.closest('label')?.querySelector('span')?.replaceChildren('Modelo / subcategoria');
    form.querySelector('.dialog-head')?.insertAdjacentHTML('afterend','<nav class="product-editor-nav"><button type="button" data-editor-target="name" class="active">Informações básicas</button><button type="button" data-editor-target="image_file">Imagens</button><button type="button" data-editor-target="price">Preço e estoque</button><button type="button" data-editor-target="description">Descrição</button></nav>');
    form.querySelector('.form-error')?.insertAdjacentHTML('beforebegin', `<section class="product-live-studio"><div class="studio-preview"><div class="studio-head"><div><strong>Preview no aplicativo</strong><small>Visualização com os dados preenchidos</small></div><div><button type="button" data-studio-device="mobile" class="active">Mobile</button><button type="button" data-studio-device="tablet">Tablet</button><button type="button" data-studio-device="desktop">Desktop</button></div></div><div class="studio-stage mobile"><article><div class="studio-image" data-studio-image><span>Sem imagem</span><em data-studio-discount></em></div><p data-studio-name>Nome do produto</p><del data-studio-old></del><strong data-studio-price>R$ 0,00</strong><small data-studio-stock></small></article></div></div><aside class="studio-price"><span>Estoque e preço</span><div><small>Preço normal</small><strong data-price-normal>R$ 0,00</strong></div><div><small>Preço promocional</small><strong data-price-current>R$ 0,00</strong></div><section><small>Desconto</small><strong data-price-discount>0%</strong><em data-price-economy>Sem economia</em></section><div><small>Quantidade em estoque</small><strong data-price-stock>0</strong></div><p data-price-status>Sem estoque</p></aside></section>`);
    const studio=form.querySelector('.product-live-studio'),stage=studio.querySelector('.studio-stage'),image=studio.querySelector('[data-studio-image]'),field=name=>form.querySelector(`[name="${name}"]`);
    let objectUrl='';
    const update=()=>{const current=Number(field('price')?.value||0),normal=Number(field('old_price')?.value||current),stock=Number(field('stock')?.value||0),minimum=Number(field('stock_min')?.value||0),discount=normal>current&&current>=0?Math.round((1-current/normal)*100):0,economy=Math.max(0,normal-current);studio.querySelector('[data-studio-name]').textContent=field('name')?.value.trim()||'Nome do produto';studio.querySelector('[data-studio-price]').textContent=api().money(current);studio.querySelector('[data-studio-old]').textContent=normal>current?api().money(normal):'';studio.querySelector('[data-studio-discount]').textContent=discount?`-${discount}%`:'';studio.querySelector('[data-studio-stock]').textContent=stock>0?'● Em estoque':'● Esgotado';studio.querySelector('[data-price-normal]').textContent=api().money(normal);studio.querySelector('[data-price-current]').textContent=api().money(current);studio.querySelector('[data-price-discount]').textContent=discount?`-${discount}%`:'0%';studio.querySelector('[data-price-economy]').textContent=economy?`Economia de ${api().money(economy)}`:'Sem economia';studio.querySelector('[data-price-stock]').textContent=String(stock);const status=stock===0?'Esgotado':stock===1?'Última unidade':stock<=minimum?'Estoque baixo':'Em estoque';studio.querySelector('[data-price-status]').textContent=status;studio.querySelector('[data-price-status]').className=stock===0?'critical':stock<=minimum?'warning':'healthy'};
    const setImage=src=>{image.style.backgroundImage=src?`url("${String(src).replace(/"/g,'%22')}")`:'';image.classList.toggle('has-image',Boolean(src))};
    setImage(assetUrl(values.image_url||field('image_url')?.value));
    form.querySelector('[name="image_url"]')?.addEventListener('input',event=>setImage(assetUrl(event.target.value)));
    form.querySelector('[name="image_file"]')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);setImage(objectUrl)});
    ['name','price','old_price','stock','stock_min'].forEach(name=>field(name)?.addEventListener('input',update));
    studio.querySelectorAll('[data-studio-device]').forEach(button=>button.onclick=()=>{studio.querySelectorAll('[data-studio-device]').forEach(item=>item.classList.toggle('active',item===button));stage.className=`studio-stage ${button.dataset.studioDevice}`});
    form.querySelectorAll('[data-editor-target]').forEach(button=>button.onclick=()=>{form.querySelectorAll('[data-editor-target]').forEach(item=>item.classList.toggle('active',item===button));form.querySelector(`[name="${button.dataset.editorTarget}"]`)?.closest('label,section')?.scrollIntoView({behavior:'smooth',block:'center'})});
    update();
  }

  function enhanceVariants(dialog) {
    const section=dialog.querySelector('.variant-editor');
    if (!section || section.querySelector('.variant-choice')) return;
    section.insertAdjacentHTML('afterbegin','<div class="variant-choice"><div><strong>Este produto possui variações?</strong><small>Use apenas para capacidade, cor ou modelo com preço/estoque próprio.</small></div><div><button type="button" data-variant-choice="no" class="active">Não</button><button type="button" data-variant-choice="yes">Sim</button></div></div>');
    const apply=choice=>{section.dataset.choice=choice;section.classList.toggle('variants-disabled',choice==='no');section.querySelectorAll('[data-variant-choice]').forEach(button=>button.classList.toggle('active',button.dataset.variantChoice===choice));};
    const sync=()=>{if(section.querySelectorAll('[data-variant-row]').length&&section.dataset.choice!=='yes')apply('yes')};
    section.querySelectorAll('[data-variant-choice]').forEach(button=>button.onclick=()=>{if(button.dataset.variantChoice==='no'&&section.querySelectorAll('[data-variant-row]').length&&!confirm('Remover as variações deste produto ao salvar?'))return;if(button.dataset.variantChoice==='no')section.querySelector('#variant-list').innerHTML='';apply(button.dataset.variantChoice)});
    apply(section.querySelectorAll('[data-variant-row]').length?'yes':'no');
    new MutationObserver(sync).observe(section.querySelector('#variant-list'),{childList:true});
  }

  async function enhanceProductDialog(dialog) {
    const form=dialog.querySelector('#product-form');
    if (!form || enhanced.has(form)) { enhanceVariants(dialog); return; }
    enhanced.add(form);
    let values={};
    if (selectedProductId) {
      try { values=(await api().request(`/rest/v1/products?select=*&id=eq.${selectedProductId}`))?.[0]||{}; } catch {}
    }
    const activeField=form.querySelector('[name="active"]')?.closest('label');
    if (activeField) activeField.insertAdjacentHTML('beforebegin',`<label class="field wide"><span>Conteúdo da embalagem</span><textarea name="package_contents" rows="3" placeholder="Itens que acompanham o produto">${escapeHtml(values.package_contents||'')}</textarea></label><section class="promotion-admin wide"><label class="check-field"><input name="has_promotion" type="checkbox" ${Number(values.discount)>0?'checked':''}><span>Este produto está em promoção</span></label><div class="promotion-fields"><label class="field"><span>Início da promoção</span><input name="promotion_starts_at" type="datetime-local" value="${values.promotion_starts_at?new Date(values.promotion_starts_at).toISOString().slice(0,16):''}"></label><label class="field"><span>Fim da promoção</span><input name="promotion_ends_at" type="datetime-local" value="${values.promotion_ends_at?new Date(values.promotion_ends_at).toISOString().slice(0,16):''}"></label><label class="check-field"><input name="featured" type="checkbox" ${values.featured?'checked':''}><span>Destacar na vitrine</span></label><div class="promotion-economy"></div></div></section><input type="hidden" name="publication_status" value="${escapeHtml(values.publication_status||((values.active??true)?'published':'inactive'))}">`);
    const actions=form.querySelector('.dialog-actions'),submit=actions?.querySelector('[type="submit"]');
    if (actions&&submit&&!actions.querySelector('[data-save-draft]')) { submit.textContent=selectedProductId?'Salvar produto':'Publicar produto';submit.insertAdjacentHTML('beforebegin','<button type="submit" class="secondary-action" data-save-draft>Salvar rascunho</button>'); }
    form.querySelector('[data-save-draft]')?.addEventListener('click',()=>{form.publication_status.value='draft';form.active.checked=false});
    submit?.addEventListener('click',()=>{form.publication_status.value=form.active.checked?'published':'inactive'});
    const promo=form.querySelector('[name="has_promotion"]'),promoFields=form.querySelector('.promotion-fields'),price=form.querySelector('[name="price"]'),oldPrice=form.querySelector('[name="old_price"]'),discount=form.querySelector('[name="discount"]'),economy=form.querySelector('.promotion-economy');
    const updatePromo=()=>{const enabled=promo.checked;promoFields.hidden=!enabled;if(discount)discount.readOnly=true;const normal=Number(oldPrice?.value||0),current=Number(price?.value||0),percent=enabled&&normal>current&&current>=0?Math.round((1-current/normal)*100):0;if(discount)discount.value=percent;economy.textContent=percent?`Economia para o cliente: ${api().money(normal-current)} (${percent}%)`:'Informe um preço promocional menor que o normal.';};
    [promo,price,oldPrice].forEach(node=>node?.addEventListener('input',updatePromo));updatePromo();imageWorkshop(form,values);await productGallery(form,values);productStudio(form,values);enhanceVariants(dialog);
  }

  async function enhanceOfferDialog(dialog) {
    const form=dialog.querySelector('form');
    if (!form || form.dataset.finalOffer || !form.querySelector('[name="product_id"]') || !form.querySelector('[name="old_price"]') || !/oferta/i.test(form.querySelector('h2')?.textContent||'')) return;
    form.dataset.finalOffer='true';
    const select=form.querySelector('[name="product_id"]');
    const mount=async()=>{
      const id=Number(select.value||0);let item={};
      if(id)try{item=(await api().request(`/rest/v1/products?select=promotion_starts_at,promotion_ends_at,featured&id=eq.${id}`))?.[0]||{}}catch{}
      let section=form.querySelector('.offer-schedule');
      if(!section){form.querySelector('.form-error').insertAdjacentHTML('beforebegin','<section class="offer-schedule form-grid wide"><label class="field"><span>Início</span><input name="promotion_starts_at" type="datetime-local"></label><label class="field"><span>Fim</span><input name="promotion_ends_at" type="datetime-local"></label><label class="check-field wide"><input name="featured" type="checkbox"><span>Destacar esta oferta na vitrine</span></label><div class="promotion-economy wide"></div></section>');section=form.querySelector('.offer-schedule')}
      section.querySelector('[name="promotion_starts_at"]').value=item.promotion_starts_at?new Date(item.promotion_starts_at).toISOString().slice(0,16):'';
      section.querySelector('[name="promotion_ends_at"]').value=item.promotion_ends_at?new Date(item.promotion_ends_at).toISOString().slice(0,16):'';
      section.querySelector('[name="featured"]').checked=Boolean(item.featured);
      const update=()=>{const normal=Number(form.old_price.value||0),promo=Number(form.price.value||0),percent=normal>promo&&promo>=0?Math.round((1-promo/normal)*100):0;section.querySelector('.promotion-economy').textContent=percent?`Economia: ${api().money(normal-promo)} (${percent}%)`:'O preço promocional deve ser menor que o normal.'};
      form.old_price.oninput=update;form.price.oninput=update;update();
    };
    select.addEventListener('change',mount);mount();
  }

  function enhanceBannerDialog(dialog) {
    const form=dialog.querySelector('form');
    if(!form||form.dataset.finalBanner||!form.querySelector('[name="eyebrow"]')||!form.querySelector('[name="link_label"]'))return;
    form.dataset.finalBanner='true';
    const file=form.querySelector('[name="image_file"]'),image=form.querySelector('[name="image_url"]');
    file.closest('label').insertAdjacentHTML('afterend','<section class="banner-device-preview wide"><div class="banner-preview-tabs"><button type="button" data-preview-size="mobile">Mobile</button><button type="button" data-preview-size="tablet">Tablet</button><button type="button" data-preview-size="desktop" class="active">Desktop</button></div><div class="banner-preview-frame desktop"><span></span><h3></h3><p></p></div><small data-banner-warning>Recomendado: imagem horizontal entre 1,8:1 e 2,5:1.</small><label class="field"><span>Posição</span><select name="placement"><option value="hero">Hero principal</option><option value="catalog">Catálogo</option><option value="offers">Ofertas</option></select></label></section>');
    const preview=form.querySelector('.banner-preview-frame'),warning=form.querySelector('[data-banner-warning]');
    const update=()=>{const src=assetUrl(image.value);preview.style.backgroundImage=src?`linear-gradient(90deg,#061018e8,#06101844),url("${src.replace(/"/g,'%22')}")`:'';preview.querySelector('span').textContent=form.eyebrow.value;preview.querySelector('h3').textContent=form.title.value||'Título do banner';preview.querySelector('p').textContent=form.subtitle.value};
    ['eyebrow','title','subtitle','image_url'].forEach(name=>form[name]?.addEventListener('input',update));
    form.querySelectorAll('[data-preview-size]').forEach(button=>button.onclick=()=>{form.querySelectorAll('[data-preview-size]').forEach(item=>item.classList.toggle('active',item===button));preview.className=`banner-preview-frame ${button.dataset.previewSize}`});
    file.addEventListener('change',()=>{const selected=file.files?.[0];if(!selected)return;const probe=new Image();probe.onload=()=>{const ratio=probe.naturalWidth/probe.naturalHeight;warning.textContent=ratio<1.8||ratio>2.5?'Atenção: esta imagem está fora da proporção recomendada.':`Imagem adequada: ${probe.naturalWidth}×${probe.naturalHeight}px.`;preview.style.backgroundImage=`linear-gradient(90deg,#061018e8,#06101844),url("${URL.createObjectURL(selected)}")`};probe.src=URL.createObjectURL(selected)});update();
  }

  function enhanceSettings() {
    const form=document.querySelector('#settings-form');
    if(!form||form.dataset.finalEnhanced)return;form.dataset.finalEnhanced='true';
    const delivery=form.querySelector('[name="delivery_fee"]')?.closest('label');
    delivery?.insertAdjacentHTML('beforebegin','<label class="field"><span>Limite padrão de estoque baixo</span><input name="low_stock_default" type="number" min="0" step="1" value="3"></label>');
    api().request('/rest/v1/store_settings?select=low_stock_default&id=eq.1').then(rows=>{const input=form.querySelector('[name="low_stock_default"]');if(input&&rows?.[0]?.low_stock_default!=null)input.value=Number(rows[0].low_stock_default)}).catch(()=>{});
  }

  function enhanceStockList() {
    document.querySelectorAll('[data-stock-row]').forEach(row=>{const actions=row.querySelector('.stock-actions');if(actions&&!actions.querySelector('[data-stock-history]'))actions.insertAdjacentHTML('beforeend',`<button class="table-action" data-stock-history="${row.dataset.stockRow}">Histórico</button>`)});
  }

  async function openStockHistory(productId) {
    let rows=[];try{rows=await api().request(`/rest/v1/stock_movements?select=*&product_id=eq.${productId}&order=created_at.desc&limit=50`)}catch{}
    const dialog=document.createElement('dialog');dialog.className='admin-dialog small';dialog.innerHTML=`<section class="entity-form"><div class="dialog-head"><div><span class="module-kicker">ESTOQUE</span><h2>Histórico de alterações</h2></div><button type="button" class="dialog-close">×</button></div>${rows.length?`<div class="stock-history-list">${rows.map(item=>`<article><span class="${Number(item.delta)>=0?'positive':'negative'}">${Number(item.delta)>=0?'+':''}${Number(item.delta)}</span><div><strong>${Number(item.previous_stock)} → ${Number(item.new_stock)} unidades</strong><small>${escapeHtml(item.reason||'Ajuste administrativo')} · ${api().dateTime(item.created_at)}</small></div></article>`).join('')}</div>`:'<div class="quality-clean"><span>⌁</span><strong>Sem alterações registradas</strong><p>O histórico começa após aplicar a migração final.</p></div>'}<div class="dialog-actions"><button type="button" class="secondary-action dialog-cancel">Fechar</button></div></section>`;document.body.appendChild(dialog);const close=()=>{dialog.close();dialog.remove()};dialog.querySelector('.dialog-close').onclick=close;dialog.querySelector('.dialog-cancel').onclick=close;dialog.showModal();
  }

  function wrapRequests() {
    if (!api() || api().__finalWrapped) return;
    const original=api().request;
    api().request=function(path,options={}){
      if (/\/rest\/v1\/products(?:\?|$)/.test(path)&&['POST','PATCH'].includes(options.method)) {
        const form=document.querySelector('#product-form');
        if (form) {
          const values=new FormData(form),promotion=values.get('has_promotion')==='on',price=Number(values.get('price')||0),normal=Number(values.get('old_price')||price),publication=String(values.get('publication_status')||'published');
          options={...options,body:{...(options.body||{}),old_price:promotion?normal:price,discount:promotion&&normal>price?Math.round((1-price/normal)*100):0,promotion_starts_at:promotion&&values.get('promotion_starts_at')?new Date(values.get('promotion_starts_at')).toISOString():null,promotion_ends_at:promotion&&values.get('promotion_ends_at')?new Date(values.get('promotion_ends_at')).toISOString():null,featured:promotion&&values.get('featured')==='on',package_contents:String(values.get('package_contents')||'').trim(),publication_status:publication,active:publication==='published'}};
        } else {
          const offer=[...document.querySelectorAll('dialog form')].find(item=>item.querySelector('[name="product_id"]')&&item.querySelector('.offer-schedule'));
          if(offer){const values=new FormData(offer);options={...options,body:{...(options.body||{}),promotion_starts_at:values.get('promotion_starts_at')?new Date(values.get('promotion_starts_at')).toISOString():null,promotion_ends_at:values.get('promotion_ends_at')?new Date(values.get('promotion_ends_at')).toISOString():null,featured:values.get('featured')==='on'}}}
        }
      }
      if (/\/rest\/v1\/banners(?:\?|$)/.test(path)&&['POST','PATCH'].includes(options.method)) {const form=[...document.querySelectorAll('dialog form')].find(item=>item.querySelector('.banner-device-preview'));if(form)options={...options,body:{...(options.body||{}),placement:new FormData(form).get('placement')||'hero'}};}
      if (/\/rest\/v1\/store_settings(?:\?|$)/.test(path)&&['POST','PATCH'].includes(options.method)) {const form=document.querySelector('#settings-form');if(form)options={...options,body:{...(options.body||{}),low_stock_default:Math.max(0,Number(new FormData(form).get('low_stock_default')||3))}};}
      const compatibilityColumns=['publication_status','package_contents','promotion_starts_at','promotion_ends_at','featured','placement','low_stock_default'];
      const hasIncrementalFields=options.body&&compatibilityColumns.some(key=>Object.prototype.hasOwnProperty.call(options.body,key));
      return original(path,options).catch(error=>{
        if(!hasIncrementalFields||![400,404].includes(Number(error.status)))throw error;
        const legacyBody={...options.body};compatibilityColumns.forEach(key=>delete legacyBody[key]);
        return original(path,{...options,body:legacyBody});
      });
    };
    api().__finalWrapped=true;
  }

  function observe() {
    bindShell();enhanceProductList();enhanceStockList();enhanceSettings();decorateDashboard();wrapRequests();
    document.querySelectorAll('dialog.admin-dialog').forEach(dialog=>{enhanceProductDialog(dialog);enhanceOfferDialog(dialog);enhanceBannerDialog(dialog)});
  }

  document.addEventListener('click',event=>{
    const edit=event.target.closest('[data-product-edit]');if(edit)selectedProductId=Number(edit.dataset.productEdit);
    if(event.target.closest('#new-product'))selectedProductId=null;
    const duplicate=event.target.closest('[data-product-duplicate]');if(duplicate){event.preventDefault();duplicateProduct(Number(duplicate.dataset.productDuplicate));}
    const remove=event.target.closest('[data-product-delete]');if(remove){event.preventDefault();deleteProduct(Number(remove.dataset.productDelete));}
    const history=event.target.closest('[data-stock-history]');if(history){event.preventDefault();openStockHistory(Number(history.dataset.stockHistory));}
  },true);
  document.addEventListener('click',event=>{if(event.target.closest('.refresh-data')&&document.querySelector('[data-admin-view="quality"].active')){event.preventDefault();event.stopImmediatePropagation();loadQuality(true)}},true);
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(api())openSearch()}if(event.key==='Escape'&&document.querySelector('#admin-global-search[open]'))document.querySelector('#admin-global-search').close()});
  new MutationObserver(observe).observe(document.body,{childList:true,subtree:true});
  const ready=setInterval(()=>{if(api()){clearInterval(ready);observe()}},50);
  window.BLACKOUT_ADMIN_FINAL={loadQuality,bindShell,openSearch,decorateDashboard,syncProductImages};
})();
