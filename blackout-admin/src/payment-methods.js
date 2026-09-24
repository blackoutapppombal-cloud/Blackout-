(() => {
  const state = { methods: [], search: '' };
  const api = () => window.BLACKOUT_ADMIN;
  const content = () => document.querySelector('#admin-content');
  const escapeHtml = value => api().escapeHtml(value);

  function visibleMethods() {
    const needle = state.search.trim().toLocaleLowerCase('pt-BR');
    return state.methods.filter(method => !needle || [method.code, method.label]
      .some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(needle)));
  }

  function render() {
    const rows = visibleMethods();
    const active = state.methods.filter(method => method.active).length;
    content().innerHTML = `<div class="module-head"><div><span class="module-kicker">CHECKOUT</span><h2>Formas de pagamento</h2><p>Gerencie as opções de pagamento pendente, sem cobrança online.</p></div><button class="admin-primary compact" id="new-payment-method">＋ Nova forma</button></div>
      <div class="catalog-stats"><article class="catalog-stat"><small>CADASTRADAS</small><strong>${state.methods.length}</strong><span>formas no Supabase</span></article><article class="catalog-stat"><small>ATIVAS</small><strong>${active}</strong><span>visíveis no checkout</span></article></div>
      <section class="admin-card catalog-panel"><div class="catalog-toolbar"><label class="search-control"><span>⌕</span><input id="payment-method-search" type="search" placeholder="Buscar código ou nome" value="${escapeHtml(state.search)}"></label><span class="result-count">${rows.length} forma${rows.length === 1 ? '' : 's'}</span></div>
      ${rows.length ? `<div class="catalog-table-wrap"><table class="catalog-table operations-table"><thead><tr><th>Código</th><th>Nome no checkout</th><th>Integração</th><th>Habilitada</th><th>Ações</th></tr></thead><tbody>${rows.map(method => `<tr><td><strong>${escapeHtml(method.code)}</strong></td><td>${escapeHtml(method.label)}</td><td>${method.integration_mode === 'manual_pending' ? 'Confirmação manual' : escapeHtml(method.integration_mode)}</td><td><button class="visibility-toggle ${method.active ? 'on' : ''}" data-payment-toggle="${escapeHtml(method.code)}" aria-label="${method.active ? 'Desativar' : 'Ativar'} ${escapeHtml(method.label)}"><span></span>${method.active ? 'Ativa' : 'Inativa'}</button></td><td><button class="table-action" data-payment-edit="${escapeHtml(method.code)}">Editar</button> <button class="table-action danger" data-payment-delete="${escapeHtml(method.code)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state rich-empty"><span>◈</span><strong>${state.methods.length ? 'Nenhuma forma encontrada' : 'Nenhuma forma cadastrada'}</strong><p>${state.methods.length ? 'Altere a busca para consultar outras formas.' : 'Cadastre uma forma de pagamento para o checkout.'}</p></div>`}</section>`;
    document.querySelector('#new-payment-method').onclick = () => openDialog();
    document.querySelector('#payment-method-search').oninput = event => { state.search = event.target.value; render(); document.querySelector('#payment-method-search').focus(); };
    document.querySelectorAll('[data-payment-edit]').forEach(button => button.onclick = () => openDialog(button.dataset.paymentEdit));
    document.querySelectorAll('[data-payment-toggle]').forEach(button => button.onclick = () => toggleMethod(button.dataset.paymentToggle, button));
    document.querySelectorAll('[data-payment-delete]').forEach(button => button.onclick = () => deleteMethod(button.dataset.paymentDelete, button));
  }

  function openDialog(code = null) {
    const current = code === null ? null : state.methods.find(method => method.code === code);
    if (code !== null && !current) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog';
    dialog.innerHTML = `<form class="entity-form"><div class="dialog-head"><div><span class="module-kicker">CHECKOUT</span><h2>${current ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}</h2></div><button type="button" class="dialog-close" aria-label="Fechar">×</button></div>
      <div class="form-grid"><label class="field"><span>Código</span><input name="code" minlength="2" maxlength="40" pattern="[a-z0-9_-]+" value="${escapeHtml(current?.code || '')}" ${current ? 'readonly' : ''} required></label><label class="field"><span>Nome no checkout</span><input name="label" maxlength="80" value="${escapeHtml(current?.label || '')}" required></label><label class="check-field wide"><input name="active" type="checkbox" ${current?.active ? 'checked' : ''}><span>Disponível no checkout</span></label></div>
      <p class="muted-copy">Novas formas ficam em confirmação manual. Nenhum pagamento é cobrado automaticamente.</p><div class="form-error" role="alert"></div><div class="dialog-actions"><button type="button" class="secondary-action dialog-cancel">Cancelar</button><button type="submit" class="admin-primary compact">${current ? 'Salvar forma' : 'Criar forma'}</button></div></form>`;
    document.body.appendChild(dialog);
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('.dialog-close').onclick = close;
    dialog.querySelector('.dialog-cancel').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.querySelector('form').onsubmit = event => saveMethod(event, current, close);
    dialog.showModal();
  }

  function protectLastActive(current, nextActive) {
    if (current?.active && !nextActive && state.methods.filter(method => method.active).length <= 1) {
      throw new Error('Mantenha ao menos uma forma de pagamento ativa para não interromper o checkout.');
    }
  }

  async function saveMethod(event, current, close) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get('code') || '').trim().toLowerCase();
    const label = String(data.get('label') || '').trim();
    const active = data.get('active') === 'on';
    const errorNode = form.querySelector('.form-error');
    errorNode.classList.remove('show');
    try {
      if (!/^[a-z0-9_-]{2,40}$/.test(code) || !label || label.length > 80) throw new Error('Informe um código de 2 a 40 caracteres e um nome válido.');
      protectLastActive(current, active);
      const payload = current ? { label, active } : { code, label, active, integration_mode: 'manual_pending' };
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      const rows = await api().request(current ? `/rest/v1/checkout_payment_methods?code=eq.${encodeURIComponent(current.code)}` : '/rest/v1/checkout_payment_methods', { method: current ? 'PATCH' : 'POST', body: payload, headers: { Prefer: 'return=representation' } });
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error('A forma de pagamento não foi gravada. Atualize o painel e tente novamente.');
      close();
      await loadPaymentMethods();
      api().toast(current ? 'Forma atualizada' : 'Forma criada');
    } catch (error) {
      errorNode.textContent = error.status === 409 ? 'Este código já está cadastrado.' : error.message || 'Não foi possível salvar a forma de pagamento.';
      errorNode.classList.add('show');
      form.querySelector('[type="submit"]').disabled = false;
    }
  }

  async function toggleMethod(code, button) {
    const current = state.methods.find(method => method.code === code);
    if (!current) return;
    try { protectLastActive(current, !current.active); }
    catch (error) { api().toast(error.message); return; }
    button.disabled = true;
    try {
      const rows = await api().request(`/rest/v1/checkout_payment_methods?code=eq.${encodeURIComponent(code)}`, { method: 'PATCH', body: { active: !current.active }, headers: { Prefer: 'return=representation' } });
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Forma não atualizada.');
      await loadPaymentMethods();
      api().toast(current.active ? 'Forma desativada' : 'Forma ativada');
    } catch { button.disabled = false; api().toast('Não foi possível alterar a forma de pagamento'); }
  }

  async function deleteMethod(code, button) {
    const current = state.methods.find(method => method.code === code);
    if (!current) return;
    try { protectLastActive(current, false); }
    catch (error) { api().toast(error.message); return; }
    if (!confirm(`Excluir a forma “${current.label}” (${current.code})? Pedidos anteriores manterão a forma registrada.`)) return;
    button.disabled = true;
    try {
      const rows = await api().request(`/rest/v1/checkout_payment_methods?code=eq.${encodeURIComponent(code)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Forma não excluída.');
      await loadPaymentMethods();
      api().toast('Forma excluída');
    } catch { button.disabled = false; api().toast('Não foi possível excluir a forma de pagamento'); }
  }

  async function loadPaymentMethods(force = false) {
    content().innerHTML = '<div class="module-head"><div><h2>FORMAS DE PAGAMENTO</h2><p>Carregando dados do Supabase…</p></div></div><section class="admin-card catalog-panel skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div></section>';
    try {
      const rows = await api().request('/rest/v1/checkout_payment_methods?select=code,label,active,integration_mode,created_at&order=created_at.asc');
      state.methods = Array.isArray(rows) ? rows : [];
      render();
      if (force) api().toast('Formas de pagamento atualizadas');
    } catch {
      content().innerHTML = '<section class="admin-card module-placeholder"><span>!</span><h2>FORMAS INDISPONÍVEIS</h2><p>Não foi possível consultar checkout_payment_methods.</p><button class="admin-primary" id="payment-methods-retry" style="max-width:240px;margin:18px auto 0">Tentar novamente</button></section>';
      document.querySelector('#payment-methods-retry').onclick = () => loadPaymentMethods(true);
    }
  }

  window.BLACKOUT_ADMIN_PAYMENT_METHODS = { loadPaymentMethods };
})();
