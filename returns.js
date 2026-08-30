(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const money = n => `${(+n || 0).toFixed(2)} ${window.cfg ? (cfg().currency || 'ج') : 'ج'}`;
  const key = 'fs_returns';
  const read = (k,d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  let returns = read(key, []);
  const saveReturns = () => localStorage.setItem(key, JSON.stringify(returns));
  const saleId = s => String(s?.id ?? '');
  const saleReturns = id => returns.filter(r => saleId(r.saleId) === String(id));
  const returnedQty = (id, productId) => saleReturns(id).reduce((n,r) => n + (+r.items.find(i => String(i.productId) === String(productId))?.qty || 0), 0);
  const customerNameSafe = id => window.customerName ? customerName(id) : (window.customers?.find(c => String(c.id)===String(id))?.name || 'عميل نقدي');

  function ensureAccountsPanel() {
    const accounts = $('accounts');
    if (!accounts || $('salesReturnsPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'salesReturnsPanel';
    panel.className = 'panel';
    panel.style.marginTop = '18px';
    panel.innerHTML = `
      <div class="toolbar" style="justify-content:space-between;">
        <div><h3>طلبات المبيعات والمرتجعات</h3><div class="muted">راجع الفواتير واعمل مرتجع كامل أو جزئي.</div></div>
        <input id="returnsSearch" class="input" style="max-width:280px" placeholder="بحث برقم الفاتورة أو العميل...">
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الدفع</th><th>الإجمالي</th><th>المرتجع</th><th>الحالة</th><th>إجراء</th></tr></thead>
          <tbody id="salesReturnsTable"></tbody>
        </table>
      </div>`;
    accounts.appendChild(panel);
    $('returnsSearch').addEventListener('input', renderSalesTable);
    renderSalesTable();
  }

  function renderSalesTable() {
    const tbody = $('salesReturnsTable');
    if (!tbody) return;
    const q = ($('returnsSearch')?.value || '').trim().toLowerCase();
    const list = (window.sales || []).filter(s => {
      const hay = `${s.invoiceNo || ''} ${customerNameSafe(s.customer)} ${s.total || ''}`.toLowerCase();
      return !q || hay.includes(q);
    });
    tbody.innerHTML = list.map(s => {
      const allReturned = s.items?.every(i => (+i.qty || 0) <= returnedQty(s.id, i.id));
      const amount = saleReturns(s.id).reduce((n,r) => n + (+r.total || 0), 0);
      const status = allReturned && s.items?.length ? 'مرتجع بالكامل' : amount > 0 ? 'مرتجع جزئي' : 'سليمة';
      const disabled = allReturned ? 'disabled' : '';
      return `<tr><td><b>${esc(s.invoiceNo || s.id)}</b></td><td>${new Date(s.date).toLocaleString('ar-EG')}</td><td>${esc(customerNameSafe(s.customer))}</td><td>${esc(s.payment || 'نقدي')}</td><td>${money(s.total)}</td><td>${money(amount)}</td><td>${status}</td><td><button class="btn secondary" ${disabled} onclick="window.openReturnModal('${esc(s.id)}')">${allReturned ? 'تم الاسترجاع' : 'مرتجع'}</button></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">لا توجد فواتير مبيعات</td></tr>';
  }

  function openReturnModal(id) {
    if (!window.requireRole || !requireRole(['مدير','حسابات'])) return;
    const sale = (window.sales || []).find(s => saleId(s) === String(id));
    if (!sale) return;
    const existing = saleReturns(sale.id);
    const html = `<div class="panel" style="box-shadow:none;padding:0"><p><b>فاتورة:</b> ${esc(sale.invoiceNo || sale.id)} — ${esc(customerNameSafe(sale.customer))}</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>الصنف</th><th>المباع</th><th>تم رده</th><th>المتاح للمرتجع</th><th>سعر</th><th>كمية المرتجع</th></tr></thead><tbody>
      ${sale.items.map(i => { const r=returnedQty(sale.id,i.id), avail=Math.max(0,(+i.qty||0)-r); return `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${r}</td><td>${avail}</td><td>${money(i.sell)}</td><td><input class="input return-qty" data-pid="${esc(i.id)}" data-price="${+i.sell||0}" data-cost="${+i.buy||0}" data-max="${avail}" type="number" min="0" max="${avail}" value="0" style="width:95px" ${avail===0?'disabled':''}></td></tr>`; }).join('')}</tbody></table></div>
      <div class="actions"><button class="btn primary" onclick="window.processReturn('${esc(sale.id)}')">تنفيذ المرتجع</button><button class="btn secondary" onclick="window.closeModal()">إلغاء</button></div>
      <p class="muted">المرتجع يعيد الكمية للمخزن، ويعكس قيمة البيع وتكلفة البضاعة وأثر العميل الآجل.</p></div>`;
    window.openModal('مرتجع مبيعات', html);
  }

  function processReturn(id) {
    if (!window.requireRole || !requireRole(['مدير','حسابات'])) return;
    const sale=(window.sales || []).find(s=>saleId(s)===String(id)); if(!sale) return;
    const inputs=[...document.querySelectorAll('.return-qty')];
    const items=inputs.map(input => ({ productId:input.dataset.pid, qty:Math.min(Math.max(0,+input.value||0),+input.dataset.max||0), sell:+input.dataset.price||0, buy:+input.dataset.cost||0 }))
      .filter(i=>i.qty>0);
    if(!items.length) return toast('أدخل كمية مرتجع واحدة على الأقل');
    const total=items.reduce((n,i)=>n+i.sell*i.qty,0);
    const cost=items.reduce((n,i)=>n+i.buy*i.qty,0);
    const returnId=Date.now();
    for(const item of items){
      const p=(window.products || []).find(p=>String(p.id)===String(item.productId));
      if(!p) return toast('يوجد صنف غير موجود بالمخزن');
      const before=+p.qty||0; p.qty=before+item.qty;
      if(window.recordMovement) recordMovement(p.id,before,p.qty,'مرتجع مبيعات',returnId);
    }
    returns.unshift({id:returnId,saleId:sale.id,date:new Date().toISOString(),userId:window.currentSession?.()?.id||null,customer:sale.customer,total,cost,items:items.map(i=>({...i,qty:i.qty}))});
    if(sale.payment==='آجل' && sale.customer){ const c=(window.customers||[]).find(c=>String(c.id)===String(sale.customer)); if(c) c.balance=Math.max(0,(+c.balance||0)-total); }
    if(window.saveAll) saveAll(); else { if(window.products) localStorage.setItem('fs_products',JSON.stringify(window.products)); if(window.customers) localStorage.setItem('fs_customers',JSON.stringify(window.customers)); }
    saveReturns();
    window.closeModal?.();
    window.renderAll?.();
    renderSalesTable();
    toast(`تم تنفيذ مرتجع بقيمة ${money(total)}`);
  }

  function patchAccounts() {
    const original = window.renderAccounts;
    if (typeof original !== 'function' || original.__returnsPatched) return;
    const wrapped = function(...args){ original.apply(this,args); ensureAccountsPanel(); renderSalesTable(); };
    wrapped.__returnsPatched=true;
    window.renderAccounts=wrapped;
  }

  window.openReturnModal=openReturnModal;
  window.processReturn=processReturn;
  window.renderSalesReturns=renderSalesTable;
  window.__fiveStarsReturnsLoaded=true;

  const start=()=>{ patchAccounts(); ensureAccountsPanel(); renderSalesTable(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
  setTimeout(start,100);
})();
