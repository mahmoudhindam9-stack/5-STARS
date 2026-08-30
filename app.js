const defaultCategories = [
  'لمبات وإضاءة',
  'كابلات وأسلاك',
  'مفاتيح وبرايز',
  'قواطع ولوحات',
  'أفياش وتوصيلات',
  'لوازم تركيب',
  'أدوات ومعدات',
  'شواحن وبطاريات',
  'مراوح وتهوية'
];

const seed = [
  ['لمبة LED 12W فينوس', '10000001', 35, 55, 80, 10, 'قطعة', 'لمبات وإضاءة'],
  ['كابل نحاس معتمد 2.5 مم', '10000002', 120, 175, 35, 10, 'متر', 'كابلات وأسلاك'],
  ['مفتاح إنارة مفرد فينوس', '10000003', 18, 30, 120, 10, 'قطعة', 'مفاتيح وبرايز'],
  ['بريزة شاسيه مزدوجة إيطالي', '10000004', 28, 45, 75, 10, 'قطعة', 'مفاتيح وبرايز'],
  ['قاطع أوتوماتيك 16 أمبير ABB', '10000005', 65, 90, 30, 10, 'قطعة', 'قواطع ولوحات'],
  ['فيش ثلاثي مع تأريض أصلي', '10000006', 22, 38, 50, 10, 'قطعة', 'أفياش وتوصيلات'],
  ['شاسيه مفاتيح فينوس 3 فتحة', '10000007', 12, 20, 100, 15, 'قطعة', 'لوازم تركيب'],
  ['شريط لحام عازل 3M أصلي', '10000008', 8, 15, 150, 20, 'بكرة', 'لوازم تركيب'],
  ['مروحة سقف توشيبا 56 بوصة', '10000009', 650, 850, 14, 3, 'قطعة', 'مراوح وتهوية']
];

const K = {
  p: 'fs_products', c: 'fs_customers', sup: 'fs_suppliers', s: 'fs_sales', e: 'fs_expenses',
  u: 'fs_users', h: 'fs_held_carts', m: 'fs_movements', r: 'fs_receipts',
  cfg: 'fs_settings', cat: 'fs_categories'
};

const $ = id => document.getElementById(id);
const money = n => `${(+n || 0).toFixed(2)} ${cfg().currency || 'ج'}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[x]));
const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; }
  catch { return d; }
};

const initialCustomerSeed = [
  { id: '101', name: 'المهندس أحمد مصطفى (مقاولات)', phone: '01012345678', address: 'التجمع الخامس - القاهرة', balance: 1450 },
  { id: '102', name: 'الأستاذ محمود إبراهيم (كهربائي)', phone: '01123456789', address: 'مدينة نصر - القاهرة', balance: 0 },
  { id: '103', name: 'شركة النور للأعمال الهندسية', phone: '01234567890', address: 'الدقي - الجيزة', balance: 3200 },
  { id: '104', name: 'الحاج فؤاد حسن (عميل مميز)', phone: '01555554433', address: 'شبرا - مصر', balance: 0 }
];

const initialSupplierSeed = [
  { id: '201', name: 'م. حسام الدين', company: 'مجموعة السويدي إلكتريك للكابلات', phone: '01099887766', address: 'العاشر من رمضان - المنطقة الصناعية', balance: 18500, notes: 'توريد كابلات وأسلاك نحاس معتمدة بخصم وكيل' },
  { id: '202', name: 'أ. طارق الشناوي', company: 'شركة فينوس للأدوات والإنارة', phone: '01144332211', address: 'مدينة العبور - القليوبية', balance: 6400, notes: 'لمبات LED، مفاتيح، وشاسيهات فينوس' },
  { id: '203', name: 'الحاج رشدي عبد العال', company: 'مؤسسة النور للتوريدات وقواطع ABB', phone: '01288776655', address: 'باب اللوق - وسط البلد', balance: 0, notes: 'قواطع أوتوماتيك ولوحات توزيع رئيسية' }
];

let products = normalizeProducts(read(K.p, null));
let customers = read(K.c, null);
if (!Array.isArray(customers) || customers.length === 0) {
  customers = initialCustomerSeed;
}
let suppliers = read(K.sup, null);
if (!Array.isArray(suppliers) || suppliers.length === 0) {
  suppliers = initialSupplierSeed;
}
let categories = read(K.cat, null);
if (!Array.isArray(categories) || categories.length === 0) {
  categories = [...defaultCategories];
}
function syncCategories() {
  const used = products.map(p => (p.cat || 'عام').trim()).filter(Boolean);
  const combined = Array.from(new Set([...defaultCategories, ...categories, ...used]));
  categories = combined;
  localStorage.setItem(K.cat, JSON.stringify(categories));
}
syncCategories();
let sales = read(K.s, []);
window.sales = sales;
let expenses = read(K.e, []);
let users = read(K.u, [{ id: 1, name: 'admin', role: 'مدير', pass: 'FiveStars@2026' }]);
let heldCarts = read(K.h, []);
let movements = read(K.m, []);
let receipts = read(K.r, []);
let settings = { shopName: 'Five Stars', currency: 'ج', ...(read(K.cfg, {}) || {}) };
let cart = [];
let cameraStream = null;
let cameraMode = 'pos';
let cameraDetector = null;
let cameraTimer = null;

function cfg() { return settings || { shopName: 'Five Stars', currency: 'ج' }; }
function saveAll() {
  localStorage.setItem(K.p, JSON.stringify(products));
  localStorage.setItem(K.c, JSON.stringify(customers));
  localStorage.setItem(K.sup, JSON.stringify(suppliers));
  localStorage.setItem(K.cat, JSON.stringify(categories));
  localStorage.setItem(K.s, JSON.stringify(sales));
  localStorage.setItem(K.e, JSON.stringify(expenses));
  localStorage.setItem(K.u, JSON.stringify(users));
  localStorage.setItem(K.h, JSON.stringify(heldCarts));
  localStorage.setItem(K.m, JSON.stringify(movements));
  localStorage.setItem(K.r, JSON.stringify(receipts));
  localStorage.setItem(K.cfg, JSON.stringify(settings));
}
function normalizeProducts(raw) {
  if (!Array.isArray(raw)) return seed.map((x, i) => ({ id:i+1, name:x[0], barcode:x[1], buy:x[2], sell:x[3], qty:x[4], min:x[5], unit:x[6], cat:x[7] }));
  return raw.map((p, i) => ({
    id: p.id ?? Date.now() + i,
    name: String(p.name ?? '').trim(), barcode: String(p.barcode ?? '').trim(),
    buy: +p.buy || 0, sell: +p.sell || 0, qty: Math.max(0, +p.qty || 0),
    min: Math.max(0, +p.min || 0), unit: p.unit || 'قطعة', cat: p.cat || 'عام'
  }));
}
if (!users.some(u => u.name === 'admin')) users.unshift({ id:1, name:'admin', role:'مدير', pass:'FiveStars@2026' });
else {
  const a = users.find(u => u.name === 'admin');
  if (!a.pass) a.pass = 'FiveStars@2026';
  if (!a.role) a.role = 'مدير';
}
saveAll();

function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.style.display = 'none', 2200);
}
function todayKey() { return new Date().toISOString().slice(0,10); }
function datePart(v) { 
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toISOString().slice(0,10);
}
function sum(arr, fn) { return arr.reduce((a, x) => a + (+fn(x) || 0), 0); }
function customerName(id) { return customers.find(c => String(c.id) === String(id))?.name || 'عميل نقدي'; }
function userName(id) { return users.find(u => String(u.id) === String(id))?.name || '-'; }
function currentSession() { try { return JSON.parse(localStorage.getItem('fs_session') || sessionStorage.getItem('fs_session') || 'null'); } catch { return null; } }
function requireRole(roles, silent = false) {
  const s = currentSession();
  const ok = s && roles.includes(s.role);
  if (!ok && !silent) toast('ليس لديك صلاحية لهذا الإجراء');
  return ok;
}

function go(page) {
  if (!page) return;
  const btn = document.querySelector(`.nav button[data-page="${page}"]`);
  if (btn && btn.style.display !== 'none') btn.click();
}
function showHelp() {
  openModal('مساعدة Five Stars', `<div class="panel" style="box-shadow:none;padding:0">
    <p><b>الكاشير:</b> امسح الباركود ثم Enter، أو اختر الصنف، ثم أتمم البيع.</p>
    <p><b>تعليق البيع:</b> اضغط تعليق لحفظ السلة مؤقتًا ثم استرجعها لاحقًا.</p>
    <p><b>الاختصارات:</b> F2 إتمام البيع، F4 تفريغ، F8 بحث، F9 تعليق، F10 استرجاع.</p>
    <p><b>المخزن:</b> أي تعديل كمية مباشر يُسجل كتسوية، مع الاحتفاظ بسجل الحركة.</p>
    <p><b>النسخ الاحتياطي:</b> من الإعدادات أو التقارير.</p>
  </div>`);
}

function login() {
  const n = $('loginUser').value.trim(), p = $('loginPass').value;
  const remember = $('loginRemember')?.checked;
  const u = users.find(x => x.name === n && x.pass === p);
  if (!u) { $('loginError').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة'; return; }
  const session = { id:u.id, name:u.name, role:u.role, loginAt:new Date().toISOString() };
  if (remember) {
    localStorage.setItem('fs_session', JSON.stringify(session));
    localStorage.setItem('fs_remember_user', n);
    sessionStorage.removeItem('fs_session');
  } else {
    sessionStorage.setItem('fs_session', JSON.stringify(session));
    localStorage.removeItem('fs_session');
    localStorage.removeItem('fs_remember_user');
  }
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  setCurrentUser(); applyRole(u.role); renderAll(); setTimeout(() => $('posBarcode')?.focus(), 50);
  $('loginError').textContent = '';
}
function logout() { sessionStorage.removeItem('fs_session'); localStorage.removeItem('fs_session'); location.reload(); }
function setCurrentUser() {
  const s = currentSession(); if (!s) return;
  const label = `${s.name} • ${s.role}`;
  if ($('currentUser')) $('currentUser').textContent = label;
}
function applyRole(role) {
  const allow = {
    'مدير': ['dashboard','pos','inventory','suppliers','customers','accounts','reports','users','settings'],
    'كاشير': ['pos','customers'],
    'مخزن': ['inventory','suppliers'],
    'حسابات': ['accounts','reports','suppliers','customers']
  }[role] || ['pos'];
  document.querySelectorAll('.nav button').forEach(b => {
    b.style.display = allow.includes(b.dataset.page) ? '' : 'none';
  });
  const current = document.querySelector('.nav button.active');
  if (!current || current.style.display === 'none') {
    const first = document.querySelector('.nav button[style=""] , .nav button:not([style])');
    const target = [...document.querySelectorAll('.nav button')].find(x => x.style.display !== 'none');
    if (target) target.click();
  }
}

function navInit() {
  document.querySelectorAll('.nav button').forEach(b => b.onclick = () => {
    if (b.style.display === 'none') return;
    document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.page').forEach(x => x.classList.add('hidden'));
    const p = $(b.dataset.page); if (p) p.classList.remove('hidden');
    const textSpan = b.querySelector('.text');
    if ($('pageTitle')) $('pageTitle').textContent = textSpan ? textSpan.textContent.trim() : b.textContent.replace(/^[^\s]+\s*/, '');
    if (b.dataset.page === 'pos') {
      setTimeout(() => $('posBarcode')?.focus(), 20);
    }
  });
}

function addCart(id) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p || p.qty < 1) return toast('الصنف غير متاح');
  const x = cart.find(i => String(i.id) === String(id));
  if (x) {
    if (x.qty >= p.qty) return toast('الكمية غير كافية');
    x.qty += 1;
  } else cart.push({ id:p.id, qty:1, discount:0 });
  renderCart();
}
function qty(id, d) {
  const x = cart.find(i => String(i.id) === String(id));
  const p = products.find(i => String(i.id) === String(id));
  if (!x || !p) return;
  if (d > 0 && x.qty >= p.qty) return toast('الكمية غير كافية');
  x.qty += d;
  if (x.qty <= 0) cart = cart.filter(i => String(i.id) !== String(id));
  renderCart();
}
function removeCart(id) { cart = cart.filter(i => String(i.id) !== String(id)); renderCart(); }
function clearCart() {
  if (cart.length > 0 && !confirm('هل أنت متأكد من تفريغ سلة المشتريات؟')) return;
  cart = []; renderCart(); $('posBarcode')?.focus();
}
function cartTotals() {
  const subtotal = sum(cart, x => { const p=products.find(p=>String(p.id)===String(x.id)); return p ? p.sell * x.qty : 0; });
  const discount = Math.min(Math.max(0, +($('cartDiscount')?.value || 0)), subtotal);
  const taxRate = Math.max(0, +($('cartTax')?.value || 0));
  const taxable = subtotal - discount;
  const tax = taxable * taxRate / 100;
  return { subtotal, discount, taxRate, tax, total: taxable + tax };
}
function renderCart() {
  const root = $('cart'); if (!root) return;
  const t = cartTotals();
  
  if (!cart.length) {
    root.innerHTML = `
      <div class="pos-v2-cart-empty">
        <div class="pos-v2-empty-circle">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <h4 class="pos-v2-empty-title">سلة المشتريات فارغة</h4>
        <p class="pos-v2-empty-desc">اضغط على الأصناف لإضافتها</p>
      </div>
    `;
    if ($('posCheckoutBtn')) $('posCheckoutBtn').classList.add('is-empty');
  } else {
    root.innerHTML = cart.map(x => {
      const p = products.find(p => String(p.id) === String(x.id));
      if (!p) return '';
      const v = p.sell * x.qty;
      return `
        <div class="pos-v2-cart-item">
          <div class="pos-v2-item-info">
            <div class="pos-v2-item-name">${esc(p.name)}</div>
            <div class="pos-v2-item-price">${money(p.sell)} × ${x.qty} ${esc(p.unit)}</div>
          </div>
          <div class="pos-v2-item-qty-ctrl">
            <button type="button" class="pos-v2-qty-btn" onclick="qty(${p.id},-1)">−</button>
            <span class="pos-v2-qty-val">${x.qty}</span>
            <button type="button" class="pos-v2-qty-btn" onclick="qty(${p.id},1)">+</button>
          </div>
          <div class="pos-v2-item-total">${money(v)}</div>
          <button type="button" class="pos-v2-item-del-btn" onclick="removeCart(${p.id})" title="حذف">✕</button>
        </div>
      `;
    }).join('');
    if ($('posCheckoutBtn')) $('posCheckoutBtn').classList.remove('is-empty');
  }

  const countItems = sum(cart, x => x.qty);
  if ($('cartSubtotal')) $('cartSubtotal').textContent = money(t.subtotal);
  if ($('cartTotal')) $('cartTotal').textContent = money(t.total);
  if ($('cartBtnTotal')) $('cartBtnTotal').textContent = money(t.total);
  if ($('cartCount')) $('cartCount').textContent = countItems ? `${countItems} صنف` : '0 صنف';
}
function scan(code, mode='pos') {
  const v=String(code||'').trim(); if (!v) return;
  const p=products.find(x=>x.barcode===v);
  if (mode==='pos') {
    if (p) addCart(p.id); else toast('الباركود غير مسجل');
    if ($('posBarcode')) { $('posBarcode').value=''; $('posBarcode').focus(); }
  } else {
    if ($('pBarcode')) $('pBarcode').value=v;
    toast(p ? `تم العثور على: ${p.name}` : 'تم إدخال الباركود؛ الصنف غير موجود ويمكن إضافته');
  }
}
function focusBarcode() { go('pos'); setTimeout(()=>$('posBarcode')?.focus(),50); }

function recordMovement(productId, before, after, reason, refId=null) {
  const p=products.find(x=>String(x.id)===String(productId));
  movements.unshift({ id:Date.now()+Math.random(), date:new Date().toISOString(), productId, product:p?.name||'', before:+before||0, after:+after||0, delta:(+after||0)-(+before||0), reason, refId, userId:currentSession()?.id||null });
  movements = movements.slice(0, 1000);
}
function checkout() {
  if (!requireRole(['مدير','كاشير'])) return;
  if (!cart.length) return toast('السلة فارغة');
  const payment=$('payment')?.value || 'نقدي';
  const customer=$('customerSelect')?.value || '';
  if (payment==='آجل' && !customer) return toast('اختر عميلًا للبيع الآجل');
  const t=cartTotals();
  const items=[];
  for (const x of cart) {
    const p=products.find(p=>String(p.id)===String(x.id));
    if (!p || x.qty<1 || x.qty>p.qty) return toast('راجع كميات الأصناف');
    items.push({ id:p.id, name:p.name, barcode:p.barcode, unit:p.unit, qty:x.qty, buy:p.buy, sell:p.sell, total:p.sell*x.qty });
  }
  const id=Date.now();
  for (const item of items) {
    const p=products.find(p=>p.id===item.id); const before=p.qty; p.qty-=item.qty; recordMovement(p.id,before,p.qty,'بيع',id);
  }
  const sale={id, invoiceNo:`FS-${String(id).slice(-8)}`, date:new Date().toISOString(), userId:currentSession()?.id||null,
    customer, payment, subtotal:t.subtotal, discount:t.discount, taxRate:t.taxRate, tax:t.tax,
    total:t.total, cost:sum(items,i=>i.buy*i.qty), items};
  sales.unshift(sale);
  if (payment==='آجل') {
    const c=customers.find(c=>String(c.id)===String(customer));
    if(c) c.balance=(+c.balance||0)+t.total;
  }
  receipts.unshift({ id:id+1, saleId:id, type:'sale', date:sale.date, total:sale.total });
  cart=[]; if($('cartDiscount')) $('cartDiscount').value=0; if($('cartTax')) $('cartTax').value=0;
  if($('posCustomerSearch')) $('posCustomerSearch').value='';
  if($('customerSelect')) $('customerSelect').value='';
  saveAll(); renderAll(); printInvoice(sale); toast(`تم حفظ الفاتورة ${sale.invoiceNo}`);
}
function holdCart() {
  if (!cart.length) return toast('السلة فارغة');
  const id=Date.now();
  heldCarts.unshift({ id, createdAt:new Date().toISOString(), userId:currentSession()?.id||null, cart:JSON.parse(JSON.stringify(cart)), payment:$('payment')?.value||'نقدي', customer:$('customerSelect')?.value||'', discount:+($('cartDiscount')?.value||0), tax:+($('cartTax')?.value||0) });
  cart=[]; 
  if($('posCustomerSearch')) $('posCustomerSearch').value='';
  if($('customerSelect')) $('customerSelect').value='';
  renderCart(); saveAll(); renderHeld(); toast('تم تعليق البيع');
}
function restoreCart() {
  if (!heldCarts.length) return toast('لا توجد مبيعات معلقة');
  const h=heldCarts.shift(); cart=h.cart||[];
  if($('payment')) $('payment').value=h.payment||'نقدي';
  if($('customerSelect')) {
    $('customerSelect').value=h.customer||'';
    syncCustomerField(h.customer||'');
  }
  if($('cartDiscount')) $('cartDiscount').value=h.discount||0;
  if($('cartTax')) $('cartTax').value=h.tax||0;
  renderCart(); renderHeld(); saveAll(); toast('تم استرجاع البيع المعلق');
}
function renderHeld() {
  const root=$('heldSales'); if(!root) return;
  root.innerHTML = heldCarts.length ? `<div class="muted">مبيعات معلقة: <b>${heldCarts.length}</b></div>` : '';
}

function ensureCategoryExists(catName) {
  const c = String(catName || '').trim();
  if (!c || c === 'all' || c === 'الكل') return;
  if (!categories.includes(c)) {
    categories.push(c);
    syncCategories();
  }
}

function quickAddCategoryModal() {
  if (!requireRole(['مدير','مخزن','كاشير'])) return;
  openModal('إضافة تصنيف جديد', `
    <div class="form">
      <input id="qCatName" class="input wide" placeholder="اسم التصنيف (مثال: أدوات ومعدات، شواحن...)" autofocus>
      <button type="button" class="btn primary wide" onclick="saveQuickCategory()">حفظ التصنيف</button>
    </div>
  `);
}

function saveQuickCategory() {
  const name = $('qCatName')?.value.trim();
  if (!name) return toast('اسم التصنيف مطلوب');
  if (categories.includes(name)) return toast('التصنيف موجود بالفعل');
  categories.push(name);
  saveAll();
  closeModal();
  renderAll();
  if ($('pCat')) $('pCat').value = name;
  toast(`تمت إضافة تصنيف "${name}" بنجاح`);
}

function renderCategoriesDatalist() {
  const dl = $('categoriesDatalist');
  if (!dl) return;
  const allKnownCats = Array.from(new Set([...categories, ...products.map(p => (p.cat || '').trim()).filter(Boolean)]));
  dl.innerHTML = allKnownCats.map(c => `<option value="${esc(c)}"></option>`).join('');
}

function addProduct() {
  if (!requireRole(['مدير','مخزن'])) return;
  const name=$('pName')?.value.trim(), barcode=$('pBarcode')?.value.trim();
  if(!name || !barcode) return toast('اسم الصنف والباركود مطلوبان');
  if(products.some(p=>p.barcode===barcode)) return toast('الباركود مستخدم بالفعل');
  const cat = $('pCat')?.value.trim() || 'عام';
  ensureCategoryExists(cat);
  const p={ id:Date.now(), name, barcode, buy:+$('pBuy').value||0, sell:+$('pSell').value||0, qty:Math.max(0,+$('pQty').value||0), min:Math.max(0,+$('pMin').value||0), unit:$('pUnit').value.trim()||'قطعة', cat };
  products.unshift(p);
  if(p.qty) recordMovement(p.id,0,p.qty,'رصيد افتتاحي');
  resetForm(); saveAll(); renderAll(); toast('تم حفظ الصنف');
}
const saveProduct = addProduct;

function resetForm(){['pName','pBarcode','pBuy','pSell','pQty','pMin','pUnit','pCat'].forEach(id=>{if($(id)) $(id).value=''}); if($('pQty')) $('pQty').value=0; if($('pMin')) $('pMin').value=0;}
function editProduct(id) {
  if (!requireRole(['مدير','مخزن'])) return;
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  openModal('تعديل الصنف', `<div class="form"><input id="mName" class="input" value="${esc(p.name)}"><input id="mBarcode" class="input" value="${esc(p.barcode)}"><input id="mBuy" class="input" type="number" min="0" step="0.01" value="${p.buy}"><input id="mSell" class="input" type="number" min="0" step="0.01" value="${p.sell}"><input id="mQty" class="input" type="number" min="0" value="${p.qty}"><input id="mMin" class="input" type="number" min="0" value="${p.min}"><input id="mUnit" class="input" value="${esc(p.unit)}"><input id="mCat" class="input" list="categoriesDatalist" value="${esc(p.cat)}" placeholder="التصنيف"><button class="btn primary wide" onclick="updateProduct(${p.id})">حفظ</button></div>`);
}
function updateProduct(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  const b=$('mBarcode').value.trim(); if(!b) return toast('الباركود مطلوب');
  if(products.some(x=>String(x.id)!==String(id)&&x.barcode===b)) return toast('الباركود مستخدم');
  if(!requireRole(['مدير','مخزن'])) return;
  const before=p.qty;
  const cat = $('mCat')?.value.trim() || 'عام';
  ensureCategoryExists(cat);
  Object.assign(p,{name:$('mName').value.trim(),barcode:b,buy:+$('mBuy').value||0,sell:+$('mSell').value||0,qty:Math.max(0,+$('mQty').value||0),min:Math.max(0,+$('mMin').value||0),unit:$('mUnit').value.trim()||'قطعة',cat});
  if(before!==p.qty) recordMovement(p.id,before,p.qty,'تسوية يدوية');
  saveAll(); closeModal(); renderAll(); toast('تم تحديث الصنف');
}
function delProduct(id){
  if(!requireRole(['مدير'])) return;
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  if(confirm(`حذف ${p.name}؟`)){products=products.filter(x=>String(x.id)!==String(id)); cart=cart.filter(x=>String(x.id)!==String(id)); saveAll(); renderAll();}
}
function renderInventory(){
  renderCategoriesDatalist();
  const q=($('invSearch')?.value||'').toLowerCase();
  const a=products.filter(p=>(`${p.name} ${p.barcode} ${p.cat} ${p.unit}`).toLowerCase().includes(q));
  const root=$('invTable'); if(!root) return;
  root.innerHTML=a.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.barcode)}</td><td><span class="badge" style="background:#f1f5f9; color:#0f172a; font-weight:700; border:1px solid #e2e8f0;">${esc(p.cat || 'عام')}</span></td><td>${esc(p.unit)}</td><td class="${p.qty<=p.min?'low':''}">${p.qty}</td><td>${money(p.buy)}</td><td>${money(p.sell)}</td><td><button class="btn secondary" onclick="editProduct(${p.id})">تعديل</button> <button class="btn secondary" onclick="openQuickAdjustmentModal(${p.id})">تسوية</button> ${currentSession()?.role==='مدير'?`<button class="btn danger" onclick="delProduct(${p.id})">حذف</button>`:''}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">لا توجد أصناف</td></tr>';
  const m=$('movementsLog'); if(m) m.innerHTML=movements.slice(0,20).map(v=>`<p><b>${esc(v.product)}</b> — ${v.delta>0?'+':''}${v.delta} <span class="muted">${esc(v.reason)} • ${new Date(v.date).toLocaleString('ar-EG')}</span></p>`).join('') || '<div class="empty">لا توجد حركة</div>';
}

// ==========================================
// INVENTORY AUDIT & ADJUSTMENT & PRINT
// ==========================================

let activeStocktakeState = {};

function openStocktakeModal() {
  if (!requireRole(['مدير','مخزن'])) return;
  activeStocktakeState = {};
  products.forEach(p => {
    activeStocktakeState[p.id] = p.qty;
  });

  const catOptions = ['الكل', ...Array.from(new Set([...categories, ...products.map(p => p.cat)].filter(Boolean)))];
  
  const html = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:#f8fafc;padding:12px 14px;border-radius:12px;border:1px solid #e2e8f0;">
        <div style="display:flex;gap:8px;flex:1;min-width:240px">
          <input id="stSearch" class="input" placeholder="🔍 بحث بالصنف أو الباركود..." oninput="filterStocktakeTable()" style="max-width:220px">
          <select id="stCatFilter" class="input" onchange="filterStocktakeTable()" style="max-width:180px">
            ${catOptions.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="actions" style="margin-top:0">
          <button type="button" class="btn secondary" onclick="setAllActualToCurrent()" title="تعبئة كل الكميات الفعلية كالحالي">🔄 تعيين كالحالي</button>
          <button type="button" class="btn secondary" onclick="printStocktakeReport()">🖨 طباعة تقرير الجرد</button>
          <button type="button" class="btn primary" onclick="applyStocktakeAdjustments()">✅ تطبيق التسوية الجردية</button>
        </div>
      </div>

      <div class="table-wrap" style="max-height:480px;overflow-y:auto;border:1px solid #ede8e1;border-radius:12px">
        <table class="table" style="margin-top:0">
          <thead style="position:sticky;top:0;z-index:2;background:#f8fafc">
            <tr>
              <th style="width:40px">#</th>
              <th>اسم الصنف</th>
              <th>الباركود</th>
              <th>التصنيف</th>
              <th style="text-align:center">الكمية بالنظام</th>
              <th style="text-align:center">الكمية الفعلية (العد)</th>
              <th style="text-align:center">الفارق (عجز/زيادة)</th>
              <th style="text-align:center">فارق القيمة (شراء)</th>
              <th>تسوية فردية</th>
            </tr>
          </thead>
          <tbody id="stocktakeTableBody">
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;padding:12px 18px;border-radius:14px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;gap:20px;font-size:13.5px">
          <span>إجمالي الأصناف: <b id="stTotalItems" style="color:#38bdf8">0</b></span>
          <span>أصناف بفوارق: <b id="stDiffItems" style="color:#fbbf24">0</b></span>
          <span>صافي الفارق بالقطع: <b id="stTotalQtyDiff" style="color:#f87171">0</b></span>
        </div>
        <div style="font-size:15px;font-weight:800">
          صافي فارق القيمة المالية: <span id="stTotalValDiff" style="color:#4ade80">0.00 ج</span>
        </div>
      </div>
    </div>
  `;

  openModal('📋 استمارة جرد المخزن الفعلي وتسوية الأرصدة', html, true);
  filterStocktakeTable();
}

function filterStocktakeTable() {
  const q = ($('stSearch')?.value || '').trim().toLowerCase();
  const cat = $('stCatFilter')?.value || 'الكل';
  const tbody = $('stocktakeTableBody');
  if (!tbody) return;

  const filtered = products.filter(p => {
    const matchQ = `${p.name} ${p.barcode} ${p.cat}`.toLowerCase().includes(q);
    const matchCat = cat === 'الكل' || p.cat === cat;
    return matchQ && matchCat;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">لا توجد أصناف مطابقة للبحث</td></tr>';
    updateStocktakeSummary();
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const actual = activeStocktakeState[p.id] !== undefined ? activeStocktakeState[p.id] : p.qty;
    const diff = actual - p.qty;
    const valDiff = diff * p.buy;
    const diffClass = diff > 0 ? 'diff-plus' : diff < 0 ? 'diff-minus' : 'diff-zero';
    const diffText = diff > 0 ? `+${diff}` : `${diff}`;

    return `
      <tr id="stRow_${p.id}">
        <td>${idx + 1}</td>
        <td><b>${esc(p.name)}</b></td>
        <td><code>${esc(p.barcode)}</code></td>
        <td><span class="badge" style="background:#f1f5f9;color:#0f172a">${esc(p.cat || 'عام')}</span></td>
        <td style="text-align:center;font-weight:700">${p.qty} <small class="muted">${esc(p.unit)}</small></td>
        <td style="text-align:center">
          <input type="number" class="audit-input" min="0" value="${actual}" oninput="onStocktakeInput(${p.id}, this.value)">
        </td>
        <td style="text-align:center">
          <span class="diff-badge ${diffClass}" id="stDiffBadge_${p.id}">${diffText}</span>
        </td>
        <td style="text-align:center;font-weight:700" id="stValDiff_${p.id}">
          ${money(valDiff)}
        </td>
        <td>
          <button type="button" class="btn secondary" style="padding:4px 8px;font-size:12px" onclick="openQuickAdjustmentModal(${p.id})">تسوية</button>
        </td>
      </tr>
    `;
  }).join('');

  updateStocktakeSummary();
}

function onStocktakeInput(productId, val) {
  const num = Math.max(0, +val || 0);
  activeStocktakeState[productId] = num;
  const p = products.find(x => String(x.id) === String(productId));
  if (!p) return;

  const diff = num - p.qty;
  const valDiff = diff * p.buy;
  const badge = $(`stDiffBadge_${p.id}`);
  const valCell = $(`stValDiff_${p.id}`);

  if (badge) {
    badge.className = `diff-badge ${diff > 0 ? 'diff-plus' : diff < 0 ? 'diff-minus' : 'diff-zero'}`;
    badge.textContent = diff > 0 ? `+${diff}` : `${diff}`;
  }
  if (valCell) {
    valCell.textContent = money(valDiff);
  }

  updateStocktakeSummary();
}

function setAllActualToCurrent() {
  products.forEach(p => {
    activeStocktakeState[p.id] = p.qty;
  });
  filterStocktakeTable();
  toast('تم تعيين كافة الكميات الفعلية كالحالية بالنظام');
}

function updateStocktakeSummary() {
  let totalItems = products.length;
  let diffItems = 0;
  let totalQtyDiff = 0;
  let totalValDiff = 0;

  products.forEach(p => {
    const actual = activeStocktakeState[p.id] !== undefined ? activeStocktakeState[p.id] : p.qty;
    const diff = actual - p.qty;
    if (diff !== 0) {
      diffItems++;
      totalQtyDiff += diff;
      totalValDiff += (diff * p.buy);
    }
  });

  if ($('stTotalItems')) $('stTotalItems').textContent = totalItems;
  if ($('stDiffItems')) $('stDiffItems').textContent = diffItems;
  if ($('stTotalQtyDiff')) $('stTotalQtyDiff').textContent = (totalQtyDiff > 0 ? `+${totalQtyDiff}` : totalQtyDiff);
  if ($('stTotalValDiff')) {
    $('stTotalValDiff').textContent = money(totalValDiff);
    $('stTotalValDiff').style.color = totalValDiff < 0 ? '#f87171' : totalValDiff > 0 ? '#4ade80' : '#ffffff';
  }
}

function applyStocktakeAdjustments() {
  if (!requireRole(['مدير','مخزن'])) return;
  const changes = [];
  products.forEach(p => {
    const actual = activeStocktakeState[p.id] !== undefined ? activeStocktakeState[p.id] : p.qty;
    const diff = actual - p.qty;
    if (diff !== 0) {
      changes.push({ product: p, before: p.qty, after: actual, diff });
    }
  });

  if (!changes.length) {
    return toast('لا توجد أي فروقات جردية لتطبيقها');
  }

  if (!confirm(`سيتم تطبيق التسوية على ${changes.length} صنف وتعديل أرصدتها في المخزن. متابعة؟`)) {
    return;
  }

  changes.forEach(ch => {
    ch.product.qty = ch.after;
    recordMovement(ch.product.id, ch.before, ch.after, `تسوية جردية عامة (${ch.diff > 0 ? '+' : ''}${ch.diff})`);
  });

  saveAll();
  closeModal();
  renderAll();
  toast(`تم تطبيق التسوية الجردية بنجاح على ${changes.length} صنف`);
}

function printStocktakeReport() {
  const changes = [];
  products.forEach((p, idx) => {
    const actual = activeStocktakeState[p.id] !== undefined ? activeStocktakeState[p.id] : p.qty;
    const diff = actual - p.qty;
    changes.push({ ...p, actual, diff, valDiff: diff * p.buy, rowNum: idx + 1 });
  });

  const totalQtyDiff = sum(changes, x => x.diff);
  const totalValDiff = sum(changes, x => x.valDiff);
  const diffCount = changes.filter(x => x.diff !== 0).length;

  const rows = changes.map(c => `
    <tr>
      <td style="text-align:center">${c.rowNum}</td>
      <td><b>${esc(c.name)}</b></td>
      <td><code>${esc(c.barcode)}</code></td>
      <td>${esc(c.cat || 'عام')}</td>
      <td style="text-align:center">${c.qty} ${esc(c.unit)}</td>
      <td style="text-align:center;font-weight:700">${c.actual} ${esc(c.unit)}</td>
      <td style="text-align:center;font-weight:800;color:${c.diff < 0 ? '#b91c1c' : c.diff > 0 ? '#15803d' : '#475569'}">
        ${c.diff > 0 ? `+${c.diff}` : c.diff}
      </td>
      <td style="font-weight:700">${money(c.valDiff)}</td>
    </tr>
  `).join('');

  const html = `
    <div id="invoiceContent" dir="rtl" style="padding:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px">
        <div>
          <h2 style="margin:0;font-size:22px">★ ${esc(cfg().shopName)} — تقرير الجرد والتسوية</h2>
          <p style="margin:4px 0 0;color:#475569">تقرير رسمي مقارنة أرصدة النظام بالعد الفعلي للمخزن</p>
        </div>
        <div style="text-align:left;font-size:13px">
          <div><b>التاريخ:</b> ${new Date().toLocaleString('ar-EG')}</div>
          <div><b>المستخدم:</b> ${esc(currentSession()?.name || 'المدير')}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #cbd5e1">
        <div>الأصناف ذات الفوارق: <b>${diffCount}</b> من أصل ${products.length}</div>
        <div>صافي فارق الكمية: <b>${totalQtyDiff > 0 ? `+${totalQtyDiff}` : totalQtyDiff} قطعة</b></div>
        <div>صافي فارق القيمة: <b>${money(totalValDiff)}</b></div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="width:30px">#</th>
            <th>اسم الصنف</th>
            <th>الباركود</th>
            <th>التصنيف</th>
            <th style="text-align:center">رصيد النظام</th>
            <th style="text-align:center">الرصيد الفعلي</th>
            <th style="text-align:center">الفارق</th>
            <th>فارق القيمة</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #cbd5e1;font-size:13px">
        <div><b>توقيع أمين المخزن:</b> ....................................</div>
        <div><b>توقيع المراجع المالي:</b> ....................................</div>
        <div><b>اعتماد الإدارة:</b> ....................................</div>
      </div>
    </div>
  `;

  openModal('معاينة تقرير الجرد والتسوية', `${html}<div class="actions no-print" style="margin-top:16px"><button class="btn primary" onclick="window.print()">طباعة التقرير</button></div>`, true);
  setTimeout(() => window.print(), 250);
}

function openQuickAdjustmentModal(productId = null) {
  if (!requireRole(['مدير','مخزن'])) return;
  const selectedP = productId ? products.find(p => String(p.id) === String(productId)) : products[0];
  if (!products.length) return toast('لا توجد أصناف بالمخزن');

  const options = products.map(p => `<option value="${p.id}" ${selectedP && String(selectedP.id)===String(p.id)?'selected':''}>${esc(p.name)} (${p.barcode}) — الحالي: ${p.qty} ${esc(p.unit)}</option>`).join('');

  const html = `
    <div class="form">
      <label class="wide">
        <span class="muted" style="display:block;margin-bottom:4px">اختر الصنف المراد تسويته:</span>
        <select id="adjProductId" class="input wide" onchange="onQuickAdjProductChange()">
          ${options}
        </select>
      </label>

      <div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;" class="wide">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span>الكمية المسجلة حالياً:</span>
          <b id="adjCurrentQty" style="font-size:16px;color:#0f172a">0</b>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>سعر الشراء:</span>
          <b id="adjBuyPrice">0 ج</b>
        </div>
      </div>

      <label>
        <span class="muted" style="display:block;margin-bottom:4px">الكمية الفعلية الجديدة:</span>
        <input id="adjNewQty" class="input" type="number" min="0" placeholder="الكمية الجديدة" oninput="calcQuickAdjDiff()">
      </label>

      <label>
        <span class="muted" style="display:block;margin-bottom:4px">سبب التسوية:</span>
        <select id="adjReason" class="input">
          <option value="عجز جرد مخزني">عجز جرد مخزني</option>
          <option value="تلف أو كسر بضاعة">تلف أو كسر بضاعة</option>
          <option value="زيادة جرد غير مسجلة">زيادة جرد غير مسجلة</option>
          <option value="مرتجع من عميل">مرتجع من عميل</option>
          <option value="مرتجع لمورد">مرتجع لمورد</option>
          <option value="تسوية إدارية">تسوية إدارية</option>
        </select>
      </label>

      <div class="wide" style="display:flex;justify-content:space-between;background:#eff6ff;padding:10px 14px;border-radius:8px;border:1px solid #bfdbfe;align-items:center">
        <span>الفارق المحسوب: <b id="adjDiffVal" style="font-size:15px;color:#1e40af">0</b></span>
        <span>فارق التكلفة: <b id="adjCostVal" style="font-size:15px;color:#1e40af">0.00 ج</b></span>
      </div>

      <input id="adjNotes" class="input wide" placeholder="ملاحظات وتفاصيل إضافية (اختياري)">

      <button type="button" class="btn primary wide" onclick="applyQuickAdjustment()">تطبيق التسوية وتحديث الرصيد</button>
    </div>
  `;

  openModal('⚖️ تسوية سريعة لرصيد صنف', html);
  onQuickAdjProductChange();
}

function onQuickAdjProductChange() {
  const selId = $('adjProductId')?.value;
  const p = products.find(x => String(x.id) === String(selId));
  if (!p) return;
  if ($('adjCurrentQty')) $('adjCurrentQty').textContent = `${p.qty} ${p.unit}`;
  if ($('adjBuyPrice')) $('adjBuyPrice').textContent = money(p.buy);
  if ($('adjNewQty')) $('adjNewQty').value = p.qty;
  calcQuickAdjDiff();
}

function calcQuickAdjDiff() {
  const selId = $('adjProductId')?.value;
  const p = products.find(x => String(x.id) === String(selId));
  if (!p) return;
  const newQ = Math.max(0, +($('adjNewQty')?.value || 0));
  const diff = newQ - p.qty;
  const cost = diff * p.buy;

  if ($('adjDiffVal')) {
    $('adjDiffVal').textContent = diff > 0 ? `+${diff} ${p.unit} (زيادة)` : diff < 0 ? `${diff} ${p.unit} (عجز)` : `0 ${p.unit}`;
    $('adjDiffVal').style.color = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#1e40af';
  }
  if ($('adjCostVal')) {
    $('adjCostVal').textContent = money(cost);
    $('adjCostVal').style.color = cost > 0 ? '#16a34a' : cost < 0 ? '#dc2626' : '#1e40af';
  }
}

function applyQuickAdjustment() {
  if (!requireRole(['مدير','مخزن'])) return;
  const selId = $('adjProductId')?.value;
  const p = products.find(x => String(x.id) === String(selId));
  if (!p) return toast('الصنف غير محدد');
  const newQ = Math.max(0, +($('adjNewQty')?.value || 0));
  const reason = $('adjReason')?.value || 'تسوية إدارية';
  const notes = $('adjNotes')?.value.trim();
  const before = p.qty;
  const diff = newQ - before;

  if (diff === 0) return toast('الكمية الجديدة مطابقة للكمية الحالية');

  p.qty = newQ;
  const fullReason = `${reason}${notes ? ` - ${notes}` : ''} (${diff > 0 ? '+' : ''}${diff})`;
  recordMovement(p.id, before, newQ, fullReason);

  saveAll();
  closeModal();
  renderAll();
  toast(`تمت تسوية ${p.name} بنجاح من ${before} إلى ${newQ}`);
}

function openInventoryPrintModal() {
  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div style="background:#f8fafc;padding:16px;border-radius:14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <h4 style="margin:0 0 6px 0;font-size:16px;color:#0f172a">📋 استمارة جرد مخزن فارغة</h4>
          <p class="muted" style="margin:0 0 14px 0;font-size:13px">كشف مطبوع يحتوي على أسماء الأصناف والتصنيف مع خانات فارغة للعد اليدوي والتوقيعات.</p>
        </div>
        <button class="btn primary wide" onclick="printBlankStockAuditSheet()">🖨 طباعة استمارة الجرد</button>
      </div>

      <div style="background:#f8fafc;padding:16px;border-radius:14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <h4 style="margin:0 0 6px 0;font-size:16px;color:#0f172a">📊 تقرير المخزون والتقييم المالي</h4>
          <p class="muted" style="margin:0 0 14px 0;font-size:13px">كشف تفصيلي بأرصدة كل صنف، سعر الشراء، سعر البيع، وقيمة المخزون الإجمالية.</p>
        </div>
        <button class="btn primary wide" onclick="printDetailedInventoryReport()">🖨 طباعة تقرير المخزون</button>
      </div>

      <div style="background:#f8fafc;padding:16px;border-radius:14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <h4 style="margin:0 0 6px 0;font-size:16px;color:#0f172a">⚠️ تقرير النواقص وحد الطلب</h4>
          <p class="muted" style="margin:0 0 14px 0;font-size:13px">كشف خاص بالأصناف التي وصلت أو قلت عن الحد الأدنى لإعادة طلبها من الموردين.</p>
        </div>
        <button class="btn warning wide" onclick="printLowStockReport()">🖨 طباعة تقرير النواقص</button>
      </div>

      <div style="background:#f8fafc;padding:16px;border-radius:14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <h4 style="margin:0 0 6px 0;font-size:16px;color:#0f172a">🏷️ ملصقات الباركود والأسعار</h4>
          <p class="muted" style="margin:0 0 14px 0;font-size:13px">توليد ملصقات باركود جاهزة للطباعة واللصق على المنتجات والرفوف.</p>
        </div>
        <button class="btn secondary wide" onclick="printBarcodeLabelsModal()">🖨 طباعة ملصقات الباركود</button>
      </div>
    </div>
  `;
  openModal('🖨 خيارات طباعة المخزن والجرد', html);
}

function printBlankStockAuditSheet() {
  const rows = products.map((p, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><b>${esc(p.name)}</b></td>
      <td><code>${esc(p.barcode)}</code></td>
      <td>${esc(p.cat || 'عام')}</td>
      <td>${esc(p.unit)}</td>
      <td style="height:32px;background:#fff;border-bottom:1.5px dashed #94a3b8"></td>
      <td style="height:32px;background:#fff;border-bottom:1.5px dashed #94a3b8"></td>
      <td style="height:32px;background:#fff;border-bottom:1.5px dashed #94a3b8"></td>
    </tr>
  `).join('');

  const html = `
    <div id="invoiceContent" dir="rtl" style="padding:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px">
        <div>
          <h2 style="margin:0;font-size:22px">★ ${esc(cfg().shopName)} للأدوات الكهربائية</h2>
          <h3 style="margin:4px 0 0;color:#475569">استمارة حصر وجرد المخزن الفعلي</h3>
        </div>
        <div style="text-align:left;font-size:13px">
          <div><b>تاريخ الجرد:</b> ${new Date().toLocaleDateString('ar-EG')}</div>
          <div><b>أمين المخزن / مسؤول الجرد:</b> .....................</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="width:35px">#</th>
            <th>اسم الصنف</th>
            <th>الباركود</th>
            <th>التصنيف</th>
            <th>الوحدة</th>
            <th style="width:90px;text-align:center">العدد الفعلي</th>
            <th style="width:90px;text-align:center">حالة الصنف</th>
            <th style="width:140px">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #cbd5e1;font-size:14px">
        <div style="text-align:center">
          <b>توقيع عضو لجنة الجرد:</b><br><br>....................................
        </div>
        <div style="text-align:center">
          <b>توقيع أمين المخزن:</b><br><br>....................................
        </div>
        <div style="text-align:center">
          <b>اعتماد المدير العام:</b><br><br>....................................
        </div>
      </div>
    </div>
  `;

  openModal('معاينة استمارة الجرد الفارغة', `${html}<div class="actions no-print" style="margin-top:16px"><button class="btn primary" onclick="window.print()">طباعة الاستمارة</button></div>`);
  setTimeout(() => window.print(), 250);
}

function printDetailedInventoryReport() {
  const totalCost = sum(products, p => p.buy * p.qty);
  const totalSell = sum(products, p => p.sell * p.qty);
  const totalUnits = sum(products, p => p.qty);

  const rows = products.map((p, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><b>${esc(p.name)}</b></td>
      <td><code>${esc(p.barcode)}</code></td>
      <td>${esc(p.cat || 'عام')}</td>
      <td style="text-align:center;font-weight:800">${p.qty} ${esc(p.unit)}</td>
      <td>${money(p.buy)}</td>
      <td>${money(p.sell)}</td>
      <td style="font-weight:700">${money(p.buy * p.qty)}</td>
      <td style="font-weight:700">${money(p.sell * p.qty)}</td>
    </tr>
  `).join('');

  const html = `
    <div id="invoiceContent" dir="rtl" style="padding:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px">
        <div>
          <h2 style="margin:0;font-size:22px">★ ${esc(cfg().shopName)} للأدوات الكهربائية</h2>
          <h3 style="margin:4px 0 0;color:#475569">تقرير أرصدة المخزون والتقييم المالي الشامل</h3>
        </div>
        <div style="text-align:left;font-size:13px">
          <div><b>تاريخ التقرير:</b> ${new Date().toLocaleString('ar-EG')}</div>
          <div><b>عدد الأصناف:</b> ${products.length} صنف</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #cbd5e1">
        <div>إجمالي القطع بالمخزن: <b>${totalUnits}</b></div>
        <div>إجمالي قيمة المخزون (شراء): <b>${money(totalCost)}</b></div>
        <div>إجمالي قيمة المخزون (بيع): <b>${money(totalSell)}</b></div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="width:30px">#</th>
            <th>اسم الصنف</th>
            <th>الباركود</th>
            <th>التصنيف</th>
            <th style="text-align:center">الكمية</th>
            <th>سعر الشراء</th>
            <th>سعر البيع</th>
            <th>إجمالي التكلفة</th>
            <th>إجمالي البيع</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:30px;padding-top:15px;border-top:1px solid #cbd5e1;font-size:13px">
        <div><b>المسؤول:</b> ${esc(currentSession()?.name || 'مدير النظام')}</div>
        <div><b>الاعتماد:</b> ....................................</div>
      </div>
    </div>
  `;

  openModal('معاينة تقرير تقييم المخزون', `${html}<div class="actions no-print" style="margin-top:16px"><button class="btn primary" onclick="window.print()">طباعة التقرير</button></div>`);
  setTimeout(() => window.print(), 250);
}

function printLowStockReport() {
  const lowItems = products.filter(p => p.qty <= p.min);
  if (!lowItems.length) return toast('لا توجد أصناف منخفضة المخزون حالياً');

  const rows = lowItems.map((p, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><b>${esc(p.name)}</b></td>
      <td><code>${esc(p.barcode)}</code></td>
      <td>${esc(p.cat || 'عام')}</td>
      <td style="text-align:center;font-weight:800;color:#b91c1c">${p.qty} ${esc(p.unit)}</td>
      <td style="text-align:center">${p.min} ${esc(p.unit)}</td>
      <td style="text-align:center;font-weight:800;color:#15803d">${Math.max(p.min * 3, 10)} ${esc(p.unit)}</td>
      <td>${money(p.buy)}</td>
    </tr>
  `).join('');

  const html = `
    <div id="invoiceContent" dir="rtl" style="padding:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #b91c1c;padding-bottom:10px">
        <div>
          <h2 style="margin:0;font-size:22px;color:#b91c1c">★ ${esc(cfg().shopName)} — تقرير النواقص وحد الطلب</h2>
          <p style="margin:4px 0 0;color:#475569">قائمة الأصناف التي وصلت أو قلت عن الحد الأدنى لإعادة طلبها من الموردين</p>
        </div>
        <div style="text-align:left;font-size:13px">
          <div><b>التاريخ:</b> ${new Date().toLocaleDateString('ar-EG')}</div>
          <div><b>عدد النواقص:</b> ${lowItems.length} صنف</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px">
        <thead>
          <tr style="background:#fee2e2">
            <th style="width:35px">#</th>
            <th>اسم الصنف</th>
            <th>الباركود</th>
            <th>التصنيف</th>
            <th style="text-align:center">الرصيد المتبقي</th>
            <th style="text-align:center">الحد الأدنى</th>
            <th style="text-align:center">الكمية المقترحة للطلب</th>
            <th>سعر الشراء المتوقع</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top:30px;padding-top:15px;border-top:1px solid #cbd5e1;font-size:13px">
        <b>ملاحظة لمدير المشتريات:</b> يرجى مراجعة الموردين المعتمدين وسرعة إصدار أوامر التوريد للأصناف أعلاه.
      </div>
    </div>
  `;

  openModal('معاينة تقرير النواقص', `${html}<div class="actions no-print" style="margin-top:16px"><button class="btn primary" onclick="window.print()">طباعة تقرير النواقص</button></div>`);
  setTimeout(() => window.print(), 250);
}

function printBarcodeLabelsModal() {
  const options = products.map(p => `<option value="${p.id}">${esc(p.name)} (${p.barcode}) — ${money(p.sell)}</option>`).join('');
  const html = `
    <div class="form">
      <label class="wide">
        <span class="muted" style="display:block;margin-bottom:4px">اختر الصنف:</span>
        <select id="lblProductId" class="input wide">
          <option value="all">كل الأصناف بالمخزن (ملصق لكل صنف)</option>
          ${options}
        </select>
      </label>
      <label>
        <span class="muted" style="display:block;margin-bottom:4px">عدد الملصقات:</span>
        <input id="lblCount" class="input" type="number" min="1" max="100" value="8">
      </label>
      <div class="wide actions">
        <button class="btn primary wide" onclick="generateBarcodeLabels()">عرض وطباعة الملصقات</button>
      </div>
    </div>
  `;
  openModal('🏷️ طباعة ملصقات الباركود والأسعار', html);
}

function generateBarcodeLabels() {
  const targetId = $('lblProductId')?.value;
  const count = Math.max(1, +($('lblCount')?.value || 1));
  let itemsToPrint = [];

  if (targetId === 'all') {
    products.forEach(p => {
      for (let i = 0; i < 2; i++) itemsToPrint.push(p);
    });
  } else {
    const p = products.find(x => String(x.id) === String(targetId));
    if (p) {
      for (let i = 0; i < count; i++) itemsToPrint.push(p);
    }
  }

  if (!itemsToPrint.length) return toast('لا توجد أصناف للطباعة');

  const labelsHtml = itemsToPrint.map(p => `
    <div style="border:1.5px dashed #475569;padding:8px;border-radius:8px;text-align:center;width:170px;background:#fff;display:inline-block;margin:6px;page-break-inside:avoid">
      <div style="font-size:11px;font-weight:800;color:#0f172a">${esc(cfg().shopName)}</div>
      <div style="font-size:12px;font-weight:700;margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
      <div style="font-family:monospace;font-size:15px;letter-spacing:2px;font-weight:900;background:#f1f5f9;padding:2px 4px;border-radius:4px;margin:3px 0">||| ${esc(p.barcode)} |||</div>
      <div style="font-size:14px;font-weight:900;color:#881337">${money(p.sell)}</div>
    </div>
  `).join('');

  const html = `
    <div id="invoiceContent" dir="rtl">
      <div class="no-print" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <b>معاينة الملصقات (${itemsToPrint.length} ملصق)</b>
        <button class="btn primary" onclick="window.print()">طباعة الآن</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px">
        ${labelsHtml}
      </div>
    </div>
  `;

  openModal('ملصقات الباركود والأسعار', html, true);
}

// ==========================================
// SUPPLIERS MANAGEMENT (الموردين والشركات)
// ==========================================

function renderSuppliers() {
  const q = ($('supSearch')?.value || '').toLowerCase();
  const filtered = suppliers.filter(s => 
    `${s.name} ${s.company || ''} ${s.phone || ''} ${s.address || ''} ${s.notes || ''}`.toLowerCase().includes(q)
  );

  const root = $('supTable');
  if (root) {
    root.innerHTML = filtered.map(s => `
      <tr>
        <td><b>${esc(s.name)}</b></td>
        <td>${esc(s.company || '-')}</td>
        <td>${esc(s.phone || '-')}</td>
        <td><span class="muted">${esc(s.address || '-')}</span></td>
        <td class="${s.balance > 0 ? 'low' : ''}" style="font-weight:800">${money(s.balance)}</td>
        <td>
          <button class="btn secondary" onclick="supplierStatement('${s.id}')">كشف حساب</button>
          <button class="btn success" onclick="recordSupplierPayment('${s.id}')">سداد دفعة</button>
          <button class="btn secondary" onclick="editSupplier('${s.id}')">تعديل</button>
          ${currentSession()?.role === 'مدير' ? `<button class="btn danger" onclick="delSupplier('${s.id}')">حذف</button>` : ''}
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="empty">لا يوجد موردين مسجلين</td></tr>';
  }

  const select = $('paySupplierSelect');
  if (select) {
    const cur = select.value;
    select.innerHTML = '<option value="">اختر المورد للسداد...</option>' + suppliers.map(s => 
      `<option value="${s.id}">${esc(s.name)} ${s.company ? `(${s.company})` : ''} — مستحق: ${money(s.balance)}</option>`
    ).join('');
    if (cur) select.value = cur;
  }

  if ($('supCount')) $('supCount').textContent = suppliers.length;
  if ($('supDebtTotal')) $('supDebtTotal').textContent = money(sum(suppliers, s => s.balance));
  
  const supplierReceipts = receipts.filter(r => r.type === 'supplier_payment');
  if ($('supPaidTotal')) $('supPaidTotal').textContent = money(sum(supplierReceipts, r => r.amount));
}

function saveSupplier() {
  if (!requireRole(['مدير','حسابات','مخزن'])) return;
  const id = $('sId')?.value;
  const name = $('sName')?.value.trim();
  if (!name) return toast('اسم المورد مطلوب');

  const company = $('sCompany')?.value.trim() || '';
  const phone = $('sPhone')?.value.trim() || '';
  const address = $('sAddress')?.value.trim() || '';
  const notes = $('sNotes')?.value.trim() || '';
  const balance = Math.max(0, +($('sBalance')?.value || 0));

  if (id) {
    const s = suppliers.find(x => String(x.id) === String(id));
    if (s) {
      Object.assign(s, { name, company, phone, address, notes, balance });
      toast('تم تحديث بيانات المورد بنجاح');
    }
  } else {
    const newSup = {
      id: String(Date.now()),
      name,
      company,
      phone,
      address,
      balance,
      notes
    };
    suppliers.unshift(newSup);
    toast('تمت إضافة المورد بنجاح');
  }

  resetSupplierForm();
  saveAll();
  renderAll();
}

function resetSupplierForm() {
  ['sId', 'sName', 'sCompany', 'sPhone', 'sAddress', 'sNotes'].forEach(id => {
    if ($(id)) $(id).value = '';
  });
  if ($('sBalance')) $('sBalance').value = '';
  if ($('supFormTitle')) $('supFormTitle').textContent = 'إضافة مورد جديد';
}

function editSupplier(id) {
  if (!requireRole(['مدير','حسابات','مخزن'])) return;
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  openModal('تعديل بيانات المورد', `
    <div class="form">
      <input id="msName" class="input" value="${esc(s.name)}" placeholder="اسم المورد *">
      <input id="msCompany" class="input" value="${esc(s.company || '')}" placeholder="اسم الشركة">
      <input id="msPhone" class="input" value="${esc(s.phone || '')}" placeholder="رقم الهاتف">
      <input id="msBalance" class="input" type="number" min="0" step="0.01" value="${s.balance}" placeholder="الرصيد المستحق">
      <input id="msAddress" class="input wide" value="${esc(s.address || '')}" placeholder="العنوان">
      <input id="msNotes" class="input wide" value="${esc(s.notes || '')}" placeholder="ملاحظات">
      <button class="btn primary wide" onclick="updateSupplier('${s.id}')">حفظ التعديلات</button>
    </div>
  `);
}

function updateSupplier(id) {
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;
  const name = $('msName')?.value.trim();
  if (!name) return toast('اسم المورد مطلوب');

  Object.assign(s, {
    name,
    company: $('msCompany')?.value.trim() || '',
    phone: $('msPhone')?.value.trim() || '',
    address: $('msAddress')?.value.trim() || '',
    notes: $('msNotes')?.value.trim() || '',
    balance: Math.max(0, +($('msBalance')?.value || 0))
  });

  saveAll();
  closeModal();
  renderAll();
  toast('تم تحديث بيانات المورد');
}

function delSupplier(id) {
  if (!requireRole(['مدير'])) return;
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  if (confirm(`هل أنت متأكد من حذف المورد "${s.name}"؟`)) {
    suppliers = suppliers.filter(x => String(x.id) !== String(id));
    saveAll();
    renderAll();
    toast('تم حذف المورد');
  }
}

function recordSupplierPayment(id) {
  if (!requireRole(['مدير','حسابات'])) return;
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  openModal('تسجيل سداد دفعة للمورد', `
    <div class="form">
      <div class="wide" style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
        <div>المورد: <b>${esc(s.name)}</b> ${s.company ? `(${esc(s.company)})` : ''}</div>
        <div style="margin-top:4px">الرصيد المستحق للمورد حالياً: <b style="color:#b91c1c;font-size:16px">${money(s.balance)}</b></div>
      </div>
      <input id="supPayModalAmount" class="input" type="number" min="0.01" step="0.01" placeholder="مبلغ الدفعة المسددة *" autofocus>
      <input id="supPayModalNote" class="input" placeholder="رقم الشيك / الإيصال / ملاحظة">
      <button class="btn success wide" onclick="saveSupplierPayment('${s.id}')">تأكيد السداد والخصم من الحساب</button>
    </div>
  `);
}

function recordSupplierPaymentFromForm() {
  const supId = $('paySupplierSelect')?.value;
  if (!supId) return toast('يرجى اختيار المورد أولاً');
  const amount = +($('supPayAmount')?.value || 0);
  if (amount <= 0) return toast('أدخل مبلغ السداد');
  const note = $('supPayNote')?.value.trim() || 'سداد نقدي';

  saveSupplierPaymentDirect(supId, amount, note);
  if ($('supPayAmount')) $('supPayAmount').value = '';
  if ($('supPayNote')) $('supPayNote').value = '';
}

function saveSupplierPayment(id) {
  const amount = +($('supPayModalAmount')?.value || 0);
  if (amount <= 0) return toast('أدخل مبلغ السداد');
  const note = $('supPayModalNote')?.value.trim() || 'سداد نقدي';

  saveSupplierPaymentDirect(id, amount, note);
  closeModal();
}

function saveSupplierPaymentDirect(id, amount, note) {
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  s.balance = Math.max(0, (+s.balance || 0) - amount);

  receipts.unshift({
    id: Date.now(),
    type: 'supplier_payment',
    supplierId: id,
    supplierName: s.name,
    date: new Date().toISOString(),
    amount,
    note,
    userId: currentSession()?.id || null
  });

  expenses.unshift({
    id: Date.now() + 1,
    date: new Date().toISOString(),
    name: `سداد للمورد: ${s.name} (${note})`,
    amount,
    userId: currentSession()?.id || null
  });

  saveAll();
  renderAll();
  toast(`تم تسجيل سداد ${money(amount)} للمورد ${s.name}`);
}

function supplierStatement(id) {
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  const payments = receipts.filter(r => r.type === 'supplier_payment' && String(r.supplierId) === String(id));

  const rows = payments.map(p => `
    <tr>
      <td>${new Date(p.date).toLocaleString('ar-EG')}</td>
      <td>سداد دفعة للمورد</td>
      <td style="font-weight:800;color:#16a34a">${money(p.amount)}</td>
      <td>${esc(p.note || '-')}</td>
    </tr>
  `).join('');

  const html = `
    <div>
      <div class="cards" style="margin-bottom:14px">
        <div class="card highlight">
          <span>الرصيد المستحق الحالي</span>
          <b style="color:#b91c1c">${money(s.balance)}</b>
        </div>
        <div class="card">
          <span>إجمالي المسدد له</span>
          <b style="color:#16a34a">${money(sum(payments, p => p.amount))}</b>
        </div>
        <div class="card">
          <span>عدد الدفعات المسجلة</span>
          <b>${payments.length}</b>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="margin:0">سجل حركات وسدادات المورد</h4>
        <div class="actions" style="margin:0">
          <button class="btn success" onclick="recordSupplierPayment('${s.id}')">سداد دفعة جديدة</button>
          <button class="btn secondary" onclick="printSupplierStatement('${s.id}')">🖨 طباعة كشف الحساب</button>
        </div>
      </div>

      <div class="table-wrap" style="max-height:280px;overflow-y:auto">
        <table class="table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع العملية</th>
              <th>المبلغ</th>
              <th>البيان / ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="4" class="empty">لا توجد دفعات مسجلة لهذا المورد بعد</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openModal(`كشف حساب المورد — ${esc(s.name)}`, html, true);
}

function printSupplierStatement(id) {
  const s = suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  const payments = receipts.filter(r => r.type === 'supplier_payment' && String(r.supplierId) === String(id));
  const totalPaid = sum(payments, p => p.amount);

  const rows = payments.map((p, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${new Date(p.date).toLocaleString('ar-EG')}</td>
      <td>سداد دفعة نقدية</td>
      <td style="font-weight:700">${money(p.amount)}</td>
      <td>${esc(p.note || '-')}</td>
    </tr>
  `).join('');

  const html = `
    <div id="invoiceContent" dir="rtl" style="padding:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px">
        <div>
          <h2 style="margin:0;font-size:22px">★ ${esc(cfg().shopName)} للأدوات الكهربائية</h2>
          <h3 style="margin:4px 0 0;color:#475569">كشف حساب مورد رسمي</h3>
        </div>
        <div style="text-align:left;font-size:13px">
          <div><b>تاريخ التقرير:</b> ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #cbd5e1">
        <div>
          <div><b>اسم المورد:</b> ${esc(s.name)}</div>
          <div><b>الشركة / المؤسسة:</b> ${esc(s.company || '-')}</div>
          <div><b>رقم الهاتف:</b> ${esc(s.phone || '-')}</div>
        </div>
        <div>
          <div><b>العنوان:</b> ${esc(s.address || '-')}</div>
          <div><b>إجمالي المسدد له:</b> ${money(totalPaid)}</div>
          <div style="font-size:15px;margin-top:4px"><b>الرصيد المستحق الحالي:</b> <b style="color:#b91c1c">${money(s.balance)}</b></div>
        </div>
      </div>

      <h4 style="margin:14px 0 6px">سجل السدادات والدفعات</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="width:35px">#</th>
            <th>التاريخ والوقت</th>
            <th>البيان</th>
            <th>المبلغ المسدد</th>
            <th>ملاحظات / رقم الإيصال</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" class="empty">لا توجد حركات مسجلة</td></tr>'}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #cbd5e1;font-size:13px">
        <div><b>توقيع المحاسب:</b> ....................................</div>
        <div><b>توقيع المورد / المستلم:</b> ....................................</div>
      </div>
    </div>
  `;

  openModal('معاينة كشف حساب المورد', `${html}<div class="actions no-print" style="margin-top:16px"><button class="btn primary" onclick="window.print()">طباعة كشف الحساب</button></div>`);
  setTimeout(() => window.print(), 250);
}
function addCustomer(){
  if(!requireRole(['مدير','كاشير'])) return;
  const n=$('cName').value.trim(); if(!n) return toast('اسم العميل مطلوب');
  customers.unshift({id:String(Date.now()),name:n,phone:$('cPhone').value.trim(),address:$('cAddress').value.trim(),balance:0});
  ['cName','cPhone','cAddress'].forEach(id=>$(id).value=''); saveAll(); renderAll(); toast('تم حفظ العميل');
}
function editCustomer(id){
  if(!requireRole(['مدير','كاشير'])) return;
  const c=customers.find(x=>String(x.id)===String(id)); if(!c) return;
  openModal('تعديل العميل', `<div class="form"><input id="mcName" class="input" value="${esc(c.name)}"><input id="mcPhone" class="input" value="${esc(c.phone||'')}"><input id="mcAddress" class="input wide" value="${esc(c.address||'')}"><button class="btn primary wide" onclick="updateCustomer('${c.id}')">حفظ</button></div>`);
}
function updateCustomer(id){const c=customers.find(x=>String(x.id)===String(id));if(!c)return;Object.assign(c,{name:$('mcName').value.trim(),phone:$('mcPhone').value.trim(),address:$('mcAddress').value.trim()});saveAll();closeModal();renderAll();}
function delCustomer(id){
  if(!requireRole(['مدير'])) return;
  const c = customers.find(x => String(x.id) === String(id));
  if(!c) return;
  if(sales.some(s=>String(s.customer)===String(id))) return toast('لا يمكن حذف عميل له فواتير؛ عدّل بياناته بدلًا من الحذف');
  if(!confirm(`هل أنت متأكد من حذف العميل "${c.name}"؟`)) return;
  customers=customers.filter(c=>String(c.id)!==String(id)); saveAll(); renderAll(); toast('تم حذف العميل');
}
function customerStatement(id){
  const c=customers.find(x=>String(x.id)===String(id)); if(!c)return;
  const rows=sales.filter(s=>String(s.customer)===String(id));
  openModal(`كشف حساب — ${esc(c.name)}`, `<div class="cards"><div class="card"><span>الرصيد الحالي</span><b>${money(c.balance)}</b></div><div class="card"><span>عدد الفواتير الآجلة</span><b>${rows.length}</b></div></div><table class="table"><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>الدفع</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${esc(s.invoiceNo)}</td><td>${new Date(s.date).toLocaleString('ar-EG')}</td><td>${money(s.total)}</td><td>${esc(s.payment)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">لا توجد حركة</td></tr>'}</tbody></table>`);
}
function recordCustomerPayment(id){
  if(!requireRole(['مدير','حسابات'])) return;
  const c=customers.find(x=>String(x.id)===String(id)); if(!c) return;
  openModal('تسجيل سداد', `<div class="form"><div class="muted wide">الرصيد الحالي: <b>${money(c.balance)}</b></div><input id="payAmount" class="input" type="number" min="0.01" step="0.01" placeholder="مبلغ السداد"><input id="payNote" class="input" placeholder="ملاحظة"><button class="btn success wide" onclick="saveCustomerPayment('${c.id}')">تسجيل السداد</button></div>`);
}
function saveCustomerPayment(id){
  const c=customers.find(x=>String(x.id)===String(id)), a=+($('payAmount').value||0); if(!c||a<=0)return toast('أدخل مبلغ السداد');
  c.balance=Math.max(0,(+c.balance||0)-a);
  receipts.unshift({id:Date.now(),type:'customer_payment',customerId:id,date:new Date().toISOString(),amount:a,note:$('payNote').value.trim(),userId:currentSession()?.id||null});
  saveAll(); closeModal(); renderAll(); toast('تم تسجيل السداد');
}
function filterPosCustomers(query) {
  const q = String(query || '').trim().toLowerCase();
  const select = $('customerSelect');
  if (!select) return;
  const currentVal = select.value;
  
  const filtered = !q ? customers : customers.filter(c => 
    `${c.name} ${c.phone || ''} ${c.address || ''}`.toLowerCase().includes(q)
  );
  
  let options = '<option value="">عميل نقدي</option>';
  options += filtered.map(c => `<option value="${c.id}">${esc(c.name)} ${c.phone ? `(${c.phone})` : ''} — ${money(c.balance)}</option>`).join('');
  select.innerHTML = options;
  
  // Keep selection if exists in filtered list, else select first match if user is searching
  if (currentVal && filtered.some(c => String(c.id) === String(currentVal))) {
    select.value = currentVal;
  } else if (q && filtered.length === 1) {
    select.value = filtered[0].id;
  }
}

function syncCustomerField(customerId) {
  const searchInput = $('posCustomerSearch');
  if (!searchInput) return;
  if (!customerId) {
    searchInput.value = '';
    return;
  }
  const c = customers.find(x => String(x.id) === String(customerId));
  if (c) {
    searchInput.value = `${c.name} ${c.phone ? `(${c.phone})` : ''}`;
  }
}

function quickAddCustomerModal() {
  if (!requireRole(['مدير','كاشير'])) return;
  openModal('إضافة عميل سريع للكاشير', `
    <div class="form">
      <input id="qCustName" class="input" placeholder="اسم العميل *" autofocus>
      <input id="qCustPhone" class="input" placeholder="رقم الهاتف">
      <input id="qCustAddress" class="input wide" placeholder="العنوان / ملاحظة">
      <button type="button" class="btn primary wide" onclick="saveQuickCustomer()">حفظ واختيار في الكاشير</button>
    </div>
  `);
}

function saveQuickCustomer() {
  const name = $('qCustName')?.value.trim();
  if (!name) return toast('اسم العميل مطلوب');
  const id = String(Date.now());
  const newCust = {
    id,
    name,
    phone: $('qCustPhone')?.value.trim() || '',
    address: $('qCustAddress')?.value.trim() || '',
    balance: 0
  };
  customers.unshift(newCust);
  saveAll();
  closeModal();
  renderCustomers();
  
  const select = $('customerSelect');
  if (select) {
    select.value = id;
    syncCustomerField(id);
  }
  toast(`تمت إضافة العميل ${name} وتحديده بنجاح`);
}

function renderCustomers(){
  const q=($('custSearch')?.value||'').toLowerCase();
  const posSearchVal = ($('posCustomerSearch')?.value || '').trim();
  
  // Re-populate POS customer select while preserving current selection
  if($('customerSelect')) {
    const cur = $('customerSelect').value;
    if (posSearchVal) {
      filterPosCustomers(posSearchVal);
    } else {
      $('customerSelect').innerHTML='<option value="">عميل نقدي</option>'+customers.map(c=>`<option value="${c.id}">${esc(c.name)} ${c.phone ? `(${c.phone})` : ''} — ${money(c.balance)}</option>`).join('');
      if (cur) $('customerSelect').value = cur;
    }
  }
  
  const root=$('custTable'); if(!root)return;
  const a=customers.filter(c=>(`${c.name} ${c.phone||''} ${c.address||''}`).toLowerCase().includes(q));
  root.innerHTML=a.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||'-')}</td><td class="${c.balance>0?'low':''}">${money(c.balance)}</td><td><button class="btn secondary" onclick="customerStatement('${c.id}')">كشف</button> <button class="btn secondary" onclick="editCustomer('${c.id}')">تعديل</button> ${currentSession()?.role==='مدير'||currentSession()?.role==='حسابات'?`<button class="btn success" onclick="recordCustomerPayment('${c.id}')">سداد</button>`:''} ${currentSession()?.role==='مدير'?`<button class="btn danger" onclick="delCustomer('${c.id}')">حذف</button>`:''}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">لا يوجد عملاء</td></tr>';
}
function addExpense(){
  if(!requireRole(['مدير','حسابات'])) return;
  const n=$('eName').value.trim(), a=+$('eAmount').value||0; if(!n||a<=0)return toast('أدخل البيان والمبلغ');
  expenses.unshift({id:Date.now(),date:new Date().toISOString(),name:n,amount:a,userId:currentSession()?.id||null}); saveAll(); $('eName').value=''; $('eAmount').value=''; renderAll(); toast('تم تسجيل المصروف');
}
function periodFilter(arr){
  const from=$('accFrom')?.value, to=$('accTo')?.value;
  return arr.filter(x=>{const d=datePart(x.date); return (!from||d>=from)&&(!to||d<=to);});
}
function renderAccounts(){
  const ss=periodFilter(sales), ee=periodFilter(expenses); const s=sum(ss,x=>x.total), c=sum(ss,x=>x.cost), e=sum(ee,x=>x.amount), paid=sum(ss,x=>x.payment==='آجل'?0:x.total), debt=sum(customers,x=>x.balance), profit=s-c-e;
  if($('salesTotal'))$('salesTotal').textContent=money(s); if($('costTotal'))$('costTotal').textContent=money(c); if($('expenseTotal'))$('expenseTotal').textContent=money(e); if($('profitTotal'))$('profitTotal').textContent=money(profit); if($('cashTotal'))$('cashTotal').textContent=money(paid); if($('debtTotal'))$('debtTotal').textContent=money(debt);
  const log=$('accountLog'); if(log) log.innerHTML=[...ss.slice(0,8).map(x=>`<p>بيع <b>${money(x.total)}</b> — ${esc(x.payment)} <span class="muted">${x.invoiceNo}</span></p>`),...ee.slice(0,8).map(x=>`<p>مصروف ${esc(x.name)} — <b>${money(x.amount)}</b></p>`)].join('')||'<div class="empty">لا توجد عمليات</div>';
}
function renderDashboard(){
  const key=todayKey(), ss=sales.filter(x=>datePart(x.date)===key), s=sum(ss,x=>x.total), p=sum(ss,x=>x.total-x.cost), low=products.filter(x=>x.qty<=x.min).length, debt=sum(customers,x=>x.balance);
  if($('dashSales'))$('dashSales').textContent=money(s); if($('dashProfit'))$('dashProfit').textContent=money(p); if($('dashLow'))$('dashLow').textContent=low; if($('dashDebt'))$('dashDebt').textContent=money(debt);
  const recent=$('dashRecent'); if(recent) recent.innerHTML=ss.slice(0,8).map(x=>`<div class="toolbar" style="padding:8px 0;border-bottom:1px solid #eee"><span style="flex:1"><b>${esc(x.invoiceNo)}</b><small class="muted"> ${esc(customerName(x.customer))}</small></span><b>${money(x.total)}</b></div>`).join('')||'<div class="empty">لا توجد مبيعات اليوم</div>';
  const alerts=$('dashAlerts'); if(alerts) alerts.innerHTML=products.filter(x=>x.qty<=x.min).slice(0,10).map(x=>`<div class="toolbar" style="padding:8px 0;border-bottom:1px solid #eee"><span style="flex:1">${esc(x.name)}</span><b class="low">${x.qty} ${esc(x.unit)}</b></div>`).join('')||'<div class="empty">لا توجد تنبيهات</div>';
  renderShiftWidget();
}

function getActiveShift() {
  try { return JSON.parse(localStorage.getItem('fs_active_shift') || 'null'); } catch { return null; }
}

function renderShiftWidget() {
  const badge = $('shiftStatusBadge');
  const actionBtn = $('shiftActionBtn');
  const shift = getActiveShift();
  if (!badge || !actionBtn) return;
  if (shift) {
    badge.innerHTML = `🟢 شيفت مفتوح: <b>${esc(shift.userName)}</b> (بدأ: ${new Date(shift.startedAt).toLocaleTimeString('ar-EG')})`;
    actionBtn.textContent = 'إنهاء الشيفت وترحيل النقدية';
    actionBtn.style.background = '#991b1b';
    actionBtn.style.color = '#fff';
  } else {
    badge.innerHTML = `🔴 لا يوجد شيفت مفتوح حالياً`;
    actionBtn.textContent = 'فتح شيفت جديد';
    actionBtn.style.background = '#2563eb';
    actionBtn.style.color = '#fff';
  }
}

function openShiftModal() {
  const shift = getActiveShift();
  const s = currentSession();
  const today = todayKey();
  const todaySales = sales.filter(x => datePart(x.date) === today);
  const totalCash = sum(todaySales, x => x.payment !== 'آجل' ? x.total : 0);

  if (!shift) {
    openModal('فتح شيفت جديد للكاشير', `
      <div class="form">
        <p class="muted">بدء شيفت عمل جديد وتسجيل النقدية الافتتاحية في الدرج.</p>
        <label>المسؤول / الكاشير<input id="shiftUser" class="input" value="${esc(s?.name || 'مدير النظام')}"></label>
        <label>النقدية الافتتاحية بالدرج (ج)<input id="shiftStartCash" class="input" type="number" min="0" step="0.01" value="0"></label>
        <button class="btn primary wide" onclick="confirmOpenShift()">فتح الشيفت الآن</button>
      </div>
    `);
  } else {
    openModal('إنهاء الشيفت وترحيل النقدية', `
      <div class="form">
        <p class="muted">تم فتح الشيفت بواسطة: <b>${esc(shift.userName)}</b> في ${new Date(shift.startedAt).toLocaleTimeString('ar-EG')}</p>
        <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;display:flex;flex-direction:column;gap:6px">
          <div>النقدية الافتتاحية: <b>${money(shift.startCash)}</b></div>
          <div>مبيعات النقدية اليوم: <b>${money(totalCash)}</b></div>
          <div>إجمالي النقدية المتوقعة بالدرج: <b style="color:#059669">${money(shift.startCash + totalCash)}</b></div>
        </div>
        <label>طريقة وترحيل النقدية<select id="shiftTransferTarget" class="input">
          <option value="safe">ترحيل الخزينة الرئيسية (الخزنة)</option>
          <option value="bank">ترحيل إلى حساب البنك / الحساب الجاري</option>
          <option value="keep">الاحتفاظ بالعهدة مع مسؤول الوردية القادمة</option>
        </select></label>
        <label>النقدية الفعلية الموجودة بالعد الفعلي (ج)<input id="shiftActualCash" class="input" type="number" min="0" step="0.01" value="${shift.startCash + totalCash}"></label>
        <label>ملاحظات إغلاق الشيفت<input id="shiftCloseNotes" class="input" placeholder="أي فوارق أو ملاحظات..."></label>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn danger wide" onclick="confirmCloseShift()">تأكيد إنهاء الشيفت وترحيل النقدية</button>
        </div>
      </div>
    `);
  }
}

function confirmOpenShift() {
  const userName = $('shiftUser')?.value.trim() || 'مدير النظام';
  const startCash = +($('shiftStartCash')?.value || 0);
  const shift = { id: Date.now(), userName, startCash, startedAt: new Date().toISOString() };
  localStorage.setItem('fs_active_shift', JSON.stringify(shift));
  closeModal();
  renderShiftWidget();
  toast('تم فتح الشيفت بنجاح');
}

function confirmCloseShift() {
  const shift = getActiveShift();
  if (!shift) return;
  const target = $('shiftTransferTarget')?.value || 'safe';
  const actualCash = +($('shiftActualCash')?.value || 0);
  const notes = $('shiftCloseNotes')?.value.trim() || '';

  const today = todayKey();
  const todaySales = sales.filter(x => datePart(x.date) === today);
  const totalCash = sum(todaySales, x => x.payment !== 'آجل' ? x.total : 0);
  const expectedCash = shift.startCash + totalCash;
  const diff = actualCash - expectedCash;

  if (!confirm(`هل أنت متأكد من إنهاء الشيفت وترحيل مبلغ ${money(actualCash)} (${target === 'safe' ? 'الخزينة الرئيسية' : target === 'bank' ? 'البنك' : 'عهدة جديدة'})؟`)) return;

  const closedShift = { ...shift, closedAt: new Date().toISOString(), expectedCash, actualCash, diff, target, notes };
  let history = [];
  try { history = JSON.parse(localStorage.getItem('fs_shift_history') || '[]'); } catch {}
  history.unshift(closedShift);
  localStorage.setItem('fs_shift_history', JSON.stringify(history));

  localStorage.removeItem('fs_active_shift');
  closeModal();
  renderShiftWidget();
  toast(`تم إنهاء الشيفت وترحيل النقدية بنجاح (الفارق: ${money(diff)})`);
}
function renderReports(){
  const s=sales, revenue=sum(s,x=>x.total), profit=sum(s,x=>x.total-x.cost)-sum(expenses,x=>x.amount), invoices=s.length, avg=invoices?revenue/invoices:0;
  if($('repSales'))$('repSales').textContent=money(revenue); if($('repProfit'))$('repProfit').textContent=money(profit); if($('repInvoices'))$('repInvoices').textContent=String(invoices); if($('repAvg'))$('repAvg').textContent=money(avg);
  const root=$('salesTable'); if(root) root.innerHTML=s.slice(0,200).map(x=>`<tr><td>${esc(x.invoiceNo)}</td><td>${new Date(x.date).toLocaleString('ar-EG')}</td><td>${esc(customerName(x.customer))}</td><td>${esc(x.payment)}</td><td>${money(x.total)}</td><td><button class="btn secondary" onclick="printInvoiceById(${x.id})">طباعة</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">لا توجد فواتير</td></tr>';
}
function printInvoiceById(id){const s=sales.find(x=>x.id===id);if(s)printInvoice(s);}
function invoiceHtml(s){
  const lines=s.items.map(i=>`<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.sell)}</td><td>${money(i.total)}</td></tr>`).join('');
  return `<div id="invoiceContent" dir="rtl"><div style="text-align:center;font-weight:900;font-size:22px">★ ${esc(cfg().shopName)}</div><div style="text-align:center">فاتورة بيع</div><hr><div style="display:flex;justify-content:space-between"><span>رقم: ${esc(s.invoiceNo)}</span><span>${new Date(s.date).toLocaleString('ar-EG')}</span></div><div>العميل: ${esc(customerName(s.customer))}</div><div>المستخدم: ${esc(userName(s.userId))}</div><table style="width:100%;border-collapse:collapse;margin-top:15px"><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${lines}</tbody></table><hr><div>المجموع: <b>${money(s.subtotal)}</b></div><div>الخصم: <b>${money(s.discount)}</b></div><div>الضريبة: <b>${money(s.tax)}</b></div><div style="font-size:20px;margin-top:8px">الإجمالي النهائي: <b>${money(s.total)}</b></div><div>طريقة الدفع: ${esc(s.payment)}</div><p style="text-align:center;margin-top:20px">شكرًا لتعاملكم معنا</p></div>`;
}
function printInvoice(s){
  const root=$('invoiceModal') || document.createElement('div');
  if(!root.id){ root.id='invoiceModal'; root.style.display='none'; document.body.appendChild(root); }
  root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="no-print toolbar"><button class="btn primary" onclick="window.print()">طباعة</button><button class="btn secondary" onclick="this.closest('.modal-backdrop').remove()">إغلاق</button></div>${invoiceHtml(s)}</div></div>`;
  document.body.appendChild(root); setTimeout(()=>window.print(),200);
}
function printReport(){
  const html=`<div id="invoiceContent" dir="rtl"><h1>${esc(cfg().shopName)} — تقرير المبيعات</h1><p>التاريخ: ${new Date().toLocaleString('ar-EG')}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الدفع</th><th>الإجمالي</th></tr></thead><tbody>${sales.slice(0,300).map(x=>`<tr><td>${esc(x.invoiceNo)}</td><td>${new Date(x.date).toLocaleString('ar-EG')}</td><td>${esc(customerName(x.customer))}</td><td>${esc(x.payment)}</td><td>${money(x.total)}</td></tr>`).join('')}</tbody></table></div>`;
  openModal('معاينة التقرير', `${html}<div class="actions no-print" style="margin-top:12px"><button class="btn primary" onclick="window.print()">طباعة</button></div>`); setTimeout(()=>window.print(),250);
}
function exportBackup(){
  const data={version:2,exportedAt:new Date().toISOString(),products,categories,customers,suppliers,sales,expenses,users,heldCarts,movements,receipts,settings};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`five-stars-backup-${todayKey()}.json`; a.click(); URL.revokeObjectURL(a.href); toast('تم تصدير النسخة الاحتياطية');
}
function importBackup(ev){
  if(!requireRole(['مدير'])) return;
  const file=ev.target.files?.[0]; if(!file)return;
  const r=new FileReader(); r.onload=()=>{try{const d=JSON.parse(r.result); if(!d||!Array.isArray(d.products)||!Array.isArray(d.sales)) throw new Error(); products=normalizeProducts(d.products); if(Array.isArray(d.categories)) categories=d.categories; customers=d.customers||[]; suppliers=d.suppliers||[]; sales=d.sales||[]; expenses=d.expenses||[]; users=d.users||users; heldCarts=d.heldCarts||[]; movements=d.movements||[]; receipts=d.receipts||[]; settings={...settings,...(d.settings||{})}; saveAll(); renderAll(); toast('تم استيراد البيانات بنجاح');}catch{toast('ملف النسخة الاحتياطية غير صالح')} }; r.readAsText(file); ev.target.value='';
}
function resetDemo(){
  if(!requireRole(['مدير'])) return;
  if(!confirm('سيتم حذف بيانات المبيعات والعملاء والمصروفات وإرجاع الأصناف التجريبية. هل أنت متأكد؟'))return;
  products=normalizeProducts(null); categories=[...defaultCategories]; customers=[]; suppliers=[...initialSupplierSeed]; sales=[]; expenses=[]; heldCarts=[]; movements=[]; receipts=[]; saveAll(); cart=[]; renderAll(); toast('تمت إعادة بيانات التجربة');
}
function wipeAllData(){
  if(!requireRole(['مدير'])) return;
  if(!confirm('تحذير خطير: سيتم مسح جميع البيانات نهائياً (الأصناف، العملاء، الموردين، المبيعات، المصروفات، المرتجعات) وجعل التطبيق فارغاً تماماً (صفر). هل أنت متأكد؟')) return;
  products = [];
  categories = [...defaultCategories];
  customers = [];
  suppliers = [];
  sales = [];
  expenses = [];
  heldCarts = [];
  movements = [];
  receipts = [];
  localStorage.removeItem('fs_returns');
  saveAll();
  cart = [];
  renderAll();
  toast('تم مسح جميع البيانات وبدء التطبيق من الصفر بنجاح');
}
function saveSettings(){
  if(!requireRole(['مدير'])) return;
  settings.shopName=$('shopName').value.trim()||'Five Stars'; settings.currency=$('currency').value.trim()||'ج'; saveAll(); renderAll(); toast('تم حفظ الإعدادات');
}
function openModal(title, html, isWide = false){
  const root=$('modalRoot'); root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal ${isWide ? 'wide-modal' : ''}"><div class="toolbar no-print"><h3 style="flex:1">${title}</h3><button class="btn secondary" onclick="closeModal()">إغلاق</button></div><hr class="no-print">${html}</div></div>`;
}
function closeModal(){if($('modalRoot'))$('modalRoot').innerHTML='';}

async function startCamera(mode='pos') {
  if (!('mediaDevices' in navigator)) return toast('الكاميرا غير مدعومة على هذا الجهاز');
  cameraMode=mode;
  try {
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('cameraModal').classList.remove('hidden'); $('scannerVideo').srcObject=cameraStream;
    if ('BarcodeDetector' in window) {
      cameraDetector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e','qr_code']});
      $('cameraStatus').textContent='وجّه الكاميرا نحو الباركود…';
      cameraTimer=setInterval(scanCameraFrame,500);
    } else $('cameraStatus').textContent='المتصفح لا يدعم التعرف المباشر على الباركود. استخدم قارئ USB/Bluetooth.';
  } catch { toast('تعذر الوصول إلى الكاميرا. تأكد من السماح بالصلاحية.'); }
}
async function scanCameraFrame(){
  if(!cameraDetector||!$('scannerVideo')||$('scannerVideo').readyState<2)return;
  try{const codes=await cameraDetector.detect($('scannerVideo')); if(codes.length){scan(codes[0].rawValue,cameraMode); stopCamera();}}catch{}
}
function stopCamera(){
  if(cameraTimer){clearInterval(cameraTimer);cameraTimer=null;} if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;} if($('scannerVideo'))$('scannerVideo').srcObject=null; $('cameraModal')?.classList.add('hidden');
}

function addUser(){
  if(!requireRole(['مدير']))return;
  const n=$('uName').value.trim(), pass=$('uPass').value, role=$('uRole').value; if(!n||!pass)return toast('اسم المستخدم وكلمة المرور مطلوبان'); if(users.some(u=>u.name===n))return toast('المستخدم موجود');
  users.push({id:Date.now(),name:n,role,pass}); saveAll(); $('uName').value='';$('uPass').value=''; renderUsers(); toast('تمت إضافة المستخدم');
}
function editUser(id){
  if(!requireRole(['مدير']))return;
  const u=users.find(x=>String(x.id)===String(id));if(!u)return;
  openModal('تعديل المستخدم',`<div class="form"><input id="muName" class="input" value="${esc(u.name)}"><input id="muPass" class="input" type="password" placeholder="كلمة مرور جديدة (اختياري)"><select id="muRole" class="input"><option ${u.role==='مدير'?'selected':''}>مدير</option><option ${u.role==='كاشير'?'selected':''}>كاشير</option><option ${u.role==='مخزن'?'selected':''}>مخزن</option><option ${u.role==='حسابات'?'selected':''}>حسابات</option></select><button class="btn primary wide" onclick="updateUser(${u.id})">حفظ</button></div>`);
}
function updateUser(id){
  const u=users.find(x=>String(x.id)===String(id));if(!u)return;const n=$('muName').value.trim();if(!n)return toast('اسم المستخدم مطلوب');if(users.some(x=>String(x.id)!==String(id)&&x.name===n))return toast('اسم المستخدم مستخدم');u.name=n;u.role=$('muRole').value;if($('muPass').value)u.pass=$('muPass').value;saveAll();closeModal();renderUsers();setCurrentUser();toast('تم تحديث المستخدم');
}
function delUser(id){
  if(!requireRole(['مدير']))return; const s=currentSession(); if(String(id)===String(s?.id))return toast('لا يمكنك حذف المستخدم الحالي'); const u=users.find(x=>String(x.id)===String(id)); if(!u)return; if(u?.name==='admin')return toast('لا يمكن حذف مدير النظام الأساسي');
  if(!confirm(`هل أنت متأكد من حذف المستخدم "${u.name}"؟`)) return;
  users=users.filter(x=>String(x.id)!==String(id)); saveAll(); renderUsers(); toast('تم حذف المستخدم');
}
function renderUsers(){
  const root=$('userTable');if(!root)return;
  root.innerHTML=users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${u.role==='مدير'?'كل الصلاحيات':u.role==='كاشير'?'POS والعملاء':u.role==='مخزن'?'المخزن':'الحسابات والتقارير'}</td><td>${currentSession()?.role==='مدير'?`<button class="btn secondary" onclick="editUser(${u.id})">تعديل</button> <button class="btn danger" onclick="delUser(${u.id})">حذف</button>`:''}</td></tr>`).join('');
}

function renderAll(){
  renderProducts(); renderCart(); renderInventory(); renderSuppliers(); renderCustomers(); renderAccounts(); renderDashboard(); renderReports(); renderUsers(); renderHeld();
  if($('shopName'))$('shopName').value=cfg().shopName; if($('currency'))$('currency').value=cfg().currency;
  if($('invCount'))$('invCount').textContent=products.length;
  if($('stockValue'))$('stockValue').textContent=money(sum(products,p=>p.buy*p.qty));
  if($('lowCount'))$('lowCount').textContent=products.filter(p=>p.qty<=p.min).length;
  if($('soldCount'))$('soldCount').textContent=sum(sales,x=>sum(x.items||[],i=>i.qty));
}

$('loginPass')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('loginUser')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('loginPass')?.focus()});
$('posBarcode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();scan(e.target.value,'pos')}});
$('pBarcode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();scan(e.target.value,'inventory')}});
$('posSearch')?.addEventListener('input',renderProducts);
$('invSearch')?.addEventListener('input',renderInventory);
$('supSearch')?.addEventListener('input',renderSuppliers);
$('custSearch')?.addEventListener('input',renderCustomers);
$('cartDiscount')?.addEventListener('input',renderCart);
$('cartTax')?.addEventListener('input',renderCart);
window.addEventListener('keydown',e=>{
  if(e.key==='F2'){e.preventDefault();checkout();}
  else if(e.key==='F4'){e.preventDefault();clearCart();}
  else if(e.key==='F8'){e.preventDefault();go('pos');$('posSearch')?.focus();}
  else if(e.key==='F9'){e.preventDefault();holdCart();}
  else if(e.key==='F10'){e.preventDefault();restoreCart();}
  else if(e.key==='Escape' && !$('cameraModal')?.classList.contains('hidden')) stopCamera();
});
navInit();
const rememberedUser = localStorage.getItem('fs_remember_user');
if (rememberedUser && $('loginUser')) {
  $('loginUser').value = rememberedUser;
  if ($('loginRemember')) $('loginRemember').checked = true;
}

const session=currentSession();
if(session){const u=users.find(x=>String(x.id)===String(session.id));if(u){$('login').classList.add('hidden');$('app').classList.remove('hidden');setCurrentUser();applyRole(u.role);}}
renderAll();
