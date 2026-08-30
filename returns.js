(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const money = n => `${(+n || 0).toFixed(2)} ${typeof cfg === 'function' ? (cfg().currency || 'ج') : 'ج'}`;
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const RETURN_KEY = 'fs_returns';
  let returns = read(RETURN_KEY, []);
  const saveReturns = () => localStorage.setItem(RETURN_KEY, JSON.stringify(returns));
  const sid = sale => String(sale?.id ?? '');
  const returnedQty = (saleId, productId) => returns.filter(r => sid(r.saleId) === String(saleId)).reduce((n, r) => n + (+r.items.find(i => String(i.productId) === String(productId))?.qty || 0), 0);
  const customerLabel = id => typeof customerName === 'function' ? customerName(id) : (customers.find(c => String(c.id) === String(id))?.name || 'عميل نقدي');

  function ensurePanel() {
    const accounts = $('accounts');
    if (!accounts || $('salesReturnsPanel')) return;
    accounts.insertAdjacentHTML('beforeend', `
      <div id="salesReturnsPanel" class="panel" style="margin-top:18px">
        <div class="toolbar" style="justify-content:space-between">
          <div><h3>طلبات المبيعات والمرتجعات</h3><div class="muted">اختر الفاتورة ثم نفّذ مرتجعًا كاملًا أو جزئيًا.</div></div>
          <input id="returnsSearch" class="input" style="max-width:280px" placeholder="بحث برقم الفاتورة أو العميل...">
        </div>
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الدفع</th><th>الإجمالي</th><th>المرتجع</th><th>الحالة</th><th>إجراء</th>
        </tr></thead><tbody id="salesReturnsTable"></tbody></table></div>
      </div>`);
    $('returnsSearch').addEventListener('input', renderTable);
  }

  function renderTable() {
    const tbody = $('salesReturnsTable');
    if (!tbody) return;
    const q = ($('returnsSearch')?.value || '').trim().toLowerCase();
    const list = (sales || []).filter(s => `${s.invoiceNo || s.id} ${customerLabel(s.customer)}`.toLowerCase().includes(q));
    tbody.innerHTML = list.map(s => {
      const already = returns.filter(r => sid(r.saleId) === sid(s));
      const amount = already.reduce((n, r) => n + (+r.total || 0), 0);
      const full = (s.items || []).length > 0 && (s.items || []).every(i => returnedQty(s.id, i.id) >= (+i.qty || 0));
      const status = full ? 'مرتجع بالكامل' : amount > 0 ? 'مرتجع جزئي' : 'سليمة';
      return `<tr>
        <td><b>${esc(s.invoiceNo || s.id)}</b></td>
        <td>${esc(String(s.date || ''))}</td>
        <td>${esc(customerLabel(s.customer))}</td>
        <td>${esc(s.payment || 'نقدي')}</td>
        <td>${money(s.total)}</td>
        <td>${money(amount)}</td>
        <td>${status}</td>
        <td><button class="btn secondary" ${full ? 'disabled' : ''} onclick="openReturnModal('${esc(s.id)}')">${full ? 'تم الاسترجاع' : 'مرتجع'}</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">لا توجد فواتير مبيعات</td></tr>';
  }

  function openReturnModal(id) {
    if (typeof requireRole === 'function' && !requireRole(['مدير','حسابات'])) return;
    const sale = (sales || []).find(s => sid(s) === String(id));
    if (!sale) return;
    openModal('مرتجع مبيعات', `
      <div class="panel" style="box-shadow:none;padding:0">
        <p><b>الفاتورة:</b> ${esc(sale.invoiceNo || sale.id)} — <b>العميل:</b> ${esc(customerLabel(sale.customer))}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>الصنف</th><th>المباع</th><th>تم رده</th><th>المتاح</th><th>السعر</th><th>المرتجع</th></tr></thead>
        <tbody>${(sale.items || []).map(i => {
          const done = returnedQty(sale.id, i.id); const available = Math.max(0, (+i.qty || 0) - done);
          return `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${done}</td><td>${available}</td><td>${money(i.sell)}</td><td><input class="input return-qty" data-pid="${esc(i.id)}" data-price="${+i.sell||0}" data-cost="${+i.buy||0}" data-max="${available}" type="number" min="0" max="${available}" value="0" style="width:95px" ${available===0?'disabled':''}></td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="actions"><button class="btn primary" onclick="processReturn('${esc(sale.id)}')">تنفيذ المرتجع</button><button class="btn secondary" onclick="closeModal()">إلغاء</button></div>
        <p class="muted">يتم إرجاع الكمية للمخزن، وعكس أثر المبيعات والعميل الآجل، وتسجيل العملية كسند مرتجع مستقل.</p>
      </div>`);
  }

  function processReturn(id) {
    if (typeof requireRole === 'function' && !requireRole(['مدير','حسابات'])) return;
    const sale = (sales || []).find(s => sid(s) === String(id));
    if (!sale) return;
    const items = [...document.querySelectorAll('.return-qty')].map(input => ({
      productId: input.dataset.pid,
      qty: Math.min(Math.max(0, +input.value || 0), +input.dataset.max || 0),
      sell: +input.dataset.price || 0,
      buy: +input.dataset.cost || 0
    })).filter(x => x.qty > 0);
    if (!items.length) return toast('أدخل كمية مرتجع واحدة على الأقل');

    const returnSubtotal = items.reduce((n, i) => n + i.sell * i.qty, 0);
    const originalSubtotal = +sale.subtotal || +sale.total || 0;
    const refundFactor = originalSubtotal > 0 ? (+sale.total || 0) / originalSubtotal : 1;
    const total = returnSubtotal * refundFactor;
    const cost = items.reduce((n, i) => n + i.buy * i.qty, 0);
    const returnId = Date.now();

    for (const item of items) {
      const p = products.find(p => String(p.id) === String(item.productId));
      if (!p) return toast('أحد الأصناف غير موجود بالمخزن');
    }
    for (const item of items) {
      const p = products.find(p => String(p.id) === String(item.productId));
      const before = +p.qty || 0; p.qty = before + item.qty;
      if (typeof logMovement === 'function') logMovement(p.id, p.name, item.qty, 'استرجاع', `مرتجع ${sale.invoiceNo || sale.id}`);
    }

    returns.unshift({ id:returnId, saleId:sale.id, invoiceNo:sale.invoiceNo || sale.id, date:new Date().toLocaleString('ar-EG'), userId:(typeof currentUser !== 'undefined' && currentUser?.id) || null, customer:sale.customer || '', payment:sale.payment || 'نقدي', subtotal:returnSubtotal, total, cost, items });
    if (sale.payment === 'آجل' && sale.customer) {
      const c = customers.find(c => String(c.id) === String(sale.customer));
      if (c) c.balance = Math.max(0, (+c.balance || 0) - total);
    }
    if (typeof save === 'function') save();
    saveReturns();
    closeModal();
    if (typeof renderAll === 'function') renderAll();
    renderTable();
    toast(`تم تنفيذ المرتجع بقيمة ${money(total)}`);
  }

  const start = () => { ensurePanel(); renderTable(); };
  window.openReturnModal = openReturnModal;
  window.processReturn = processReturn;
  window.renderSalesReturns = renderTable;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  setTimeout(start, 100);
})();
