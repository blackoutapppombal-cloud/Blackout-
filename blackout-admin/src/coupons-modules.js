(() => {
  const state = { coupons: [], search: '', status: 'all', type: 'all' };
  const api = () => window.BLACKOUT_ADMIN;
  const content = () => document.querySelector('#admin-content');
  const escapeHtml = value => api().escapeHtml(value);
  const money = value => api().money(value);
  const dateTime = value => api().dateTime(value);

  function couponStatus(coupon) {
    const now = Date.now();
    if (!coupon.active) return { key: 'inactive', label: 'Desativado', tone: 'critical' };
    if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return { key: 'expired', label: 'Expirado', tone: 'critical' };
    if (coupon.max_uses !== null && Number(coupon.used_count) >= Number(coupon.max_uses)) return { key: 'exhausted', label: 'Esgotado', tone: 'warning' };
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return { key: 'scheduled', label: 'Agendado', tone: 'warning' };
    return { key: 'active', label: 'Em uso', tone: 'healthy' };
  }

  function discountLabel(coupon) {
    return coupon.discount_type === 'percent'
      ? `${Number(coupon.discount_value).toLocaleString('pt-BR')}%`
      : money(coupon.discount_value);
  }

  function dateRange(coupon) {
    if (!coupon.starts_at && !coupon.ends_at) return 'Sem prazo';
    return `${coupon.starts_at ? dateTime(coupon.starts_at) : 'Imediato'} até ${coupon.ends_at ? dateTime(coupon.ends_at) : 'sem fim'}`;
  }

  function filteredCoupons() {
    const needle = state.search.trim().toLocaleLowerCase('pt-BR');
    return state.coupons.filter(coupon => {
      const matchesSearch = !needle || [coupon.code, ...(coupon.allowed_categories || []), ...(coupon.allowed_product_ids || [])]
        .some(value => String(value).toLocaleLowerCase('pt-BR').includes(needle));
      const matchesStatus = state.status === 'all' || couponStatus(coupon).key === state.status;
      const matchesType = state.type === 'all' || coupon.discount_type === state.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }

  function renderCoupons() {
    const rows = filteredCoupons();
    const available = state.coupons.filter(coupon => couponStatus(coupon).key === 'active').length;
    const scheduled = state.coupons.filter(coupon => couponStatus(coupon).key === 'scheduled').length;
    const uses = state.coupons.reduce((sum, coupon) => sum + Number(coupon.used_count || 0), 0);
    content().innerHTML = `
      <div class="module-head">
        <div><span class="module-kicker">CHECKOUT</span><h2>Cupons</h2><p>Gerencie os descontos aplicados pelo checkout existente.</p></div>
        <button class="admin-primary compact" id="new-coupon">＋ Novo cupom</button>
      </div>
      <div class="catalog-stats">
        <article class="catalog-stat"><small>CADASTRADOS</small><strong>${state.coupons.length}</strong><span>cupons no Supabase</span></article>
        <article class="catalog-stat"><small>EM USO</small><strong>${available}</strong><span>válidos neste momento</span></article>
        <article class="catalog-stat"><small>AGENDADOS</small><strong>${scheduled}</strong><span>com início futuro</span></article>
        <article class="catalog-stat"><small>UTILIZAÇÕES</small><strong>${uses}</strong><span>registradas pelo checkout</span></article>
      </div>
      <section class="admin-card catalog-panel">
        <div class="catalog-toolbar">
          <label class="search-control"><span>⌕</span><input id="coupon-search" type="search" placeholder="Buscar código, categoria ou ID" value="${escapeHtml(state.search)}"></label>
          <select id="coupon-status" aria-label="Filtrar status">
            <option value="all" ${state.status === 'all' ? 'selected' : ''}>Todos os status</option>
            <option value="active" ${state.status === 'active' ? 'selected' : ''}>Em uso</option>
            <option value="scheduled" ${state.status === 'scheduled' ? 'selected' : ''}>Agendados</option>
            <option value="exhausted" ${state.status === 'exhausted' ? 'selected' : ''}>Esgotados</option>
            <option value="expired" ${state.status === 'expired' ? 'selected' : ''}>Expirados</option>
            <option value="inactive" ${state.status === 'inactive' ? 'selected' : ''}>Desativados</option>
          </select>
          <select id="coupon-type" aria-label="Filtrar tipo de desconto">
            <option value="all" ${state.type === 'all' ? 'selected' : ''}>Todos os descontos</option>
            <option value="percent" ${state.type === 'percent' ? 'selected' : ''}>Percentual</option>
            <option value="fixed" ${state.type === 'fixed' ? 'selected' : ''}>Valor fixo</option>
          </select>
          <span class="result-count">${rows.length} cupom${rows.length === 1 ? '' : 's'}</span>
        </div>
        ${rows.length ? `<div class="catalog-table-wrap"><table class="catalog-table operations-table">
          <thead><tr><th>Código</th><th>Desconto</th><th>Pedido mínimo</th><th>Validade</th><th>Utilizações</th><th>Situação</th><th>Habilitado</th><th>Ações</th></tr></thead>
          <tbody>${rows.map(coupon => {
            const status = couponStatus(coupon);
            return `<tr>
              <td><strong>${escapeHtml(coupon.code)}</strong><small class="table-sub">Criado em ${dateTime(coupon.created_at)}</small></td>
              <td><strong>${discountLabel(coupon)}</strong><small class="table-sub">${coupon.discount_type === 'percent' ? 'Percentual' : 'Valor fixo'}</small></td>
              <td>${money(coupon.minimum_subtotal)}</td>
              <td>${escapeHtml(dateRange(coupon))}</td>
              <td>${Number(coupon.used_count || 0)} / ${coupon.max_uses ?? '∞'}<small class="table-sub">${coupon.max_uses_per_customer ? `Até ${Number(coupon.max_uses_per_customer)} por cliente` : 'Sem limite por cliente'}</small></td>
              <td><span class="inventory-pill ${status.tone}">${status.label}</span></td>
              <td><button class="visibility-toggle ${coupon.active ? 'on' : ''}" data-coupon-toggle="${escapeHtml(coupon.code)}" aria-label="${coupon.active ? 'Desativar' : 'Ativar'} cupom ${escapeHtml(coupon.code)}"><span></span>${coupon.active ? 'Ativo' : 'Inativo'}</button></td>
              <td><button class="table-action" data-coupon-edit="${escapeHtml(coupon.code)}">Editar</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : `<div class="empty-state rich-empty"><span>％</span><strong>${state.coupons.length ? 'Nenhum cupom encontrado' : 'Nenhum cupom cadastrado'}</strong><p>${state.coupons.length ? 'Altere os filtros para consultar outros cupons.' : 'Crie o primeiro cupom para disponibilizá-lo no checkout.'}</p></div>`}
      </section>`;
    document.querySelector('#new-coupon').onclick = () => openCouponDialog();
    document.querySelector('#coupon-search').oninput = event => {
      state.search = event.target.value;
      renderCoupons();
      document.querySelector('#coupon-search').focus();
    };
    document.querySelector('#coupon-status').onchange = event => { state.status = event.target.value; renderCoupons(); };
    document.querySelector('#coupon-type').onchange = event => { state.type = event.target.value; renderCoupons(); };
    document.querySelectorAll('[data-coupon-edit]').forEach(button => button.onclick = () => openCouponDialog(button.dataset.couponEdit));
    document.querySelectorAll('[data-coupon-toggle]').forEach(button => button.onclick = () => toggleCoupon(button.dataset.couponToggle, button));
  }

  function localDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const two = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
  }

  function openCouponDialog(code = null) {
    const coupon = code === null ? null : state.coupons.find(item => item.code === code);
    if (code !== null && !coupon) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog';
    dialog.innerHTML = `<form class="entity-form">
      <div class="dialog-head"><div><span class="module-kicker">CHECKOUT</span><h2>${coupon ? 'Editar cupom' : 'Novo cupom'}</h2></div><button type="button" class="dialog-close" aria-label="Fechar">×</button></div>
      ${coupon ? `<p class="muted-copy">${Number(coupon.used_count || 0)} utilização(ões). O código não pode ser alterado após a criação; para substituí-lo, crie outro cupom e desative este.</p>` : ''}
      <div class="form-grid">
        <label class="field wide"><span>Código do cupom</span><input name="code" maxlength="40" minlength="3" value="${escapeHtml(coupon?.code || '')}" ${coupon ? 'readonly' : ''} required></label>
        <label class="field"><span>Tipo de desconto</span><select name="discount_type"><option value="percent" ${coupon?.discount_type !== 'fixed' ? 'selected' : ''}>Percentual (%)</option><option value="fixed" ${coupon?.discount_type === 'fixed' ? 'selected' : ''}>Valor fixo (R$)</option></select></label>
        <label class="field"><span>Valor do desconto</span><input name="discount_value" type="number" min="0.01" step="0.01" value="${coupon?.discount_value ?? ''}" required></label>
        <label class="field"><span>Subtotal mínimo (R$)</span><input name="minimum_subtotal" type="number" min="0" step="0.01" value="${coupon?.minimum_subtotal ?? 0}" required></label>
        <label class="check-field"><input name="active" type="checkbox" ${coupon?.active !== false ? 'checked' : ''}><span>Cupom habilitado</span></label>
        <label class="field"><span>Válido a partir de</span><input name="starts_at" type="datetime-local" value="${localDateTime(coupon?.starts_at)}"></label>
        <label class="field"><span>Válido até</span><input name="ends_at" type="datetime-local" value="${localDateTime(coupon?.ends_at)}"></label>
        <label class="field"><span>Limite total de usos</span><input name="max_uses" type="number" min="1" step="1" value="${coupon?.max_uses ?? ''}" placeholder="Sem limite"></label>
        <label class="field"><span>Usos por cliente</span><input name="max_uses_per_customer" type="number" min="1" step="1" value="${coupon?.max_uses_per_customer ?? ''}" placeholder="Sem limite"></label>
        <label class="field wide"><span>IDs dos produtos permitidos, separados por vírgula</span><input name="allowed_product_ids" value="${escapeHtml((coupon?.allowed_product_ids || []).join(', '))}" placeholder="Vazio = todos os produtos"></label>
        <label class="field wide"><span>Categorias permitidas, separadas por vírgula</span><input name="allowed_categories" value="${escapeHtml((coupon?.allowed_categories || []).join(', '))}" placeholder="Vazio = todas as categorias"></label>
      </div>
      <div class="form-error" role="alert"></div>
      <div class="dialog-actions"><button type="button" class="secondary-action dialog-cancel">Cancelar</button><button type="submit" class="admin-primary compact">${coupon ? 'Salvar cupom' : 'Criar cupom'}</button></div>
    </form>`;
    document.body.appendChild(dialog);
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('.dialog-close').onclick = close;
    dialog.querySelector('.dialog-cancel').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.querySelector('form').onsubmit = event => saveCoupon(event, coupon, close);
    dialog.showModal();
  }

  function couponPayload(data, current) {
    const code = String(data.get('code') || '').trim().toUpperCase();
    const discountType = String(data.get('discount_type') || '');
    const discountValue = Number(data.get('discount_value'));
    const minimumSubtotal = Number(data.get('minimum_subtotal'));
    if (code.length < 3 || code.length > 40) throw new Error('O código deve ter entre 3 e 40 caracteres.');
    if (!['percent', 'fixed'].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percent' && discountValue > 100)) throw new Error('Informe um desconto válido (percentual máximo de 100%).');
    if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0) throw new Error('O subtotal mínimo precisa ser zero ou maior.');
    const startsAt = data.get('starts_at') ? new Date(data.get('starts_at')) : null;
    const endsAt = data.get('ends_at') ? new Date(data.get('ends_at')) : null;
    if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime())) || (startsAt && endsAt && endsAt <= startsAt)) throw new Error('A data final precisa ser posterior à inicial.');
    const positiveInteger = (name, label) => {
      const raw = String(data.get(name) || '').trim();
      if (!raw) return null;
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} precisa ser um número inteiro positivo.`);
      return value;
    };
    const maxUses = positiveInteger('max_uses', 'O limite total');
    const perCustomer = positiveInteger('max_uses_per_customer', 'O limite por cliente');
    const idsRaw = String(data.get('allowed_product_ids') || '').trim();
    const productIds = idsRaw ? [...new Set(idsRaw.split(/[\s,;]+/).map(value => Number(value)))] : null;
    if (productIds && productIds.some(value => !Number.isSafeInteger(value) || value < 1)) throw new Error('Informe somente IDs de produtos válidos.');
    const categoriesRaw = String(data.get('allowed_categories') || '').trim();
    const categories = categoriesRaw ? [...new Set(categoriesRaw.split(/[,;\n]+/).map(value => value.trim()).filter(Boolean))] : null;
    const payload = {
      active: data.get('active') === 'on', discount_type: discountType, discount_value: discountValue,
      minimum_subtotal: minimumSubtotal, starts_at: startsAt?.toISOString() || null, ends_at: endsAt?.toISOString() || null,
      max_uses: maxUses, max_uses_per_customer: perCustomer,
      allowed_product_ids: productIds, allowed_categories: categories
    };
    if (!current) payload.code = code;
    return payload;
  }

  async function saveCoupon(event, current, close) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorNode = form.querySelector('.form-error');
    const button = form.querySelector('[type="submit"]');
    errorNode.classList.remove('show');
    let payload;
    try { payload = couponPayload(new FormData(form), current); }
    catch (error) { errorNode.textContent = error.message; errorNode.classList.add('show'); return; }
    button.disabled = true;
    try {
      await api().request(current ? `/rest/v1/checkout_coupons?code=eq.${encodeURIComponent(current.code)}` : '/rest/v1/checkout_coupons', {
        method: current ? 'PATCH' : 'POST', body: payload, headers: { Prefer: 'return=minimal' }
      });
      close();
      await loadCoupons();
      api().toast(current ? 'Cupom atualizado' : 'Cupom criado');
    } catch (error) {
      errorNode.textContent = error.status === 409 ? 'Este código já está cadastrado.' : 'Não foi possível salvar o cupom. Verifique os dados e tente novamente.';
      errorNode.classList.add('show');
      button.disabled = false;
    }
  }

  async function toggleCoupon(code, button) {
    const coupon = state.coupons.find(item => item.code === code);
    if (!coupon) return;
    button.disabled = true;
    try {
      await api().request(`/rest/v1/checkout_coupons?code=eq.${encodeURIComponent(code)}`, {
        method: 'PATCH', body: { active: !coupon.active }, headers: { Prefer: 'return=minimal' }
      });
      coupon.active = !coupon.active;
      renderCoupons();
      api().toast(coupon.active ? 'Cupom ativado' : 'Cupom desativado');
    } catch {
      button.disabled = false;
      api().toast('Não foi possível alterar o cupom');
    }
  }

  async function loadCoupons(force = false) {
    content().innerHTML = '<div class="module-head"><div><h2>CUPONS</h2><p>Carregando dados do Supabase…</p></div></div><section class="admin-card catalog-panel skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></section>';
    try {
      const rows = await api().request('/rest/v1/checkout_coupons?select=*&order=created_at.desc');
      state.coupons = Array.isArray(rows) ? rows : [];
      renderCoupons();
      if (force) api().toast('Cupons atualizados');
    } catch (error) {
      content().innerHTML = `<section class="admin-card module-placeholder"><span>!</span><h2>CUPONS INDISPONÍVEIS</h2><p>${error.status === 404 ? 'A tabela checkout_coupons não está disponível. Confira a migration commerce-001-secure-checkout.sql.' : 'Não foi possível consultar os cupons. Verifique a conexão e tente novamente.'}</p><button class="admin-primary" id="coupons-retry" style="max-width:240px;margin:18px auto 0">Tentar novamente</button></section>`;
      document.querySelector('#coupons-retry').onclick = () => loadCoupons(true);
    }
  }

  window.BLACKOUT_ADMIN_COUPONS = { loadCoupons };
})();
