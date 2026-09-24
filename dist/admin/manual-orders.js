(() => {
  const api = () => window.BLACKOUT_ADMIN;
  const escapeHtml = value => api().escapeHtml(value);
  const money = value => api().money(value);

  function productOptions(products) {
    return `<option value="">Selecione um produto</option>${products.map(item =>
      `<option value="${Number(item.id)}">${escapeHtml(item.name)} — ${money(item.price)} (${Number(item.stock)} em estoque)</option>`
    ).join('')}`;
  }

  function productRow(products) {
    return `<div class="form-grid" data-manual-product-row style="grid-column:1/-1;align-items:end">
      <label class="field"><span>Produto cadastrado</span><select name="product_id" data-product-field required>${productOptions(products)}</select></label>
      <label class="field"><span>Quantidade</span><input name="product_quantity" data-product-field type="number" min="1" max="9999" step="1" value="1" required></label>
      <button type="button" class="table-action" data-remove-manual-product style="grid-column:1/-1;justify-self:end">Remover item</button>
    </div>`;
  }

  async function openDialog(onSaved) {
    let products = [];
    let catalogueError = false;
    try {
      const rows = await api().request('/rest/v1/products?select=id,name,price,stock,active&order=name.asc');
      if (!Array.isArray(rows)) throw new Error('Catálogo indisponível');
      products = rows.filter(item => item.active && Number(item.stock) > 0);
    } catch {
      catalogueError = true;
    }
    const registered = products.length > 0;
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog';
    dialog.innerHTML = `<form class="entity-form">
      <div class="dialog-head"><div><span class="module-kicker">VENDA MANUAL</span><h2>Novo pedido</h2></div><button type="button" class="dialog-close" aria-label="Fechar">×</button></div>
      <div class="form-grid">
        <label class="field"><span>Cliente</span><input name="customer_name" required></label>
        <label class="field"><span>Telefone</span><input name="customer_phone" placeholder="(75) 99999-9999"></label>
        <label class="field"><span>E-mail</span><input name="customer_email" type="email"></label>
        <label class="field"><span>Pagamento</span><select name="payment_method"><option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option></select></label>
        <label class="field wide"><span>Tipo de pedido</span><select name="order_mode">${registered ? '<option value="product">Produtos do catálogo (reserva estoque)</option>' : ''}<option value="free">Operação livre (sem movimentar estoque)</option></select></label>
        <div class="form-grid" id="manual-product-section" style="grid-column:1/-1;display:${registered ? 'grid' : 'none'}">
          <div id="manual-product-rows" class="form-grid" style="grid-column:1/-1">${registered ? productRow(products) : ''}</div>
          <button type="button" class="secondary-action" id="add-manual-product" style="justify-self:start">＋ Adicionar produto</button>
          <label class="field"><span>Total dos produtos</span><input id="manual-product-total" type="text" value="${money(0)}" readonly></label>
          <small id="manual-product-hint" style="align-self:center;color:#8fa0aa">Preço e estoque serão confirmados ao salvar.</small>
        </div>
        <div class="form-grid" id="manual-free-section" style="grid-column:1/-1;display:${registered ? 'none' : 'grid'}">
          <label class="field wide"><span>Descrição dos itens</span><input name="item_name" data-free-field placeholder="Produto ou resumo da venda" ${registered ? 'disabled' : 'required'}></label>
          <label class="field"><span>Quantidade</span><input name="quantity" data-free-field type="number" min="1" step="1" value="1" ${registered ? 'disabled' : 'required'}></label>
          <label class="field"><span>Total</span><input name="total" data-free-field type="number" min="0" step="0.01" ${registered ? 'disabled' : 'required'}></label>
        </div>
        <label class="field"><span>Status</span><select name="status"><option value="recebido">Recebido</option><option value="aguardando_pagamento">Aguardando pagamento</option><option value="pago">Pago</option><option value="em_preparacao">Em preparação</option><option value="pronto">Pronto</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select></label>
        <label class="field wide"><span>Observações internas</span><textarea name="admin_notes" rows="3"></textarea></label>
      </div>
      ${catalogueError ? '<p class="muted-copy">Catálogo temporariamente indisponível. A operação livre continua disponível.</p>' : !registered ? '<p class="muted-copy">Não há produtos ativos com estoque. A operação livre continua disponível.</p>' : ''}
      <div class="form-error" role="alert"></div>
      <div class="dialog-actions"><button type="button" class="secondary-action dialog-cancel">Cancelar</button><button type="submit" class="admin-primary compact">Criar pedido</button></div>
    </form>`;
    document.body.appendChild(dialog);
    const form = dialog.querySelector('form');
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('.dialog-close').onclick = close;
    dialog.querySelector('.dialog-cancel').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    form.dataset.attempt = crypto.randomUUID();

    const syncMode = () => {
      const productMode = form.elements.order_mode.value === 'product';
      dialog.querySelector('#manual-product-section').style.display = productMode ? 'grid' : 'none';
      dialog.querySelector('#manual-free-section').style.display = productMode ? 'none' : 'grid';
      dialog.querySelectorAll('[data-product-field]').forEach(field => { field.disabled = !productMode; });
      dialog.querySelectorAll('[data-free-field]').forEach(field => { field.disabled = productMode; });
      syncTotal();
    };
    const syncTotal = () => {
      let total = 0;
      let valid = true;
      const selected = new Set();
      dialog.querySelectorAll('[data-manual-product-row]').forEach(row => {
        const id = Number(row.querySelector('[name="product_id"]').value);
        const quantity = Number(row.querySelector('[name="product_quantity"]').value);
        const product = products.find(item => Number(item.id) === id);
        if (!product || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > Number(product.stock) || selected.has(id)) valid = false;
        if (product && Number.isSafeInteger(quantity) && quantity > 0) total += Number(product.price) * quantity;
        selected.add(id);
      });
      dialog.querySelector('#manual-product-total').value = money(total);
      dialog.querySelector('#manual-product-hint').textContent = valid ? 'Preço e estoque serão confirmados ao salvar.' : 'Selecione itens diferentes e confira as quantidades em estoque.';
      return valid ? Number(total.toFixed(2)) : null;
    };
    form.elements.order_mode.onchange = syncMode;
    dialog.querySelector('#manual-product-rows').addEventListener('input', syncTotal);
    dialog.querySelector('#manual-product-rows').addEventListener('change', syncTotal);
    dialog.querySelector('#add-manual-product').onclick = () => {
      dialog.querySelector('#manual-product-rows').insertAdjacentHTML('beforeend', productRow(products));
      syncTotal();
    };
    dialog.querySelector('#manual-product-rows').addEventListener('click', event => {
      if (!event.target.closest('[data-remove-manual-product]')) return;
      if (dialog.querySelectorAll('[data-manual-product-row]').length <= 1) return;
      event.target.closest('[data-manual-product-row]').remove();
      syncTotal();
    });
    form.onsubmit = event => saveOrder(event, products, syncTotal, close, onSaved);
    syncMode();
    dialog.showModal();
  }

  async function saveOrder(event, products, syncTotal, close, onSaved) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const button = form.querySelector('[type="submit"]');
    const error = form.querySelector('.form-error');
    const productMode = data.get('order_mode') === 'product';
    let path = '/rest/v1/orders';
    let payload;
    error.classList.remove('show');
    if (productMode) {
      const expectedTotal = syncTotal();
      const items = [...form.querySelectorAll('[data-manual-product-row]')].map(row => ({
        product_id: Number(row.querySelector('[name="product_id"]').value),
        quantity: Number(row.querySelector('[name="product_quantity"]').value)
      }));
      if (expectedTotal === null || !items.length || items.length > 50 || data.get('status') === 'cancelado') {
        error.textContent = 'Selecione até 50 produtos distintos, com estoque suficiente, e um status não cancelado.';
        error.classList.add('show');
        return;
      }
      path = '/rest/v1/rpc/admin_create_manual_product_order';
      payload = {
        p_customer_name: data.get('customer_name').trim(),
        p_customer_phone: data.get('customer_phone').trim(),
        p_customer_email: data.get('customer_email').trim(),
        p_payment_method: data.get('payment_method'),
        p_status: data.get('status'),
        p_admin_notes: data.get('admin_notes').trim(),
        p_items: items,
        p_idempotency_key: form.dataset.attempt,
        p_expected_total: expectedTotal
      };
    } else {
      const quantity = Number(data.get('quantity'));
      const total = Number(data.get('total'));
      if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(total) || total < 0) {
        error.textContent = 'Informe uma quantidade e um total válidos.';
        error.classList.add('show');
        return;
      }
      payload = {
        customer_name: data.get('customer_name').trim(),
        customer_phone: data.get('customer_phone').trim() || null,
        customer_email: data.get('customer_email').trim() || null,
        payment_method: data.get('payment_method'),
        status: data.get('status'),
        admin_notes: data.get('admin_notes').trim() || null,
        total,
        items: [{ name: data.get('item_name').trim(), quantity, unit_price: total / quantity }]
      };
    }
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
      await api().request(path, { method: 'POST', body: payload, headers: { Prefer: 'return=minimal' } });
      close();
      await onSaved();
      api().toast('Pedido criado');
    } catch (err) {
      error.textContent = productMode && err.status === 404
        ? 'Execute admin-005-manual-product-orders.sql no Supabase para habilitar pedidos com produtos.'
        : productMode && err.message && err.message !== 'request_failed'
          ? err.message
          : 'Não foi possível criar o pedido. Confira os dados e tente novamente.';
      error.classList.add('show');
      button.disabled = false;
      button.textContent = 'Criar pedido';
    }
  }

  window.BLACKOUT_ADMIN_MANUAL = { openDialog };
})();
