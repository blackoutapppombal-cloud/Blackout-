(() => {
  function commercial(item) {
    const variants = Array.isArray(item.variants) ? item.variants.filter(value => value.active !== false) : [];
    const selected = variants.length && window.BLACKOUT_CONSOLES ? window.BLACKOUT_CONSOLES.selectedVariant(item) : null;
    return {variants, selected, price:Number(selected?.price ?? item.price), stock:Number(selected?.stock ?? item.stock)};
  }

  card = function (item) {
    const data = commercial(item);
    const visual = item.image ? `<img src="${html(item.image)}" alt="${html(item.name)}" loading="lazy" decoding="async">` : `<span class="product-fallback">${html(item.icon || '🎮')}</span>`;
    const soldOut = data.stock <= 0;
    const oldPrice = Number(item.old ?? item.price);
    const variants = data.variants.length ? `<div class="unified-variant-row" aria-label="${html(data.selected?.option_name || 'Opção')}"><span>${html(data.selected?.option_name || 'Opção')}</span><div>${data.variants.map(variant => `<button type="button" class="${data.selected?.id === variant.id ? 'active' : ''}" data-console-variant="${Number(item.id)}:${Number(variant.id)}" aria-pressed="${data.selected?.id === variant.id}">${html(variant.option_value)}</button>`).join('')}</div></div>` : '';
    return `<article class="product-card unified-product-card ${data.variants.length ? 'has-variants' : ''}" style="--product-glow:${html(item.glow || '#1677aa')}">
      ${Number(item.discount) > 0 ? `<span class="badge">-${Number(item.discount)}%</span>` : ''}
      <button class="favorite ${state.favorites.includes(item.id) ? 'on' : ''}" data-favorite="${Number(item.id)}" aria-label="Favoritar ${html(item.name)}">${state.favorites.includes(item.id) ? '♥' : '♡'}</button>
      <div class="product-visual ${item.image ? 'has-image' : ''}" data-product="${Number(item.id)}">${visual}</div>
      <div class="product-info">
        <small class="product-platform">${html(item.platform || item.brand || item.category)}</small>
        <h3>${html(item.name)}</h3>
        <p class="product-meta">${html(item.condition || 'Novo')} · ${html(item.subcategory || item.category)} <i></i> ${html(item.brand || 'BLACKOUT')}</p>
        ${variants}
        <div class="price">${money(data.price)}</div>
        ${oldPrice > data.price ? `<div class="old-price">${money(oldPrice)}</div>` : '<div class="old-price placeholder">&nbsp;</div>'}
        <div class="stock-inline ${soldOut ? 'out' : ''}">● ${soldOut ? 'ESGOTADO' : `Em estoque · ${data.stock} ${data.stock === 1 ? 'unidade' : 'unidades'}`}</div>
        <div class="card-actions"><button class="buy" data-add="${Number(item.id)}" ${soldOut ? 'disabled' : ''}><span aria-hidden="true">⌑</span>${soldOut ? 'Sem estoque' : 'Adicionar ao carrinho'}</button><button class="details" data-product="${Number(item.id)}" aria-label="Ver detalhes de ${html(item.name)}">›</button></div>
      </div>
    </article>`;
  };

  if (state.route === 'catalog' || state.route === 'offers' || state.route === 'favorites') render();
})();
