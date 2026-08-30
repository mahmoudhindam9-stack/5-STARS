const seed = [
  ['لمبة LED 12W', '10000001', 35, 55, 80, 10, 'قطعة', 'لمبات'],
  ['كابل نحاس 2.5 مم', '10000002', 120, 175, 35, 10, 'متر', 'كابلات'],
  ['مفتاح مفرد', '10000003', 18, 30, 120, 10, 'قطعة', 'مفاتيح'],
  ['بريزة مزدوجة', '10000004', 28, 45, 75, 10, 'قطعة', 'برايز'],
  ['قاطع 16 أمبير', '10000005', 65, 90, 30, 10, 'قطعة', 'قواطع']
];

const K = {
  p: 'fs_products', c: 'fs_customers', s: 'fs_sales', e: 'fs_expenses',
  u: 'fs_users', h: 'fs_held_carts', m: 'fs_movements', r: 'fs_receipts',
  cfg: 'fs_settings'
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

let products = normalizeProducts(read(K.p, null));
let customers = read(K.c, []);
let sales = read(K.s, []);
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
function datePart(v) { return new Date(v).toISOString().slice(0,10); }
function sum(arr, fn) { return arr.reduce((a, x) => a + (+fn(x) || 0), 0); }
function customerName(id) { return customers.find(c => String(c.id) === String(id))?.name || 'عميل نقدي'; }
function userName(id) { return users.find(u => String(u.id) === String(id))?.name || '-'; }
function currentSession() { try { return JSON.parse(sessionStorage.getItem('fs_session') || 'null'); } catch { return null; } }
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
  const u = users.find(x => x.name === n && x.pass === p);
  if (!u) { $('loginError').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة'; return; }
  const session = { id:u.id, name:u.name, role:u.role, loginAt:new Date().toISOString() };
  sessionStorage.setItem('fs_session', JSON.stringify(session));
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  setCurrentUser(); applyRole(u.role); renderAll(); setTimeout(() => $('posBarcode')?.focus(), 50);
  $('loginError').textContent = '';
}
function logout() { sessionStorage.removeItem('fs_session'); location.reload(); }
function setCurrentUser() {
  const s = currentSession(); if (!s) return;
  const label = `${s.name} • ${s.role}`;
  if ($('currentUser')) $('currentUser').textContent = label;
  if ($('sideUser')) $('sideUser').textContent = label;
}
function applyRole(role) {
  const allow = {
    'مدير': ['dashboard','pos','inventory','customers','accounts','reports','users','settings'],
    'كاشير': ['pos','customers'],
    'مخزن': ['inventory'],
    'حسابات': ['accounts','reports']
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
    $('pageTitle').textContent = b.textContent.replace(/^[^\s]+\s*/, '');
    if (b.dataset.page === 'pos') setTimeout(() => $('posBarcode')?.focus(), 20);
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
function clearCart() { cart = []; renderCart(); $('posBarcode')?.focus(); }
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
  root.innerHTML = cart.map(x => {
    const p=products.find(p=>String(p.id)===String(x.id)); if (!p) return '';
    const v=p.sell*x.qty;
    return `<div class="cart-row"><div><b>${esc(p.name)}</b><div class="muted">${money(p.sell)} × ${x.qty} ${esc(p.unit)}</div></div><div class="qty"><button onclick="qty(${p.id},-1)">−</button><span>${x.qty}</span><button onclick="qty(${p.id},1)">+</button></div><b>${money(v)}</b><button class="btn danger" onclick="removeCart(${p.id})">×</button></div>`;
  }).join('') || '<div class="empty">السلة فارغة</div>';
  const t=cartTotals();
  if ($('cartSubtotal')) $('cartSubtotal').textContent=money(t.subtotal);
  if ($('cartTotal')) $('cartTotal').textContent=money(t.total);
  if ($('cartCount')) $('cartCount').textContent=`${sum(cart,x=>x.qty)} وحدة`;
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
  saveAll(); renderAll(); printInvoice(sale); toast(`تم حفظ الفاتورة ${sale.invoiceNo}`);
}
function holdCart() {
  if (!cart.length) return toast('السلة فارغة');
  const id=Date.now();
  heldCarts.unshift({ id, createdAt:new Date().toISOString(), userId:currentSession()?.id||null, cart:JSON.parse(JSON.stringify(cart)), payment:$('payment')?.value||'نقدي', customer:$('customerSelect')?.value||'', discount:+($('cartDiscount')?.value||0), tax:+($('cartTax')?.value||0) });
  cart=[]; renderCart(); saveAll(); renderHeld(); toast('تم تعليق البيع');
}
function restoreCart() {
  if (!heldCarts.length) return toast('لا توجد مبيعات معلقة');
  const h=heldCarts.shift(); cart=h.cart||[];
  if($('payment')) $('payment').value=h.payment||'نقدي';
  if($('customerSelect')) $('customerSelect').value=h.customer||'';
  if($('cartDiscount')) $('cartDiscount').value=h.discount||0;
  if($('cartTax')) $('cartTax').value=h.tax||0;
  renderCart(); renderHeld(); saveAll(); toast('تم استرجاع البيع المعلق');
}
function renderHeld() {
  const root=$('heldSales'); if(!root) return;
  root.innerHTML = heldCarts.length ? `<div class="muted">مبيعات معلقة: <b>${heldCarts.length}</b></div>` : '';
}

function addProduct() {
  if (!requireRole(['مدير','مخزن'])) return;
  const name=$('pName')?.value.trim(), barcode=$('pBarcode')?.value.trim();
  if(!name || !barcode) return toast('اسم الصنف والباركود مطلوبان');
  if(products.some(p=>p.barcode===barcode)) return toast('الباركود مستخدم بالفعل');
  const p={ id:Date.now(), name, barcode, buy:+$('pBuy').value||0, sell:+$('pSell').value||0, qty:Math.max(0,+$('pQty').value||0), min:Math.max(0,+$('pMin').value||0), unit:$('pUnit').value.trim()||'قطعة', cat:$('pCat').value.trim()||'عام' };
  products.unshift(p);
  if(p.qty) recordMovement(p.id,0,p.qty,'رصيد افتتاحي');
  resetForm(); saveAll(); renderAll(); toast('تم حفظ الصنف');
}
function resetForm(){['pName','pBarcode','pBuy','pSell','pQty','pMin','pUnit','pCat'].forEach(id=>{if($(id)) $(id).value=''}); if($('pQty')) $('pQty').value=0; if($('pMin')) $('pMin').value=0;}
function editProduct(id) {
  if (!requireRole(['مدير','مخزن'])) return;
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  openModal('تعديل الصنف', `<div class="form"><input id="mName" class="input" value="${esc(p.name)}"><input id="mBarcode" class="input" value="${esc(p.barcode)}"><input id="mBuy" class="input" type="number" min="0" step="0.01" value="${p.buy}"><input id="mSell" class="input" type="number" min="0" step="0.01" value="${p.sell}"><input id="mQty" class="input" type="number" min="0" value="${p.qty}"><input id="mMin" class="input" type="number" min="0" value="${p.min}"><input id="mUnit" class="input" value="${esc(p.unit)}"><input id="mCat" class="input" value="${esc(p.cat)}"><button class="btn primary wide" onclick="updateProduct(${p.id})">حفظ</button></div>`);
}
function updateProduct(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  const b=$('mBarcode').value.trim(); if(!b) return toast('الباركود مطلوب');
  if(products.some(x=>String(x.id)!==String(id)&&x.barcode===b)) return toast('الباركود مستخدم');
  if(!requireRole(['مدير','مخزن'])) return;
  const before=p.qty;
  Object.assign(p,{name:$('mName').value.trim(),barcode:b,buy:+$('mBuy').value||0,sell:+$('mSell').value||0,qty:Math.max(0,+$('mQty').value||0),min:Math.max(0,+$('mMin').value||0),unit:$('mUnit').value.trim()||'قطعة',cat:$('mCat').value.trim()||'عام'});
  if(before!==p.qty) recordMovement(p.id,before,p.qty,'تسوية يدوية');
  saveAll(); closeModal(); renderAll(); toast('تم تحديث الصنف');
}
function delProduct(id){
  if(!requireRole(['مدير'])) return;
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  if(confirm(`حذف ${p.name}؟`)){products=products.filter(x=>String(x.id)!==String(id)); cart=cart.filter(x=>String(x.id)!==String(id)); saveAll(); renderAll();}
}
function renderInventory(){
  const q=($('invSearch')?.value||'').toLowerCase();
  const a=products.filter(p=>(`${p.name} ${p.barcode} ${p.cat} ${p.unit}`).toLowerCase().includes(q));
  const root=$('invTable'); if(!root) return;
  root.innerHTML=a.map(p=>`<tr><td><b>${esc(p.name)}</b><div class="muted">${esc(p.cat)}</div></td><td>${esc(p.barcode)}</td><td>${esc(p.unit)}</td><td class="${p.qty<=p.min?'low':''}">${p.qty}</td><td>${money(p.buy)}</td><td>${money(p.sell)}</td><td><button class="btn secondary" onclick="editProduct(${p.id})">تعديل</button> ${currentSession()?.role==='مدير'?`<button class="btn danger" onclick="delProduct(${p.id})">حذف</button>`:''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">لا توجد أصناف</td></tr>';
  const m=$('movementsLog'); if(m) m.innerHTML=movements.slice(0,20).map(v=>`<p><b>${esc(v.product)}</b> — ${v.delta>0?'+':''}${v.delta} <span class="muted">${esc(v.reason)} • ${new Date(v.date).toLocaleString('ar-EG')}</span></p>`).join('') || '<div class="empty">لا توجد حركة</div>';
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
  if(sales.some(s=>String(s.customer)===String(id))) return toast('لا يمكن حذف عميل له فواتير؛ عدّل بياناته بدلًا من الحذف');
  customers=customers.filter(c=>String(c.id)!==String(id)); saveAll(); renderAll();
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
function renderCustomers(){
  const q=($('custSearch')?.value||'').toLowerCase();
  if($('customerSelect')) $('customerSelect').innerHTML='<option value="">عميل نقدي</option>'+customers.map(c=>`<option value="${c.id}">${esc(c.name)} — ${money(c.balance)}</option>`).join('');
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
  const data={version:2,exportedAt:new Date().toISOString(),products,customers,sales,expenses,users,heldCarts,movements,receipts,settings};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`five-stars-backup-${todayKey()}.json`; a.click(); URL.revokeObjectURL(a.href); toast('تم تصدير النسخة الاحتياطية');
}
function importBackup(ev){
  if(!requireRole(['مدير'])) return;
  const file=ev.target.files?.[0]; if(!file)return;
  const r=new FileReader(); r.onload=()=>{try{const d=JSON.parse(r.result); if(!d||!Array.isArray(d.products)||!Array.isArray(d.sales)) throw new Error(); products=normalizeProducts(d.products); customers=d.customers||[]; sales=d.sales||[]; expenses=d.expenses||[]; users=d.users||users; heldCarts=d.heldCarts||[]; movements=d.movements||[]; receipts=d.receipts||[]; settings={...settings,...(d.settings||{})}; saveAll(); renderAll(); toast('تم استيراد البيانات بنجاح');}catch{toast('ملف النسخة الاحتياطية غير صالح')} }; r.readAsText(file); ev.target.value='';
}
function resetDemo(){
  if(!requireRole(['مدير'])) return;
  if(!confirm('سيتم حذف بيانات المبيعات والعملاء والمصروفات وإرجاع الأصناف التجريبية. هل أنت متأكد؟'))return;
  products=normalizeProducts(null); customers=[]; sales=[]; expenses=[]; heldCarts=[]; movements=[]; receipts=[]; saveAll(); cart=[]; renderAll(); toast('تمت إعادة بيانات التجربة');
}
function saveSettings(){
  if(!requireRole(['مدير'])) return;
  settings.shopName=$('shopName').value.trim()||'Five Stars'; settings.currency=$('currency').value.trim()||'ج'; saveAll(); renderAll(); toast('تم حفظ الإعدادات');
}
function openModal(title, html){
  const root=$('modalRoot'); root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="toolbar"><h3 style="flex:1">${title}</h3><button class="btn secondary" onclick="closeModal()">إغلاق</button></div><hr>${html}</div></div>`;
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
  if(!requireRole(['مدير']))return; const s=currentSession(); if(String(id)===String(s?.id))return toast('لا يمكنك حذف المستخدم الحالي'); const u=users.find(x=>String(x.id)===String(id)); if(u?.name==='admin')return toast('لا يمكن حذف مدير النظام الأساسي'); users=users.filter(x=>String(x.id)!==String(id)); saveAll(); renderUsers();
}
function renderUsers(){
  const root=$('userTable');if(!root)return;
  root.innerHTML=users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${u.role==='مدير'?'كل الصلاحيات':u.role==='كاشير'?'POS والعملاء':u.role==='مخزن'?'المخزن':'الحسابات والتقارير'}</td><td>${currentSession()?.role==='مدير'?`<button class="btn secondary" onclick="editUser(${u.id})">تعديل</button> <button class="btn danger" onclick="delUser(${u.id})">حذف</button>`:''}</td></tr>`).join('');
}

function renderAll(){
  renderProducts(); renderCart(); renderInventory(); renderCustomers(); renderAccounts(); renderDashboard(); renderReports(); renderUsers(); renderHeld();
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
const session=currentSession();
if(session){const u=users.find(x=>String(x.id)===String(session.id));if(u){$('login').classList.add('hidden');$('app').classList.remove('hidden');setCurrentUser();applyRole(u.role);}}
renderAll();
