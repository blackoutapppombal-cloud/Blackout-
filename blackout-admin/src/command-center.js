(() => {
  const state = {
    period: 'today',
    chartMode: 'revenue',
    productFilter: 'all',
    productSearch: '',
    productCategory: 'all',
    productPlatform: 'all',
    loading: false,
    data: null,
    requestId: 0,
    searchTimer: null
  };

  const api = () => window.BLACKOUT_ADMIN;
  const host = () => document.querySelector('#admin-content');
  const escapeHtml = value => api()?.escapeHtml(value) || String(value ?? '');
  const money = value => api()?.money(value) || `R$ ${Number(value || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
  const assetUrl = value => {
    if (!value) return '';
    const raw = String(value);
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    const base = String(window.BLACKOUT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    return base ? `${base}/${raw.replace(/^\.\//, '')}` : `/${raw.replace(/^\.\//, '')}`;
  };
  const periodLabels = {today:'Hoje','7d':'7 dias','30d':'30 dias',month:'Este mês'};
  const cardIcons = {products:'◇',stock:'▦',orders:'▤',categories:'⌘',services:'◆',banners:'▧',coupons:'％'};

  function isDashboard() {
    return Boolean(document.querySelector('[data-admin-view="dashboard"].active'));
  }

  function safeRows(path) {
    return api().request(path).then(rows => Array.isArray(rows) ? rows : []).catch(() => []);
  }

  function isScheduledActive(item) {
    const now = Date.now();
    return Boolean(item.active) && (!item.starts_at || new Date(item.starts_at).getTime() <= now) && (!item.ends_at || new Date(item.ends_at).getTime() >= now);
  }

  function localQuality(products, categories, services, banners) {
    const categoryNames = new Set(categories.map(item => item.name));
    const now = Date.now();
    const issues = [];
    const push = (type, severity, view, entity, item, detail) => issues.push({type,severity,view,entity,id:item.id,label:item.name || item.title || 'Registro',detail});
    products.filter(item => item.active).forEach(product => {
      if (!String(product.image_url || '').trim()) push('missing_image','critical','products','product',product,'Produto sem foto principal');
      if (Number(product.stock || 0) === 0) push('out_of_stock','critical','stock','product',product,'Produto ativo sem estoque');
      else if (Number(product.stock || 0) <= Number(product.stock_min || 0)) push('low_stock','warning','stock','product',product,'Produto abaixo do limite mínimo');
      if (!String(product.category || '').trim() || !categoryNames.has(product.category)) push('missing_category','critical','products','product',product,'Categoria ausente ou inválida');
      if (!String(product.description || '').trim() || Number(product.price || 0) <= 0) push('incomplete_product','warning','products','product',product,'Informações obrigatórias incompletas');
      if (Number(product.discount || 0) > 0 && product.promotion_ends_at && new Date(product.promotion_ends_at).getTime() < now) push('expired_offer','warning','offers','product',product,'Promoção expirada');
    });
    services.filter(item => item.active && !String(item.description || '').trim()).forEach(item => push('incomplete_service','warning','services','service',item,'Serviço incompleto'));
    banners.filter(item => item.active && !String(item.image_url || '').trim()).forEach(item => push('broken_banner','warning','banners','banner',item,'Banner sem imagem'));
    return {issues,issues_total:issues.length};
  }

  async function fetchData() {
    const [metrics, products, categories, services, banners, coupons, remoteQuality] = await Promise.all([
      api().request('/rest/v1/rpc/admin_dashboard_metrics', {method:'POST',body:{period_key:state.period}}),
      safeRows('/rest/v1/products?select=*&order=updated_at.desc,id.desc'),
      safeRows('/rest/v1/categories?select=*&order=sort_order.asc,name.asc'),
      safeRows('/rest/v1/services?select=*&order=sort_order.asc,name.asc'),
      safeRows('/rest/v1/banners?select=*&order=sort_order.asc,created_at.desc'),
      safeRows('/rest/v1/coupons?select=*&order=created_at.desc'),
      api().request('/rest/v1/rpc/admin_store_quality', {method:'POST',body:{}}).catch(() => null)
    ]);
    const quality = remoteQuality && Array.isArray(remoteQuality.issues)
      ? remoteQuality
      : localQuality(products,categories,services,banners);
    const known = new Set((quality.issues || []).map(item => `${item.type}:${item.id}`));
    products.filter(item => item.active && Number(item.stock || 0) > 0 && Number(item.stock || 0) <= Number(item.stock_min || 0)).forEach(product => {
      if (!known.has(`low_stock:${product.id}`)) quality.issues.push({type:'low_stock',severity:'warning',view:'stock',entity:'product',id:product.id,label:product.name,detail:'Produto abaixo do limite mínimo'});
    });
    quality.issues_total = quality.issues.length;
    return {metrics:metrics || {},products,categories,services,banners,coupons,quality};
  }

  function commandSkeleton() {
    return `<section class="command-center-v2 command-loading"><div class="command-hero"><div><span>CENTRAL DE COMANDO</span><h2>Operação BLACKOUT</h2><p>Carregando dados reais do Supabase…</p></div></div><div class="command-summary-grid">${Array.from({length:7},()=>'<article class="command-summary-card skeleton"><div class="skeleton-line"></div><div class="skeleton-line big"></div></article>').join('')}</div><div class="command-insights-grid"><section class="admin-card skeleton"></section><section class="admin-card skeleton"></section><section class="admin-card skeleton"></section></div></section>`;
  }

  async function mount(force = false) {
    if (!api() || !isDashboard() || state.loading) return;
    const container = host();
    if (!container || (!force && container.querySelector('.command-center-v2') && state.data)) return;
    state.loading = true;
    const requestId = ++state.requestId;
    container.innerHTML = commandSkeleton();
    document.querySelector('.refresh-data')?.classList.add('spinning');
    try {
      const data = await fetchData();
      if (requestId !== state.requestId || !isDashboard() || !host()) return;
      state.data = data;
      render(data);
      updateShell(data);
    } catch (error) {
      if (requestId !== state.requestId || !host()) return;
      host().innerHTML = `<section class="admin-card module-placeholder command-error"><span>!</span><h2>CENTRAL INDISPONÍVEL</h2><p>${error?.status === 404 ? 'A função de métricas ainda não foi aplicada ao Supabase.' : 'Não foi possível carregar os dados da operação agora.'}</p><button class="admin-primary compact" id="command-retry">Tentar novamente</button></section>`;
      document.querySelector('#command-retry')?.addEventListener('click',()=>mount(true));
    } finally {
      state.loading = false;
      document.querySelector('.refresh-data')?.classList.remove('spinning');
    }
  }

  function summaryCards(data) {
    const {metrics,products,categories,services,banners,coupons} = data;
    const stock = products.reduce((sum,item)=>sum + Number(item.stock || 0),0);
    const activeProducts = products.filter(item=>item.active).length;
    const activeServices = services.filter(item=>item.active).length;
    const activeBanners = banners.filter(isScheduledActive).length;
    const activeCoupons = coupons.filter(item=>isScheduledActive(item)&&(item.max_uses==null||Number(item.used_count||0)<Number(item.max_uses))).length;
    const cards = [
      ['products','Produtos',products.length,`${activeProducts} ativos · ${products.length-activeProducts} inativos`,'products'],
      ['stock','Estoque total',stock,`${Number(data.quality.products_low_stock ?? products.filter(item=>item.active&&Number(item.stock)>0&&Number(item.stock)<=Number(item.stock_min)).length)} em estoque baixo`,'stock'],
      ['orders','Pedidos',Number(metrics.orders_total||0),`${money(metrics.revenue)} no período`,'orders'],
      ['categories','Categorias',categories.length,`${categories.filter(item=>item.active).length} ativas`,'categories'],
      ['services','Serviços',services.length,`${activeServices} ativos`,'services'],
      ['banners','Banners',banners.length,`${activeBanners} publicados`,'banners'],
      ['coupons','Cupons',coupons.length,`${activeCoupons} disponíveis`,'coupons']
    ];
    return cards.map(([tone,label,value,detail,view])=>`<button class="command-summary-card tone-${tone}" data-command-view="${view}"><span class="command-summary-icon">${cardIcons[tone]}</span><div><small>${label}</small><strong>${Number(value).toLocaleString('pt-BR')}</strong><em>${escapeHtml(detail)}</em></div></button>`).join('');
  }

  function salesChart(metrics) {
    const series = Array.isArray(metrics.sales_series) ? metrics.sales_series : [];
    const values = series.map(item=>Number(state.chartMode==='revenue'?item.revenue:item.orders||0));
    if (!series.length || values.every(value=>value===0)) return '<div class="command-chart-empty"><span>⌁</span><strong>Sem movimentação no período.</strong><small>O gráfico aparecerá quando houver pedidos reais.</small></div>';
    const width=680,height=210,padX=28,padY=22,max=Math.max(...values,1),step=series.length>1?(width-padX*2)/(series.length-1):0;
    const points=values.map((value,index)=>({x:padX+index*step,y:height-padY-(value/max)*(height-padY*2),value,item:series[index]}));
    const line=points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const area=`${line} L ${points.at(-1).x.toFixed(1)} ${height-padY} L ${points[0].x.toFixed(1)} ${height-padY} Z`;
    return `<div class="command-sales-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Vendas do período"><defs><linearGradient id="command-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4d00" stop-opacity=".42"/><stop offset="1" stop-color="#ff4d00" stop-opacity="0"/></linearGradient></defs>${[0,.25,.5,.75,1].map(ratio=>`<line x1="${padX}" x2="${width-padX}" y1="${padY+(height-padY*2)*ratio}" y2="${padY+(height-padY*2)*ratio}"/>`).join('')}<path d="${area}" class="command-chart-area"/><path d="${line}" class="command-chart-line"/>${points.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="4"><title>${escapeHtml(point.item.label)} · ${state.chartMode==='revenue'?money(point.value):`${point.value} pedidos`}</title></circle>`).join('')}</svg><div class="command-chart-labels">${series.map((item,index)=>(index===0||index===series.length-1||series.length<=7)?`<span>${escapeHtml(item.label)}</span>`:'<span></span>').join('')}</div></div>`;
  }

  function categoryChart(products) {
    const map=new Map();
    products.forEach(product=>{const name=String(product.category||'Sem categoria').trim()||'Sem categoria';map.set(name,(map.get(name)||0)+1)});
    const sorted=[...map.entries()].sort((a,b)=>b[1]-a[1]);
    if (!products.length) return '<div class="command-chart-empty compact"><span>◇</span><strong>Sem produtos cadastrados</strong></div>';
    const colors=['#ff4d00','#ff8a00','#00bfe9','#7c55ff','#12d48a','#ff335f','#8093a1'];
    let cursor=0;
    const segments=sorted.map(([,count],index)=>{const start=cursor;cursor+=(count/products.length)*100;return `${colors[index%colors.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`});
    const visible=sorted.slice(0,6);
    return `<div class="category-chart-wrap"><div class="category-donut" style="--segments:${segments.join(',')}"><div><strong>${products.length}</strong><span>Produtos</span></div></div><div class="category-legend">${visible.map(([name,count],index)=>`<div><i style="--dot:${colors[index%colors.length]}"></i><span>${escapeHtml(name)}</span><strong>${count} <small>${Math.round(count/products.length*100)}%</small></strong></div>`).join('')}</div></div>`;
  }

  const issueMeta = {
    missing_image:['Sem foto','▧'],out_of_stock:['Sem estoque','□'],low_stock:['Estoque baixo','△'],missing_category:['Sem categoria','◇'],incomplete_product:['Informações incompletas','!'],expired_offer:['Promoções expiradas','％'],broken_banner:['Banners sem imagem','▧'],invalid_price:['Preço inválido','R$'],incomplete_service:['Serviços incompletos','◆'],inactive_category:['Categoria inconsistente','◇']
  };

  function groupedIssues(quality) {
    const groups=new Map();
    (quality.issues||[]).forEach(issue=>{if(!groups.has(issue.type))groups.set(issue.type,{type:issue.type,items:[],severity:issue.severity});groups.get(issue.type).items.push(issue)});
    return [...groups.values()].sort((a,b)=>(a.severity==='critical'?-1:1)-(b.severity==='critical'?-1:1)).slice(0,6);
  }

  function attentionMarkup(quality) {
    const groups=groupedIssues(quality);
    if (!groups.length) return '<div class="command-attention-clean"><span>✓</span><strong>Nenhuma atenção crítica</strong><small>A verificação não encontrou inconsistências.</small></div>';
    return `<div class="command-alert-list">${groups.map(group=>{const [label,icon]=issueMeta[group.type]||[group.items[0]?.detail||group.type,'!'];return `<button data-command-issue="${escapeHtml(group.type)}"><span class="alert-symbol ${group.severity}">${icon}</span><div><strong>${group.items.length} ${escapeHtml(label.toLowerCase())}</strong><small>${escapeHtml(group.items[0]?.label||'Abrir registros')}</small></div><em>${group.items.length}</em><b>Corrigir</b></button>`}).join('')}</div>`;
  }

  function productOfferActive(product) {
    const now=Date.now();
    return Number(product.discount)>0&&(!product.promotion_starts_at||new Date(product.promotion_starts_at).getTime()<=now)&&(!product.promotion_ends_at||new Date(product.promotion_ends_at).getTime()>=now);
  }

  function productIncomplete(product) {
    return !String(product.name||'').trim()||!String(product.category||'').trim()||Number(product.price)<=0||!String(product.description||'').trim();
  }

  function filteredProducts(products) {
    const needle=state.productSearch.trim().toLocaleLowerCase('pt-BR');
    return products.filter(product=>{
      const search=!needle||[product.name,product.brand,product.category,product.platform,product.sku].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(needle));
      const category=state.productCategory==='all'||product.category===state.productCategory;
      const platform=state.productPlatform==='all'||product.platform===state.productPlatform;
      const filter=state.productFilter;
      const status=filter==='all'||(filter==='active'&&product.active)||(filter==='inactive'&&!product.active)||(filter==='offer'&&productOfferActive(product))||(filter==='out'&&Number(product.stock)===0)||(filter==='low'&&Number(product.stock)>0&&Number(product.stock)<=Number(product.stock_min))||(filter==='missing-image'&&!String(product.image_url||'').trim())||(filter==='incomplete'&&productIncomplete(product));
      return search&&category&&platform&&status;
    });
  }

  function productArea(data) {
    const products=filteredProducts(data.products).slice(0,8);
    const counts={all:data.products.length,active:data.products.filter(item=>item.active).length,inactive:data.products.filter(item=>!item.active).length,offer:data.products.filter(productOfferActive).length,out:data.products.filter(item=>Number(item.stock)===0).length,low:data.products.filter(item=>Number(item.stock)>0&&Number(item.stock)<=Number(item.stock_min)).length,'missing-image':data.products.filter(item=>!String(item.image_url||'').trim()).length,incomplete:data.products.filter(productIncomplete).length};
    const filters=[['all','Todos'],['active','Ativos'],['inactive','Inativos'],['offer','Em promoção'],['out','Sem estoque'],['low','Estoque baixo'],['missing-image','Sem foto'],['incomplete','Incompletos']];
    const categories=[...new Set(data.products.map(item=>item.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const platforms=[...new Set(data.products.map(item=>item.platform).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return `<section class="command-products admin-card" id="command-products"><div class="command-products-head"><div><span class="command-section-icon">◇</span><div><h3>Produtos</h3><small>Gerencie o catálogo sem sair da central</small></div></div><button class="command-new-product" data-command-new-product>＋ Novo produto</button></div><div class="command-filter-chips">${filters.map(([key,label])=>`<button data-command-filter="${key}" class="${state.productFilter===key?'active':''}">${label} <span>${counts[key]}</span></button>`).join('')}</div><div class="command-product-toolbar"><label><span>⌕</span><input type="search" data-command-product-search placeholder="Buscar produto…" value="${escapeHtml(state.productSearch)}"></label><select data-command-category aria-label="Filtrar produtos por categoria"><option value="all">Categoria: Todas</option>${categories.map(item=>`<option value="${escapeHtml(item)}" ${state.productCategory===item?'selected':''}>${escapeHtml(item)}</option>`).join('')}</select><select data-command-platform aria-label="Filtrar produtos por plataforma"><option value="all">Plataforma: Todas</option>${platforms.map(item=>`<option value="${escapeHtml(item)}" ${state.productPlatform===item?'selected':''}>${escapeHtml(item)}</option>`).join('')}</select><button data-command-view="products">Ver catálogo completo</button></div>${products.length?`<div class="command-product-table-wrap"><table class="command-product-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>${products.map(product=>{const image=assetUrl(product.image_url);const stock=Number(product.stock||0),minimum=Number(product.stock_min||0),stockTone=stock===0?'critical':stock<=minimum?'warning':'healthy';return `<tr data-command-product-row="${product.id}"><td data-label="Produto"><div class="command-product-cell"><div>${image?`<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.closest('div').classList.add('image-broken');this.remove()">`:'<span>◇</span>'}</div><p><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand||'Sem marca')} · ${escapeHtml(product.platform||'Sem plataforma')}</small></p></div></td><td data-label="Categoria">${escapeHtml(product.category||'Sem categoria')}</td><td data-label="Preço"><strong>${money(product.price)}</strong>${Number(product.old_price)>Number(product.price)?`<small class="command-old-price">${money(product.old_price)}</small>`:''}</td><td data-label="Estoque"><span class="command-stock ${stockTone}">${stock}</span></td><td data-label="Status"><button class="command-status ${product.active?'active':'inactive'}" data-dashboard-product-toggle="${product.id}">${product.active?'Ativo':'Inativo'}</button></td><td data-label="Ações"><div class="command-row-actions"><button data-product-edit="${product.id}" title="Editar">✎</button><button data-product-duplicate="${product.id}" title="Duplicar">▣</button><button data-product-delete="${product.id}" class="danger" title="Excluir">×</button></div></td></tr>`}).join('')}</tbody></table></div>`:'<div class="command-empty"><strong>Nenhum produto encontrado</strong><span>Ajuste os filtros ou cadastre um novo item.</span></div>'}</section>`;
  }

  function render(data) {
    const groups=groupedIssues(data.quality);
    host().innerHTML=`<section class="command-center-v2"><header class="command-hero"><div><span>CENTRAL DE COMANDO</span><h2>BLACKOUT INFOR GAMES</h2><p>Produtos, pedidos e operação calculados diretamente no Supabase.</p></div><div class="command-periods">${Object.entries(periodLabels).map(([key,label])=>`<button data-command-period="${key}" class="${state.period===key?'active':''}">${label}</button>`).join('')}</div></header><div class="command-summary-grid">${summaryCards(data)}</div><div class="command-insights-grid"><section class="admin-card command-sales-panel"><div class="command-card-head"><div><h3>Vendas do período</h3><span>Somente pedidos pagos ou concluídos</span></div><div><button data-command-chart="revenue" class="${state.chartMode==='revenue'?'active':''}">Faturamento</button><button data-command-chart="orders" class="${state.chartMode==='orders'?'active':''}">Pedidos</button></div></div><div data-command-chart-host>${salesChart(data.metrics)}</div></section><section class="admin-card command-category-panel"><div class="command-card-head"><div><h3>Produtos por categoria</h3><span>Distribuição real do catálogo</span></div></div>${categoryChart(data.products)}</section><section class="admin-card command-attention-panel" id="attention-panel"><div class="command-card-head attention"><div><h3>⚠ Atenção necessária</h3><span>${groups.reduce((sum,item)=>sum+item.items.length,0)} ocorrência(s)</span></div><button data-command-view="quality">Verificação</button></div>${attentionMarkup(data.quality)}</section></div>${productArea(data)}</section>`;
    bind(data);
  }

  function rerenderProductArea(data) {
    const current=document.querySelector('#command-products');
    if (!current) return;
    const wrapper=document.createElement('div');wrapper.innerHTML=productArea(data);current.replaceWith(wrapper.firstElementChild);bindProducts(data);
  }

  function focusProduct(id) {
    api().selectView('products');
    let attempts=0;
    const timer=setInterval(()=>{attempts+=1;const target=document.querySelector(`[data-product-edit="${id}"]`);if(target){clearInterval(timer);target.scrollIntoView({behavior:'smooth',block:'center'});target.click()}else if(attempts>30)clearInterval(timer)},120);
  }

  function focusIssue(type,data) {
    const issue=(data.quality.issues||[]).find(item=>item.type===type);
    if (!issue) return;
    api().selectView(issue.view||'quality');
    let attempts=0;
    const timer=setInterval(()=>{attempts+=1;const selectors=issue.entity==='product'?[`[data-product-edit="${issue.id}"]`,`[data-stock-row="${issue.id}"]`]:issue.entity==='category'?[`[data-category-edit="${issue.id}"]`]:issue.entity==='service'?[`[data-service-edit="${issue.id}"]`]:issue.entity==='banner'?[`[data-banner-edit="${issue.id}"]`]:[];const target=selectors.map(selector=>document.querySelector(selector)).find(Boolean);if(target){clearInterval(timer);target.scrollIntoView({behavior:'smooth',block:'center'});target.click()}else if(attempts>30)clearInterval(timer)},120);
  }

  function openNewProduct() {
    api().selectView('products');
    let attempts=0;
    const timer=setInterval(()=>{attempts+=1;const button=document.querySelector('#new-product');if(button){clearInterval(timer);button.click()}else if(attempts>30)clearInterval(timer)},120);
  }

  function bindProducts(data) {
    document.querySelectorAll('[data-command-filter]').forEach(button=>button.onclick=()=>{state.productFilter=button.dataset.commandFilter;rerenderProductArea(data)});
    const search=document.querySelector('[data-command-product-search]');
    if(search)search.oninput=event=>{state.productSearch=event.target.value;clearTimeout(state.searchTimer);state.searchTimer=setTimeout(()=>rerenderProductArea(data),180)};
    document.querySelector('[data-command-category]')?.addEventListener('change',event=>{state.productCategory=event.target.value;rerenderProductArea(data)});
    document.querySelector('[data-command-platform]')?.addEventListener('change',event=>{state.productPlatform=event.target.value;rerenderProductArea(data)});
    document.querySelector('[data-command-new-product]')?.addEventListener('click',openNewProduct);
    document.querySelectorAll('#command-products [data-command-view]').forEach(button=>button.onclick=()=>api().selectView(button.dataset.commandView));
    document.querySelectorAll('#command-products [data-product-edit]').forEach(button=>button.onclick=event=>{event.preventDefault();focusProduct(Number(button.dataset.productEdit))});
    document.querySelectorAll('[data-dashboard-product-toggle]').forEach(button=>button.onclick=async()=>{const product=data.products.find(item=>Number(item.id)===Number(button.dataset.dashboardProductToggle));if(!product)return;button.disabled=true;try{await api().request(`/rest/v1/products?id=eq.${product.id}`,{method:'PATCH',body:{active:!product.active},headers:{Prefer:'return=minimal'}});product.active=!product.active;rerenderProductArea(data);api().toast(product.active?'Produto ativado':'Produto desativado')}catch{button.disabled=false;api().toast('Não foi possível atualizar o produto')}});
  }

  function bind(data) {
    document.querySelectorAll('[data-command-period]').forEach(button=>button.onclick=()=>{state.period=button.dataset.commandPeriod;state.data=null;mount(true)});
    document.querySelectorAll('[data-command-chart]').forEach(button=>button.onclick=()=>{state.chartMode=button.dataset.commandChart;document.querySelectorAll('[data-command-chart]').forEach(item=>item.classList.toggle('active',item===button));document.querySelector('[data-command-chart-host]').innerHTML=salesChart(data.metrics)});
    document.querySelectorAll('.command-center-v2 [data-command-view]').forEach(button=>button.onclick=()=>api().selectView(button.dataset.commandView));
    document.querySelectorAll('[data-command-issue]').forEach(button=>button.onclick=()=>focusIssue(button.dataset.commandIssue,data));
    bindProducts(data);
  }

  function enhanceShell() {
    const shell=document.querySelector('.admin-shell');
    if (!shell) return;
    shell.classList.add('blackout-command-shell');
    const brand=document.querySelector('.sidebar-brand strong');
    if(brand&&!brand.dataset.commandBrand){brand.dataset.commandBrand='true';brand.innerHTML='BLACK<span>OUT</span>'}
    const topbar=document.querySelector('.admin-topbar');
    const actions=document.querySelector('.topbar-actions');
    if(topbar&&!topbar.querySelector('.command-slogan'))actions?.insertAdjacentHTML('beforebegin','<div class="command-slogan"><small>TUDO PARA O SEU</small><strong>MUNDO GAMER</strong></div>');
    if(actions&&!actions.querySelector('.command-top-period'))actions.insertAdjacentHTML('afterbegin',`<button class="command-top-period" type="button">${periodLabels[state.period]}</button>`);
    const avatar=document.querySelector('.admin-avatar');
    if(avatar&&!avatar.dataset.commandProfile){avatar.dataset.commandProfile='true';const email=document.querySelector('.admin-account small')?.textContent?.trim()||'';const raw=(email.split('@')[0]||'ADMIN').replace(/[._-]+/g,' ').trim().toUpperCase();const name=raw==='ADMIN'?'ADMINISTRADOR':`${raw} ADM`;avatar.innerHTML=`<span>${escapeHtml(raw.charAt(0)||'A')}</span><span><strong>${escapeHtml(name)}</strong><small>BLACKOUT INFOR GAMES</small></span>`}
    const period=document.querySelector('.command-top-period');
    if(period){if(period.textContent!==periodLabels[state.period])period.textContent=periodLabels[state.period];if(!period.dataset.commandBound){period.dataset.commandBound='true';period.onclick=()=>document.querySelector('.command-periods')?.scrollIntoView({behavior:'smooth',block:'center'})}}
  }

  function updateShell(data) {
    enhanceShell();
    const badge=document.querySelector('.notification-action');
    const total=groupedIssues(data.quality).reduce((sum,item)=>sum+item.items.length,0);
    if(badge){badge.dataset.count=String(total);badge.classList.toggle('has-alerts',total>0)}
    const label=document.querySelector('.updated-label');if(label&&label.textContent!=='Atualizado agora')label.textContent='Atualizado agora';
  }

  const observer=new MutationObserver(()=>{
    enhanceShell();
    if (!isDashboard() || !api()) return;
    const container=host();
    if(container&&!container.querySelector('.command-center-v2')&&!state.loading)mount();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  const ready=setInterval(()=>{if(api()){clearInterval(ready);enhanceShell();if(isDashboard())mount()}},50);
})();
