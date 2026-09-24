(() => {
  let currentProductId = null;
  const api = () => window.BLACKOUT_ADMIN;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function rowMarkup(variant = {}, index = 0) {
    return `<div class="variant-admin-row" data-variant-row data-variant-id="${variant.id || ''}">
      <span class="variant-index">VARIANTE ${String(index + 1).padStart(2, '0')}</span>
      <label class="field"><span>Nome da variante</span><input data-variant-field="option_name" value="${escapeHtml(variant.option_name || '')}" placeholder="Capacidade"></label>
      <label class="field"><span>Opção</span><input data-variant-field="option_value" value="${escapeHtml(variant.option_value || '')}" placeholder="500 GB"></label>
      <label class="field"><span>Preço</span><input data-variant-field="price" type="number" min="0" step="0.01" value="${variant.price ?? ''}"></label>
      <label class="field"><span>Estoque</span><input data-variant-field="stock" type="number" min="0" step="1" value="${variant.stock ?? 0}"></label>
      <label class="field"><span>SKU</span><input data-variant-field="sku" value="${escapeHtml(variant.sku || '')}" placeholder="BIG-PRODUTO-OPCAO"></label>
      <label class="field"><span>Ordem</span><input data-variant-field="sort_order" type="number" min="0" step="1" value="${variant.sort_order ?? index + 1}"></label>
      <label class="check-field"><input data-variant-field="active" type="checkbox" ${variant.active !== false ? 'checked' : ''}><span>Ativa</span></label>
      <button type="button" class="table-action danger" data-remove-variant>Remover</button>
    </div>`;
  }

  function renumber(list) {
    list.querySelectorAll('[data-variant-row]').forEach((row, index) => {
      row.querySelector('.variant-index').textContent = `VARIANTE ${String(index + 1).padStart(2, '0')}`;
      const order = row.querySelector('[data-variant-field="sort_order"]');
      if (!order.value) order.value = index + 1;
    });
  }

  function readVariants(form) {
    const variants = [...form.querySelectorAll('[data-variant-row]')].map((row, index) => ({
      id: Number(row.dataset.variantId) || null,
      option_name: row.querySelector('[data-variant-field="option_name"]').value.trim(),
      option_value: row.querySelector('[data-variant-field="option_value"]').value.trim(),
      price: Number(row.querySelector('[data-variant-field="price"]').value),
      stock: Number(row.querySelector('[data-variant-field="stock"]').value),
      sku: row.querySelector('[data-variant-field="sku"]').value.trim().toUpperCase(),
      active: row.querySelector('[data-variant-field="active"]').checked,
      sort_order: Number(row.querySelector('[data-variant-field="sort_order"]').value || index + 1)
    }));
    if (variants.some(item => !item.option_name || !item.option_value || !item.sku || !Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.stock) || item.stock < 0)) {
      throw new Error('Preencha nome, opção, preço, estoque e SKU de todas as variantes.');
    }
    const skus = variants.map(item => item.sku);
    if (new Set(skus).size !== skus.length) throw new Error('Cada variante precisa ter um SKU diferente.');
    const options = variants.map(item => `${item.option_name.toLocaleLowerCase('pt-BR')}:${item.option_value.toLocaleLowerCase('pt-BR')}`);
    if (new Set(options).size !== options.length) throw new Error('Não repita a mesma opção no produto.');
    return variants;
  }

  async function syncVariants(productId, variants) {
    const existing = await api().request(`/rest/v1/product_variants?select=*&product_id=eq.${productId}&order=sort_order.asc,id.asc`);
    const incomingIds = new Set(variants.map(item => item.id).filter(Boolean));
    const removed = (existing || []).filter(item => !incomingIds.has(Number(item.id)));
    await Promise.all(removed.map(item => api().request(`/rest/v1/product_variants?id=eq.${item.id}`, {method:'DELETE', headers:{Prefer:'return=minimal'}})));
    for (const variant of variants) {
      const payload = {
        product_id: productId,
        option_name: variant.option_name,
        option_value: variant.option_value,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        active: variant.active,
        sort_order: variant.sort_order
      };
      await api().request(variant.id ? `/rest/v1/product_variants?id=eq.${variant.id}` : '/rest/v1/product_variants', {
        method: variant.id ? 'PATCH' : 'POST',
        body: payload,
        headers: {Prefer:'return=minimal'}
      });
    }
  }

  async function save(event, form, dialog) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const submit = form.querySelector('[type="submit"]');
    const errorNode = form.querySelector('#product-form-error');
    submit.disabled = true;
    submit.textContent = 'Salvando…';
    errorNode.classList.remove('show');
    try {
      const values = new FormData(form);
      const variants = readVariants(form);
      const basePrice = Number(values.get('price'));
      const baseStock = Number(values.get('stock'));
      const payload = {
        name: values.get('name').trim(),
        category: values.get('category'),
        brand: values.get('brand').trim(),
        platform: values.get('platform').trim(),
        price: variants.length ? Math.min(...variants.filter(item => item.active).map(item => item.price), ...variants.map(item => item.price)) : basePrice,
        old_price: Number(values.get('old_price') || basePrice),
        discount: Number(values.get('discount') || 0),
        stock: variants.length ? variants.filter(item => item.active).reduce((sum, item) => sum + item.stock, 0) : baseStock,
        stock_min: Number(values.get('stock_min')),
        image_url: values.get('image_url').trim() || null,
        icon: values.get('icon').trim() || '🎮',
        glow: values.get('glow') || '#ff641e',
        description: values.get('description').trim(),
        active: values.get('active') === 'on'
      };
      const imageFile = values.get('image_file');
      if (imageFile && imageFile.size) payload.image_url = await api().uploadImage(imageFile, 'products');
      const path = currentProductId ? `/rest/v1/products?id=eq.${currentProductId}` : '/rest/v1/products';
      const saved = await api().request(path, {
        method: currentProductId ? 'PATCH' : 'POST',
        body: payload,
        headers: {Prefer:'return=representation'}
      });
      const productId = currentProductId || Number(saved?.[0]?.id);
      if (!productId) throw new Error('O produto foi salvo, mas o identificador não retornou.');
      await syncVariants(productId, variants);
      dialog.close();
      dialog.remove();
      currentProductId = null;
      await window.BLACKOUT_ADMIN_CATALOG.loadProducts(true);
      api().toast(variants.length ? 'Produto e variantes salvos' : 'Produto salvo');
    } catch (error) {
      errorNode.textContent = error.status === 409 ? 'SKU ou opção já cadastrada.' : (error.message || 'Não foi possível salvar produto e variantes.');
      errorNode.classList.add('show');
      submit.disabled = false;
      submit.textContent = currentProductId ? 'Salvar alterações' : 'Cadastrar produto';
    }
  }

  async function enhance(dialog) {
    if (dialog.dataset.variantsEnhanced) return;
    const form = dialog.querySelector('#product-form');
    if (!form) return;
    dialog.dataset.variantsEnhanced = 'true';
    const errorNode = form.querySelector('#product-form-error');
    errorNode.insertAdjacentHTML('beforebegin', `<section class="variant-editor">
      <div class="variant-editor-head"><div><span class="module-kicker">OPÇÕES DO PRODUTO</span><h3>Variantes</h3></div><button type="button" class="secondary-action" id="add-variant">＋ Adicionar variante</button></div>
      <p>Use para armazenamento, memória, cor, edição, modelo ou capacidade. Preço, estoque e SKU são independentes.</p>
      <div id="variant-list" class="variant-list"><div class="variant-loading">Carregando variantes…</div></div>
    </section>`);
    const list = form.querySelector('#variant-list');
    let variants = [];
    try {
      variants = currentProductId ? await api().request(`/rest/v1/product_variants?select=*&product_id=eq.${currentProductId}&order=sort_order.asc,id.asc`) : [];
    } catch (error) {
      list.innerHTML = `<div class="variant-migration">Execute <strong>console-001-product-variants.sql</strong> para ativar variantes.</div>`;
      form.querySelector('#add-variant').disabled = true;
      return;
    }
    list.innerHTML = (variants || []).map(rowMarkup).join('');
    form.querySelector('#add-variant').onclick = () => {
      list.insertAdjacentHTML('beforeend', rowMarkup({}, list.children.length));
      renumber(list);
      list.lastElementChild.querySelector('input')?.focus();
    };
    list.onclick = event => {
      const button = event.target.closest('[data-remove-variant]');
      if (!button) return;
      button.closest('[data-variant-row]').remove();
      renumber(list);
    };
    form.addEventListener('submit', event => save(event, form, dialog), true);
  }

  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-product-edit]');
    if (edit) currentProductId = Number(edit.dataset.productEdit);
    if (event.target.closest('#new-product')) currentProductId = null;
  }, true);

  new MutationObserver(() => {
    document.querySelectorAll('dialog.admin-dialog[open],dialog.admin-dialog').forEach(enhance);
  }).observe(document.body, {childList:true, subtree:true});
})();
