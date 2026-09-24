(() => {
  let selectedProductId = null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-product-edit]');
    if (edit) selectedProductId = Number(edit.dataset.productEdit);
    if (event.target.closest('#new-product')) selectedProductId = null;
  }, true);

  async function productExtras() {
    if (!selectedProductId || !window.BLACKOUT_ADMIN) return null;
    const rows = await window.BLACKOUT_ADMIN.request(`/rest/v1/products?select=subcategory,condition,product_status,search_terms&id=eq.${selectedProductId}`);
    return Array.isArray(rows) ? rows[0] : null;
  }

  async function enhance(dialog) {
    if (dialog.dataset.extraFieldsEnhanced) return;
    const form = dialog.querySelector('#product-form');
    if (!form) return;
    dialog.dataset.extraFieldsEnhanced = 'true';
    let values = null;
    try { values = await productExtras(); } catch {}
    const category = form.querySelector('[name="category"]')?.closest('label');
    if (!category) return;
    category.insertAdjacentHTML('afterend', `
      <label class="field"><span>Modelo / subcategoria</span><input name="subcategory" value="${escapeHtml(values?.subcategory || '')}" placeholder="Ex.: Slim, Pro ou Controles"></label>
      <label class="field"><span>Condição</span><select name="condition"><option value="Novo" ${!values?.condition || values.condition === 'Novo' ? 'selected' : ''}>Novo</option><option value="Seminovo" ${values?.condition === 'Seminovo' ? 'selected' : ''}>Seminovo</option><option value="Usado" ${values?.condition === 'Usado' ? 'selected' : ''}>Usado</option></select></label>
      <label class="field"><span>Status comercial</span><select name="product_status"><option value="Em estoque" ${!values?.product_status || values.product_status === 'Em estoque' ? 'selected' : ''}>Em estoque</option><option value="Esgotado" ${values?.product_status === 'Esgotado' ? 'selected' : ''}>Esgotado</option><option value="Sob consulta" ${values?.product_status === 'Sob consulta' ? 'selected' : ''}>Sob consulta</option></select></label>
      <label class="field wide"><span>Termos de busca</span><input name="search_terms" value="${escapeHtml(values?.search_terms || '')}" placeholder="DualSense, Controle PS5, Controle Sony"></label>`);
  }

  new MutationObserver(() => {
    document.querySelectorAll('dialog.admin-dialog').forEach(enhance);
  }).observe(document.body, {childList:true, subtree:true});

  const timer = setInterval(() => {
    if (!window.BLACKOUT_ADMIN || window.BLACKOUT_ADMIN.__extraFieldsWrapped) return;
    const originalRequest = window.BLACKOUT_ADMIN.request;
    window.BLACKOUT_ADMIN.request = function (path, options = {}) {
      if (/\/rest\/v1\/products(?:\?|$)/.test(path) && ['POST','PATCH'].includes(options.method)) {
        const form = document.querySelector('#product-form');
        if (form) {
          const values = new FormData(form);
          options = {...options, body:{...(options.body || {}), subcategory:String(values.get('subcategory') || '').trim(), condition:String(values.get('condition') || 'Novo'), product_status:String(values.get('product_status') || 'Em estoque'), search_terms:String(values.get('search_terms') || '').trim()}};
        }
      }
      return originalRequest(path, options);
    };
    window.BLACKOUT_ADMIN.__extraFieldsWrapped = true;
    clearInterval(timer);
  }, 50);
})();
