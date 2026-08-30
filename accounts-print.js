(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const moneyLocal = n => `${(+n || 0).toFixed(2)} ${(typeof cfg === 'function' ? (cfg().currency || 'ج') : 'ج')}`;

  function getReturns() { return read('fs_returns', []); }
  function getSales() { return Array.isArray(window.sales) ? window.sales : read('fs_sales', []); }
  function getCustomers() { return Array.isArray(window.customers) ? window.customers : read('fs_customers', []); }
  function customerNameLocal(id) { return (getCustomers().find(c => String(c.id) === String(id)) || {}).name || 'عميل نقدي'; }
  function userNameLocal(id) { const us = read('fs_users', []); return (us.find(u => String(u.id) === String(id)) || {}).name || '-'; }
  function saleById(id) { return getSales().find(s => String(s.id) === String(id)); }

  function printWindow(title, bodyHtml) {
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) { if (typeof toast === 'function') toast('اسمح بالنوافذ المنبثقة للطباعة'); else alert('اسمح بالنوافذ المنبثقة للطباعة'); return; }
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#111;padding:24px;direction:rtl}h1,h2,h3{margin:0 0 10px}.muted{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:right}th{background:#f8fafc}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:15px 0}.box{border:1px solid #ddd;border-radius:10px;padding:10px}.total{font-size:20px;font-weight:900}@media print{body{padding:8mm}.no-print{display:none!important}}</style></head><body>${bodyHtml}<div class="no-print" style="margin-top:20px"><button onclick="window.print()" style="padding:10px 18px;font-weight:800">طباعة</button></div><script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script></body></html>`);
    w.document.close();
  }

  function printReturnReceipt(returnId) {
    const r = getReturns().find(x => String(x.id) === String(returnId));
    if (!r) return;
    const items = (r.items || []).map(i => `<tr><td>${esc(i.name || 'صنف')}</td><td>${+i.qty || 0}</td><td>${moneyLocal(i.sell)}</td><td>${moneyLocal((+i.qty || 0) * (+i.sell || 0))}</td></tr>`).join('');
    const html = `<h1 style="text-align:center">Five Stars</h1><h3 style="text-align:center">إيصال مرتجع مبيعات</h3><div class="summary"><div class="box"><b>رقم المرتجع</b><div>${esc(r.id)}</div></div><div class="box"><b>الفاتورة الأصلية</b><div>${esc(r.invoiceNo || r.saleId)}</div></div><div class="box"><b>التاريخ</b><div>${esc(new Date(r.date).toLocaleString('ar-EG'))}</div></div></div><p>العميل: <b>${esc(customerNameLocal(r.customer))}</b></p><p>المستخدم: <b>${esc(userNameLocal(r.userId))}</b></p><table><thead><tr><th>الصنف</th><th>الكمية المرتجعة</th><th>سعر الوحدة</th><th>القيمة</th></tr></thead><tbody>${items}</tbody></table><div class="total" style="text-align:left;margin-top:15px">إجمالي المرتجع: ${moneyLocal(r.total)}</div>`;
    printWindow(`مرتجع ${r.invoiceNo || r.id}`, html);
  }

  function printOriginalSale(returnId) {
    const r = getReturns().find(x => String(x.id) === String(returnId));
    const sale = r ? saleById(r.saleId) : null;
    if (!sale) return (typeof toast === 'function' ? toast('الفاتورة الأصلية غير موجودة') : alert('الفاتورة الأصلية غير موجودة'));
    if (typeof window.printInvoice === 'function') window.printInvoice(sale);
    else if (typeof window.printInvoiceById === 'function') window.printInvoiceById(sale.id);
    else {
      const items = (sale.items || []).map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${moneyLocal(i.sell)}</td><td>${moneyLocal((+i.sell||0)*(+i.qty||0))}</td></tr>`).join('');
      printWindow(`فاتورة ${sale.invoiceNo || sale.id}`, `<h1 style="text-align:center">Five Stars</h1><h3 style="text-align:center">فاتورة بيع</h3><p>الفاتورة: <b>${esc(sale.invoiceNo || sale.id)}</b></p><p>العميل: <b>${esc(customerNameLocal(sale.customer))}</b></p><table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>القيمة</th></tr></thead><tbody>${items}</tbody></table><div class="total">الإجمالي: ${moneyLocal(sale.total)}</div>`);
    }
  }

  function printReturnsReport() {
    const returns = getReturns();
    const total = returns.reduce((n, r) => n + (+r.total || 0), 0);
    const rows = returns.map(r => `<tr><td>${esc(r.invoiceNo || r.saleId)}</td><td>${esc(new Date(r.date).toLocaleString('ar-EG'))}</td><td>${esc(customerNameLocal(r.customer))}</td><td>${esc(userNameLocal(r.userId))}</td><td>${moneyLocal(r.total)}</td></tr>`).join('');
    const html = `<h1 style="text-align:center">Five Stars — تقرير مرتجعات المبيعات</h1><p>تاريخ التقرير: ${esc(new Date().toLocaleString('ar-EG'))}</p><div class="summary"><div class="box"><b>عدد عمليات المرتجع</b><div>${returns.length}</div></div><div class="box"><b>إجمالي قيمة المرتجعات</b><div>${moneyLocal(total)}</div></div><div class="box"><b>صافي المبيعات بعد المرتجعات</b><div>${moneyLocal(getSales().reduce((n,s)=>n+(+s.total||0),0)-total)}</div></div></div><table><thead><tr><th>الفاتورة الأصلية</th><th>تاريخ المرتجع</th><th>العميل</th><th>المستخدم</th><th>قيمة المرتجع</th></tr></thead><tbody>${rows}</tbody></table>`;
    printWindow('تقرير مرتجعات المبيعات', html);
  }

  function renderHistory() {
    const accounts = $('accounts');
    if (!accounts) return;
    let panel = $('returnsHistoryPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'returnsHistoryPanel';
      panel.className = 'panel';
      panel.style.marginTop = '18px';
      accounts.appendChild(panel);
    }
    const returns = getReturns().slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    panel.innerHTML = `<div class="toolbar" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div><h3>عمليات المرتجع المنفذة</h3><div class="muted">سجل كامل للمرتجعات التي تم تنفيذها مع خيارات الطباعة.</div></div><div class="actions" style="margin-top:0"><button class="btn secondary" onclick="printReturnsReport()">🖨 تقرير المرتجعات</button></div></div>${returns.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>رقم المرتجع</th><th>الفاتورة الأصلية</th><th>التاريخ</th><th>العميل</th><th>المستخدم</th><th>القيمة</th><th>الطباعة</th></tr></thead><tbody>${returns.map(r => `<tr><td><b>R-${esc(r.id)}</b></td><td>${esc(r.invoiceNo || r.saleId)}</td><td>${esc(new Date(r.date).toLocaleString('ar-EG'))}</td><td>${esc(customerNameLocal(r.customer))}</td><td>${esc(userNameLocal(r.userId))}</td><td><b>${moneyLocal(r.total)}</b></td><td><div class="actions" style="margin:0;gap:5px"><button class="btn secondary" onclick="printReturnReceipt('${esc(r.id)}')">إيصال المرتجع</button><button class="btn secondary" onclick="printOriginalSale('${esc(r.id)}')">الفاتورة الأصلية</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty" style="padding:25px">لا توجد عمليات مرتجع منفذة حتى الآن.</div>'}`;
  }

  window.printReturnReceipt = printReturnReceipt;
  window.printOriginalSale = printOriginalSale;
  window.printReturnsReport = printReturnsReport;
  window.renderReturnsHistory = renderHistory;

  function start() {
    renderHistory();
    setTimeout(renderHistory, 200);
    document.addEventListener('click', e => {
      const nav = e.target.closest('.nav button[data-page="accounts"]');
      if (nav) setTimeout(renderHistory, 80);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
