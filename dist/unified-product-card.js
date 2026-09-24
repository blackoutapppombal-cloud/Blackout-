(() => {
  function selectedCommercialData(item) {
    const variant = item?.variants?.length && window.BLACKOUT_CONSOLES
      ? window.BLACKOUT_CONSOLES.selectedVariant(item)
      : null;
    return {
      price: Number(variant?.price ?? item.price),
      stock: Number(variant?.stock ?? item.stock),
      option: variant ? `${variant.option_name}: ${variant.option_value}` : ''
    };
  }

  card = function (item) {
    const visual = item.image
      ? `<img src="${html(item.image)}" alt="${html(item.name)}" loading="lazy" decoding="async">`
      : `<span class="product-fallback">${html(item.icon || '🎮')}</span>`;
    const commercial = selectedCommercialData(item);
    const soldOut = commercial.stock <= 0;
    const condition = item.condition || 'Novo';
    const type = item.subcategory || item.category;
    const oldPrice = Number(item.old ?? item.price);
    const option = commercial.option ? `<span class="unified-card-option">${html(commercial.option)}</span>` : '';
    return `<article class="product-card unified-product-card" style="--product-glow:${html(item.glow || '#1677aa')}">
      ${Number(item.discount) > 0 ? `<span class="badge">-${Number(item.discount)}%</span>` : ''}
      <button class="favorite ${state.favorites.includes(item.id) ? 'on' : ''}" data-favorite="${Number(item.id)}" aria-label="Favoritar ${html(item.name)}">${state.favorites.includes(item.id) ? '♥' : '♡'}</button>
      <div class="product-visual ${item.image ? 'has-image' : ''}" data-product="${Number(item.id)}">${visual}</div>
      <div class="product-info">
        <small class="product-platform">${html(item.platform || item.brand || item.category)}</small>
        <h3>${html(item.name)}</h3>
        <p class="product-meta">${html(condition)} · ${html(type)} <i></i> ${html(item.brand || 'BLACKOUT')}</p>
        ${option}
        <div class="price">${money(commercial.price)}</div>
        ${oldPrice > commercial.price ? `<div class="old-price">${money(oldPrice)}</div>` : '<div class="old-price placeholder">&nbsp;</div>'}
        <div class="stock-inline ${soldOut ? 'out' : ''}">● ${soldOut ? 'ESGOTADO' : `Em estoque · ${commercial.stock} ${commercial.stock === 1 ? 'unidade' : 'unidades'}`}</div>
        <div class="card-actions">
          <button class="buy" data-add="${Number(item.id)}" ${soldOut ? 'disabled' : ''}><span aria-hidden="true">⌑</span>${soldOut ? 'Sem estoque' : 'Adicionar ao carrinho'}</button>
          <button class="details" data-product="${Number(item.id)}" aria-label="Ver detalhes de ${html(item.name)}">›</button>
        </div>
      </div>
    </article>`;
  };

  const previousRender = render;
  render = function (options) {
    previousRender(options);
    document.querySelectorAll('.catalog-products .product-card').forEach(node => node.classList.add('unified-product-card'));
  };

  if (state.route === 'catalog' || state.route === 'offers' || state.route === 'favorites') render();
})();
