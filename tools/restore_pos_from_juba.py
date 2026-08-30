from pathlib import Path

root = Path('.')
app = root / 'app.js'
css = root / 'styles.css'

app_text = app.read_text(encoding='utf-8')

# Ensure the Five Stars product model preserves optional images.
app_text = app_text.replace(
    "min: Math.max(0, +p.min || 0), unit: p.unit || 'قطعة', cat: p.cat || 'عام'\n",
    "min: Math.max(0, +p.min || 0), unit: p.unit || 'قطعة', cat: p.cat || 'عام', image: p.image || ''\n",
    1,
)

# The current Five Stars runtime did not have a renderProducts implementation even
# though renderAll() calls it. Append a compatible implementation rather than replacing
# the rest of the existing business logic.
if 'function renderProducts() {' not in app_text:
    app_text += r'''

// --- Five Stars POS restored from Juba POS interaction baseline ---
window.__fsPosCategory = window.__fsPosCategory || 'all';

function setPosCategory(category) {
  window.__fsPosCategory = category || 'all';
  renderProducts();
}

function renderProducts() {
  const root = $('products');
  if (!root) return;
  const q = ($('posSearch')?.value || '').trim().toLowerCase();
  const category = window.__fsPosCategory || 'all';
  const list = products.filter((p) => {
    const hay = `${p.name} ${p.barcode} ${p.cat || ''}`.toLowerCase();
    return (!q || hay.includes(q)) && (category === 'all' || (p.cat || 'عام') === category);
  });
  if ($('posItemCount')) $('posItemCount').textContent = `${list.length} صنف`;
  root.innerHTML = list.map((p) => {
    const image = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="product-placeholder">★</div>`;
    const disabled = p.qty < 1 ? ' disabled aria-disabled="true"' : '';
    return `<button class="product-card${p.qty < 1 ? ' is-empty' : ''}" onclick="addCart(${p.id})"${disabled}>
      ${image}
      <div class="product-card-body">
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-meta"><span>${esc(p.cat || 'عام')}</span><b>${money(p.sell)}</b></div>
        <div class="product-stock">${p.qty > 0 ? `المتاح: ${p.qty} ${esc(p.unit)}` : 'نفد المخزون'}</div>
      </div>
    </button>`;
  }).join('') || '<div class="empty">لا توجد أصناف مطابقة</div>';
}

function saveProduct() { addProduct(); }

// Replace the original addProduct with an image-aware version without changing its
// barcode, stock, pricing, or permission rules.
const __originalAddProduct = addProduct;
addProduct = function () {
  if (!requireRole(['مدير','مخزن'])) return;
  const name = $('pName')?.value.trim();
  const barcode = $('pBarcode')?.value.trim();
  if (!name || !barcode) return toast('اسم الصنف والباركود مطلوبان');
  if (products.some(p => p.barcode === barcode)) return toast('الباركود مستخدم بالفعل');
  const p = {
    id: Date.now(),
    name,
    barcode,
    buy: +$('pBuy').value || 0,
    sell: +$('pSell').value || 0,
    qty: Math.max(0, +$('pQty').value || 0),
    min: Math.max(0, +$('pMin').value || 0),
    unit: $('pUnit').value.trim() || 'قطعة',
    cat: $('pCat').value.trim() || 'عام',
    image: $('pImage')?.value.trim() || ''
  };
  products.unshift(p);
  if (p.qty) recordMovement(p.id, 0, p.qty, 'رصيد افتتاحي');
  resetForm(); saveAll(); renderAll(); toast('تم حفظ الصنف');
};
'''

# Append a focused visual layer. Existing Five Stars business logic and data structures stay intact.
css_text = css.read_text(encoding='utf-8')
if 'Five Stars POS — restored Juba interaction baseline v2' not in css_text:
    css_text += r'''

/* Five Stars POS — restored Juba interaction baseline v2 */
.pos{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:18px;align-items:start}
.pos>.panel:first-child{border-radius:22px;padding:18px;box-shadow:0 12px 30px rgba(15,23,42,.06)}
.pos>.panel:first-child>.toolbar{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border-radius:19px;padding:14px 16px;gap:10px}
.pos>.panel:first-child>.toolbar h3{font-size:17px;min-width:max-content}
.pos>.panel:first-child>.toolbar .input{flex:1;min-width:220px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff}
.pos>.panel:first-child>.toolbar .input::placeholder{color:#cbd5e1}
.pos>.panel:first-child>.toolbar .input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(147,197,253,.12)}
.products{grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px;max-height:calc(100vh - 310px);padding:3px;margin-top:14px}
.product-card{display:block;width:100%;overflow:hidden;border:1px solid #e2e8f0;background:#fff;border-radius:18px;text-align:right;padding:0;min-height:214px;box-shadow:0 4px 14px rgba(15,23,42,.045);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.product-card:hover:not(:disabled){border-color:#60a5fa;transform:translateY(-2px);box-shadow:0 14px 28px rgba(15,23,42,.09)}
.product-card:disabled,.product-card.is-empty{opacity:.58;cursor:not-allowed}
.product-card img,.product-placeholder{display:grid;width:100%;height:120px;object-fit:cover;place-items:center;background:linear-gradient(135deg,#e2e8f0,#f8fafc);color:#64748b;font-size:30px}
.product-card-body{padding:11px 12px}
.product-name{font-size:14px;font-weight:900;line-height:1.45;min-height:40px}
.product-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px}
.product-meta span{font-size:10px;color:#64748b}.product-meta b{font-size:17px;color:#2563eb}.product-stock{margin-top:6px;font-size:10px;color:#94a3b8}
.pos>.cart-panel{background:#fff;border:1px solid #e5eaf0;border-radius:22px;display:flex;flex-direction:column;position:sticky;top:18px;height:calc(100vh - 150px);min-height:560px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,.08)}
.pos>.cart-panel>.toolbar{padding:16px 18px;border-bottom:1px solid #eef2f6;margin:0;background:#fff}
.pos>.cart-panel>.toolbar h3{font-size:17px}
.pos>.cart-panel>.toolbar h3::before{content:'🕊️';display:inline-grid;place-items:center;width:40px;height:40px;border-radius:13px;background:#eff6ff;margin-left:9px;font-size:21px;vertical-align:middle}
#cart{flex:1;overflow:auto;padding:10px 15px}
#cart .cart-row{grid-template-columns:1fr auto auto auto;gap:8px;padding:12px 2px}
#cart .cart-row>b{font-size:12px;white-space:nowrap}
#cart .qty{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:2px}
#cart .qty button{width:28px;height:28px}
.pos>.cart-panel>.total-row{margin:0;border-radius:0;border-top:1px solid #eef2f6;background:#fbfdff;padding:14px 16px}
.pos>.cart-panel>.form.compact{padding:12px 15px 0}
.pos>.cart-panel>.actions{padding:0 15px 15px;margin-top:10px}
.pos>.cart-panel>.held{padding:0 15px 12px}
.scanner{background:#eff6ff;border:1px dashed #60a5fa;border-radius:16px;padding:13px 15px;margin-bottom:12px}
.scanner-row{grid-template-columns:minmax(0,1fr) auto}
@media(max-width:1050px){.pos{grid-template-columns:1fr}.pos>.cart-panel{position:static;height:auto;min-height:520px}.products{max-height:52vh}}
@media(max-width:650px){.products{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.product-card{min-height:192px}.product-card img,.product-placeholder{height:92px}.pos>.panel:first-child>.toolbar{flex-wrap:wrap}.pos>.panel:first-child>.toolbar .input{min-width:100%;order:3}}
'''

app.write_text(app_text, encoding='utf-8')
css.write_text(css_text, encoding='utf-8')
print('Five Stars POS restore patch applied')
PY
