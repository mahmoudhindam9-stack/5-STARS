(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const money = n => `${(+n || 0).toFixed(2)} ${typeof cfg === 'function' ? (cfg().currency || 'ج') : 'ج'}`;
  const read = (k,d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };

  const RETURN_KEY = 'fs_returns';
  let returns = read(RETURN_KEY, []);
  let selectedReturnSaleId = null;
  let imageDraft = '';
  let cameraStream = null;
  let cameraTimer = null;
  let cameraMode = 'pos';

  const sid = sale => String(sale?.id ?? '');
  const customerLabel = id => typeof customerName === 'function' ? customerName(id) : ((customers || []).find(c => String(c.id) === String(id))?.name || 'عميل نقدي');
  const saveReturns = () => localStorage.setItem(RETURN_KEY, JSON.stringify(returns));
  const returnedQty = (saleId, productId) => returns.filter(r => sid(r.saleId) === String(saleId)).reduce((n,r) => n + (+r.items.find(i => String(i.productId) === String(productId))?.qty || 0), 0);

  function ensureReturnPanel() {
    const accounts = $('accounts');
    if (!accounts || $('salesReturnsPanel')) return;
    accounts.insertAdjacentHTML('beforeend', `
      <div id="salesReturnsPanel" class="panel" style="margin-top:18px">
        <div class="toolbar" style="justify-content:space-between">
          <div><h3>طلبات المبيعات والمرتجعات</h3><div class="muted">راجع الفواتير ونفّذ مرتجعًا كاملًا أو جزئيًا.</div></div>
          <input id="returnsSearch" class="input" style="max-width:300px" placeholder="بحث برقم الفاتورة أو العميل...">
        </div>
        <div class="table-wrap"><table class="table"><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الدفع</th><th>الإجمالي</th><th>المرتجع</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="salesReturnsTable"></tbody></table></div>
      </div>`);
    $('returnsSearch').addEventListener('input', renderReturnTable);
  }

  function renderReturnTable() {
    const tbody = $('salesReturnsTable');
    if (!tbody) return;
    const q = ($('returnsSearch')?.value || '').trim().toLowerCase();
    const list = (sales || []).filter(s => `${s.invoiceNo || s.id} ${customerLabel(s.customer)}`.toLowerCase().includes(q));
    tbody.innerHTML = list.map(s => {
      const amount = returns.filter(r => sid(r.saleId) === sid(s)).reduce((n,r) => n + (+r.total || 0), 0);
      const full = (s.items || []).length > 0 && (s.items || []).every(i => returnedQty(s.id, i.id) >= (+i.qty || 0));
      const status = full ? 'مرتجع بالكامل' : amount > 0 ? 'مرتجع جزئي' : 'سليمة';
      return `<tr><td><b>${esc(s.invoiceNo || s.id)}</b></td><td>${esc(String(s.date || ''))}</td><td>${esc(customerLabel(s.customer))}</td><td>${esc(s.payment || 'نقدي')}</td><td>${money(s.total)}</td><td>${money(amount)}</td><td>${status}</td><td><button class="btn secondary" ${full ? 'disabled' : ''} onclick="openReturnModal('${esc(s.id)}')">${full ? 'تم الاسترجاع' : 'مرتجع'}</button></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">لا توجد فواتير مبيعات</td></tr>';
  }

  function openReturnModal(id) {
    if (typeof requireRole === 'function' && !requireRole(['مدير','حسابات'])) return;
    const sale = (sales || []).find(s => sid(s) === String(id));
    if (!sale) return;
    selectedReturnSaleId = sale.id;
    const html = `<div class="panel" style="box-shadow:none;padding:0"><p><b>الفاتورة:</b> ${esc(sale.invoiceNo || sale.id)} — <b>العميل:</b> ${esc(customerLabel(sale.customer))}</p><div class="table-wrap"><table class="table"><thead><tr><th>الصنف</th><th>المباع</th><th>تم رده</th><th>المتاح</th><th>السعر</th><th>المرتجع</th></tr></thead><tbody>${(sale.items || []).map(i => { const done=returnedQty(sale.id,i.id); const available=Math.max(0,(+i.qty||0)-done); return `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${done}</td><td>${available}</td><td>${money(i.sell)}</td><td><input class="input return-qty" data-pid="${esc(i.id)}" data-price="${+i.sell||0}" data-cost="${+i.buy||0}" data-max="${available}" type="number" min="0" max="${available}" value="0" style="width:90px" ${available===0?'disabled':''}></td></tr>`; }).join('')}</tbody></table></div><div class="actions"><button class="btn primary" onclick="processReturn('${esc(sale.id)}')">تنفيذ المرتجع</button><button class="btn secondary" onclick="closeModal()">إلغاء</button></div><p class="muted">المرتجع يعيد الكميات للمخزن ويعكس قيمة البيع والربح، ويخفض مديونية العميل إذا كانت الفاتورة آجلة.</p></div>`;
    if (typeof openModal === 'function') openModal('مرتجع مبيعات', html); else { const root=$('modalRoot'); if(root){ root.innerHTML=`<div class="modal-backdrop"><div class="modal">${html}</div></div>`; } }
  }

  function processReturn(id) {
    if (typeof requireRole === 'function' && !requireRole(['مدير','حسابات'])) return;
    const sale = (sales || []).find(s => sid(s) === String(id));
    if (!sale) return;
    const inputs = [...document.querySelectorAll('.return-qty')];
    const items = inputs.map(input => ({ productId:input.dataset.pid, qty:Math.min(Math.max(0,+input.value||0),+input.dataset.max||0), sell:+input.dataset.price||0, buy:+input.dataset.cost||0 })).filter(x=>x.qty>0);
    if (!items.length) return toast('أدخل كمية مرتجع واحدة على الأقل');
    const subtotal = items.reduce((n,i)=>n+i.sell*i.qty,0);
    const originalSubtotal = +sale.subtotal || +sale.total || 0;
    const total = originalSubtotal > 0 ? subtotal * ((+sale.total || 0) / originalSubtotal) : subtotal;
    const cost = items.reduce((n,i)=>n+i.buy*i.qty,0);
    for (const item of items) {
      const p=(products||[]).find(p=>String(p.id)===String(item.productId));
      if(!p) return toast('أحد الأصناف غير موجود بالمخزن');
    }
    const returnId=Date.now();
    for (const item of items) {
      const p=products.find(p=>String(p.id)===String(item.productId));
      const before=+p.qty||0; p.qty=before+item.qty;
      if(typeof logMovement==='function') logMovement(p.id,p.name,item.qty,'استرجاع',`مرتجع ${sale.invoiceNo||sale.id}`);
      if(typeof recordMovement==='function') recordMovement(p.id,before,p.qty,'مرتجع',returnId);
    }
    returns.unshift({id:returnId,saleId:sale.id,invoiceNo:sale.invoiceNo||sale.id,date:new Date().toISOString(),userId:(typeof currentSession==='function' ? currentSession()?.id : null),customer:sale.customer||'',payment:sale.payment||'نقدي',subtotal,total,cost,items});
    if(sale.payment==='آجل'&&sale.customer){ const c=customers.find(c=>String(c.id)===String(sale.customer)); if(c)c.balance=Math.max(0,(+c.balance||0)-total); }
    if(typeof saveAll==='function') saveAll();
    else if(typeof save==='function') save();
    saveReturns();
    if(typeof closeModal==='function') closeModal();
    if(typeof renderAll==='function') renderAll();
    renderReturnTable();
    toast(`تم تنفيذ المرتجع بقيمة ${money(total)}`);
  }

  function injectCartBird() {
    const h = document.querySelector('.cart-panel .toolbar h3');
    if (!h || h.dataset.birdReady) return;
    h.dataset.birdReady = '1';
    h.innerHTML = `<span class="bird-cart-icon" aria-hidden="true"><svg viewBox="0 0 48 48" width="30" height="30"><path fill="currentColor" d="M10 25c7 0 10-5 14-10 3-4 7-6 12-5-1 3-3 5-6 6 6 1 10 5 10 11 0 4-2 8-6 10-2 1-4 1-6 1 2-2 3-4 3-6-5 5-10 7-16 5-5-2-8-6-9-12 1 0 2 0 4 0zM36 12l5-4-1 6-4-2z"/></svg></span> السلة`;
    h.style.display='flex'; h.style.alignItems='center'; h.style.gap='8px';
  }

  function setupProductImageUI() {
    if (!$('pName') || $('productImageInput')) return;
    const anchor = $('pName').closest('.form');
    if (!anchor) return;
    const wrap = document.createElement('div');
    wrap.className = 'wide product-image-field';
    wrap.innerHTML = `<label style="display:grid;gap:7px;font-weight:800">صورة المنتج <span class="muted">اختياري</span><input id="productImageInput" type="file" accept="image/*" class="input" style="padding:9px"></label><div id="productImagePreview" style="margin-top:8px"></div>`;
    anchor.insertBefore(wrap, anchor.lastElementChild);
    $('productImageInput').addEventListener('change', async e => {
      const file=e.target.files?.[0]; if(!file) return;
      if(!file.type.startsWith('image/')) return toast('اختر ملف صورة صالحًا');
      imageDraft = await compressImage(file);
      renderImagePreview(imageDraft);
    });
    renderImagePreview('');
  }

  function compressImage(file) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=700; const scale=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale)); c.getContext('2d').drawImage(img,0,0,c.width,c.height); resolve(c.toDataURL('image/jpeg',0.78)); }; img.onerror=reject; img.src=reader.result; };
      reader.onerror=reject; reader.readAsDataURL(file);
    });
  }

  function renderImagePreview(src) {
    const root=$('productImagePreview'); if(!root) return;
    root.innerHTML = src ? `<div style="display:flex;align-items:center;gap:12px"><img src="${src}" alt="صورة المنتج" style="width:82px;height:82px;object-fit:cover;border-radius:14px;border:1px solid #e2e8f0"><button class="btn secondary" type="button" onclick="clearProductImage()">إزالة الصورة</button></div>` : '<div class="muted">لم يتم اختيار صورة</div>';
  }
  window.clearProductImage = () => { imageDraft=''; if($('productImageInput')) $('productImageInput').value=''; renderImagePreview(''); };

  function patchProductSaveEdit() {
    if (window.__fiveStarsProductPatched) return;
    const originalEdit = window.editProduct;
    const originalSave = window.saveProduct;
    window.editProduct = function(id) {
      if (typeof originalEdit === 'function') originalEdit(id);
      setTimeout(()=>{
        const p=(products||[]).find(x=>String(x.id)===String(id));
        imageDraft=p?.image||''; renderImagePreview(imageDraft);
      },30);
    };
    window.saveProduct = function() {
      const editingId=$('pId')?.value || '';
      if (typeof originalSave === 'function') originalSave();
      setTimeout(()=>{
        const barcode=$('pBarcode')?.value?.trim();
        let p=editingId ? (products||[]).find(x=>String(x.id)===String(editingId)) : (products||[]).find(x=>String(x.barcode)===String(barcode));
        if (!p && $('pName')?.value?.trim()) p=(products||[]).slice(-1)[0];
        if (p) { p.image=imageDraft||p.image||''; if(typeof saveAll==='function') saveAll(); else if(typeof save==='function') save(); renderProducts(); }
        imageDraft='';
      },40);
    };
    window.__fiveStarsProductPatched=true;
  }

  function productImage(p) {
    return p?.image ? `<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" style="width:100%;height:88px;object-fit:cover;border-radius:12px;margin-bottom:8px;border:1px solid #e5e7eb">` : `<div style="height:88px;border-radius:12px;background:#f8fafc;display:grid;place-items:center;margin-bottom:8px;color:#94a3b8;font-size:28px">⚡</div>`;
  }
  function patchProductRendering() {
    const originalRenderProducts=window.renderProducts;
    window.renderProducts=function(){
      const root=$('products'); if(!root) return;
      const q=($('posSearch')?.value||'').trim().toLowerCase();
      const list=(products||[]).filter(p=>(`${p.name||''} ${p.barcode||''} ${p.cat||''}`).toLowerCase().includes(q));
      root.innerHTML=list.map(p=>`<button class="product" onclick="addCart('${esc(p.id)}')">${productImage(p)}<b>${esc(p.name)}</b><div class="muted">${esc(p.cat||'عام')} • ${esc(p.barcode||'')}</div><div class="price">${(+p.sell||0).toFixed(2)} ج</div><div class="muted">المتاح: ${+p.qty||0} ${esc(p.unit||'قطعة')}</div></button>`).join('') || '<div class="empty">لا توجد أصناف</div>';
      if(typeof originalRenderProducts==='function' && !(products||[]).length) originalRenderProducts();
    };
  }

  function setupCustomerSearch() {
    if ($('posCustomerSearch')) return;
    const select=$('customerSelect');
    if(!select) return;
    const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gap='7px'; wrap.className='wide';
    wrap.innerHTML=`<input id="posCustomerSearch" class="input" placeholder="ابحث عن العميل بالاسم أو رقم التليفون..."><select id="customerSelectEnhanced" class="input"><option value="">عميل نقدي</option></select>`;
    select.parentNode.insertBefore(wrap,select); select.remove();
    const enhanced=$('customerSelectEnhanced');
    Object.defineProperty(window,'__customerSelectEnhanced',{value:enhanced,writable:true});
    const render=()=>{
      const q=($('posCustomerSearch').value||'').trim().toLowerCase();
      enhanced.innerHTML='<option value="">عميل نقدي</option>'+(customers||[]).filter(c=>(`${c.name||''} ${c.phone||''}`).toLowerCase().includes(q)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.phone||'بدون هاتف')}</option>`).join('');
    };
    $('posCustomerSearch').addEventListener('input',render);
    render();
    Object.defineProperty(document,'__fiveStarsCustomerSearch',{value:render,configurable:true});
    // Keep checkout/other existing code using the original id by mirroring the enhanced select.
    enhanced.id='customerSelect';
    window.__customerSelectEnhanced=enhanced;
  }

  function setupCustomersPageSearch() {
    const input=$('custSearch'); if(!input || input.dataset.bound) return;
    input.dataset.bound='1'; input.addEventListener('input',()=>renderCustomerTable());
  }
  function renderCustomerTable() {
    const tbody=$('custTable'); if(!tbody) return;
    const q=($('custSearch')?.value||'').trim().toLowerCase();
    const list=(customers||[]).filter(c=>(`${c.name||''} ${c.phone||''}`).toLowerCase().includes(q));
    tbody.innerHTML=list.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||'-')}</td><td><b class="${(+c.balance||0)>0?'danger':''}">${(+c.balance||0).toFixed(2)}</b></td><td><div class="actions"><button class="btn secondary" style="padding:6px 9px;font-size:12px" onclick="showStatement('${esc(c.id)}')">كشف حساب</button><button class="btn danger" style="padding:6px 9px;font-size:12px" onclick="delCustomer('${esc(c.id)}')">×</button></div></td></tr>`).join('')||'<tr><td colspan="4" class="empty">لا يوجد عملاء مطابقون</td></tr>';
  }
  function patchCustomerRendering() {
    if(window.__fiveStarsCustomerPatched) return;
    const original=window.renderCustomers;
    window.renderCustomers=function(){ if(typeof original==='function') original(); setTimeout(()=>{ setupCustomerSearch(); renderCustomerTable(); setupCustomerSearch(); },20); };
    window.__fiveStarsCustomerPatched=true;
  }

  function ensureCameraUI() {
    if($('cameraModal')) return;
    document.body.insertAdjacentHTML('beforeend',`<div id="cameraModal" class="camera-modal hidden"><div class="camera-box"><div class="toolbar"><div><h3 style="margin:0">مسح الباركود بالكاميرا</h3><div class="muted">سيطلب المتصفح صلاحية استخدام الكاميرا عند بدء المسح.</div></div><button class="btn secondary" onclick="stopCamera()">إغلاق</button></div><video id="scannerVideo" autoplay muted playsinline></video><div class="scanner-line"></div><p id="cameraStatus" class="muted">وجّه الكاميرا إلى الباركود.</p></div></div>`);
  }
  window.startCamera = async function(mode='pos') {
    cameraMode=mode; ensureCameraUI();
    const modal=$('cameraModal'); const video=$('scannerVideo'); const status=$('cameraStatus');
    if(!navigator.mediaDevices?.getUserMedia) { status.textContent='هذا المتصفح لا يدعم استخدام الكاميرا من الموقع.'; modal.classList.remove('hidden'); return; }
    try {
      stopCamera(false);
      // This call intentionally triggers the browser's camera permission prompt on first use.
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=cameraStream;
      modal.classList.remove('hidden');
      status.textContent='تم تفعيل الكاميرا. وجّهها إلى الباركود.';
      if('BarcodeDetector' in window) {
        try { cameraDetector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e','itf']}); }
        catch { cameraDetector=new BarcodeDetector(); }
        cameraTimer=setInterval(async()=>{
          if(video.readyState<2) return;
          try {
            const codes=await cameraDetector.detect(video);
            if(codes?.length) { const value=codes[0].rawValue; stopCamera(); if(cameraMode==='pos'){ if(typeof scan==='function') scan(value,'pos'); else { const p=(products||[]).find(x=>x.barcode===value); if(p&&typeof addCart==='function')addCart(p.id); } } else { if($('pBarcode')) $('pBarcode').value=value; toast('تم التقاط الباركود ويمكن حفظ الصنف'); } }
          } catch(e) { /* camera detector can fail transiently */ }
        },220);
      } else {
        status.textContent='الكاميرا تعمل، لكن فك الباركود بالكاميرا غير مدعوم في هذا المتصفح. استخدم قارئ USB/Bluetooth أو متصفحًا يدعم BarcodeDetector.';
      }
    } catch(err) {
      modal.classList.remove('hidden');
      status.textContent = err?.name==='NotAllowedError' ? 'تم رفض صلاحية الكاميرا. اسمح للموقع بالكاميرا من إعدادات المتصفح ثم جرّب مرة أخرى.' : 'تعذر تشغيل الكاميرا. تأكد من وجود كاميرا وعدم استخدامها بواسطة برنامج آخر.';
    }
  };
  window.stopCamera = function(hide=true) {
    if(cameraTimer){clearInterval(cameraTimer);cameraTimer=null;}
    if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
    cameraDetector=null;
    if(hide && $('cameraModal')) $('cameraModal').classList.add('hidden');
  };

  window.printInvoice = function(sale) {
    if(!sale) return;
    const customer=customerLabel(sale.customer);
    const rows=(sale.items||[]).map(i=>`<tr><td>${esc(i.name)}</td><td style="text-align:center">${i.qty}</td><td style="text-align:left">${money((+i.sell||0)*(+i.qty||0))}</td></tr>`).join('');
    const content=`<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#111;max-width:390px;margin:auto"><div style="text-align:center;border-bottom:1px dashed #777;padding-bottom:10px"><h2 style="margin:0">Five Stars</h2><div>الأدوات الكهربائية</div></div><div style="margin:10px 0;font-size:13px"><div>الفاتورة: <b>${esc(sale.invoiceNo||sale.id)}</b></div><div>التاريخ: ${esc(sale.date||'')}</div><div>العميل: ${esc(customer)}</div><div>طريقة الدفع: ${esc(sale.payment||'نقدي')}</div></div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:right">الصنف</th><th>الكمية</th><th style="text-align:left">القيمة</th></tr></thead><tbody>${rows}</tbody></table><div style="border-top:1px dashed #777;margin-top:10px;padding-top:8px"><div style="display:flex;justify-content:space-between"><span>الإجمالي:</span><b>${money(sale.total)}</b></div>${sale.discount?`<div style="display:flex;justify-content:space-between"><span>الخصم:</span><span>${money(sale.discount)}</span></div>`:''}${sale.tax?`<div style="display:flex;justify-content:space-between"><span>الضريبة:</span><span>${money(sale.tax)}</span></div>`:''}</div><div style="text-align:center;margin-top:18px;font-size:12px">شكرًا لزيارتكم</div></div>`;
    let modal=$('invoiceModal'), target=$('invoiceContent');
    if(modal&&target){ target.innerHTML=content; modal.style.display='flex'; setTimeout(()=>window.print(),180); }
    else { const w=window.open('', '_blank', 'width=460,height=700'); if(!w){toast('اسمح بالنوافذ المنبثقة للطباعة');return;} w.document.write(`<html dir="rtl"><head><title>Five Stars - ${esc(sale.invoiceNo||sale.id)}</title><style>body{margin:20px}table{border-collapse:collapse}th,td{padding:5px;border-bottom:1px solid #ddd}@media print{body{margin:8mm}}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`); w.document.close(); }
  };

  window.printReport = function(){
    const rows=(sales||[]).slice(0,100).map(s=>`<tr><td>${esc(s.invoiceNo||s.id)}</td><td>${esc(String(s.date||''))}</td><td>${esc(customerLabel(s.customer))}</td><td>${money(s.total)}</td></tr>`).join('');
    const retTotal=returns.reduce((n,r)=>n+(+r.total||0),0), salesTotal=(sales||[]).reduce((n,s)=>n+(+s.total||0),0), net=salesTotal-retTotal;
    const html=`<div style="direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#111"><h1>تقرير مبيعات Five Stars</h1><p>إجمالي المبيعات: <b>${money(salesTotal)}</b> — إجمالي المرتجعات: <b>${money(retTotal)}</b> — صافي المبيعات: <b>${money(net)}</b></p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:right">الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const w=window.open('', '_blank', 'width=1000,height=800');
    if(!w){toast('اسمح بالنوافذ المنبثقة للطباعة');return;}
    w.document.write(`<html dir="rtl"><head><title>تقرير Five Stars</title><style>body{padding:25px;font-family:Tahoma,Arial,sans-serif}table{border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd}@media print{body{padding:8mm}}</style></head><body>${html}<script>window.onload=()=>window.print()<\/script></body></html>`); w.document.close();
  };

  window.renderSalesReturns=renderReturnTable;
  window.openReturnModal=openReturnModal;
  window.processReturn=processReturn;

  function bindShortcuts(){
    document.addEventListener('keydown',e=>{
      if($('login')&&!$('login').classList.contains('hidden')) return;
      if(e.key==='Escape' && $('cameraModal')&&!$('cameraModal').classList.contains('hidden')){stopCamera();return;}
      if($('pos')&&!$('pos').classList.contains('hidden')){
        if(e.key==='F2'){e.preventDefault(); if(typeof checkout==='function')checkout();}
        if(e.key==='F4'){e.preventDefault(); if(typeof clearCart==='function')clearCart();}
        if(e.key==='F8'){e.preventDefault(); $('posSearch')?.focus();}
      }
    });
  }

  function start(){
    ensureReturnPanel();
    ensureCameraUI();
    injectCartBird();
    setupProductImageUI();
    patchProductSaveEdit();
    patchProductRendering();
    setupCustomerSearch();
    patchCustomerRendering();
    setupCustomersPageSearch();
    bindShortcuts();
    setTimeout(()=>{ setupProductImageUI(); setupCustomerSearch(); setupCustomersPageSearch(); injectCartBird(); renderReturnTable(); if(typeof renderProducts==='function')renderProducts(); },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
  setTimeout(start,250);
})();
