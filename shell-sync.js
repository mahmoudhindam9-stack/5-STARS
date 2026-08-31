/* Five Stars — shell sync controller */
(() => {
  'use strict';
  const URL='https://pndoaxhtqzoangffyijx.supabase.co';
  const KEY='sb_publishable_tjcD65pFVq7AqP3WunTZFA_IpslAJz2';
  const TABLE='fs_sync_events', DEVICE='fs_device_v1', CURSOR='fs_cursor_v1', SNAP='fs_snapshot_v1', QUEUE='fs_queue_v1', BOOT='fs_boot_v1';
  const STORES={
    fs_products:['product',true,'id'],fs_customers:['customer',true,'id'],fs_suppliers:['supplier',true,'id'],fs_sales:['sale',true,'id'],
    fs_expenses:['expense',true,'id'],fs_users:['user',true,'id'],fs_held_carts:['held_cart',true,'id'],fs_movements:['movement',true,'id'],
    fs_receipts:['receipt',true,'id'],fs_categories:['categories',false],fs_settings:['settings',false],fs_active_shift:['active_shift',false],fs_shift_history:['shift_history',true,'id']
  };
  let db=null,busy=false,initialized=false,cursor=Number(localStorage.getItem(CURSOR)||0)||0;
  let snap=load(SNAP,{}),queue=load(QUEUE,[]);
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const dev=()=>{let x=localStorage.getItem(DEVICE);if(!x){x=crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;localStorage.setItem(DEVICE,x)}return x};
  const setStatus=t=>window.FiveStarsShell?.setStatus?.(t);
  const rows=(k,m)=>{const raw=load(k,m[1]?[]:null);if(!m[1])return {singleton:JSON.stringify(raw)};const o={};(Array.isArray(raw)?raw:[]).forEach((r,i)=>o[String(r?.[m[2]]??`idx-${i}`)]=JSON.stringify(r));return o};
  const takeSnap=()=>{const s={};for(const [k,m] of Object.entries(STORES))s[k]=rows(k,m);return s};
  const keyForEntity=e=>Object.entries(STORES).find(([,m])=>m[0]===e)?.[0];
  const makeEvent=(entity,id,operation,payload)=>({op_id:`${dev()}:${Date.now()}:${Math.random().toString(36).slice(2)}`,device_id:dev(),entity,entity_id:String(id),operation,payload,client_ts:new Date().toISOString()});
  function collect(force=false){const cur=takeSnap();for(const [k,m] of Object.entries(STORES)){const p=snap[k]||{},c=cur[k]||{};for(const [id,txt] of Object.entries(c))if(force||p[id]!==txt)queue.push(makeEvent(m[0],id,'upsert',JSON.parse(txt)));for(const id of Object.keys(p))if(!(id in c))queue.push(makeEvent(m[0],id,'delete',null))}snap=cur;save(SNAP,snap);save(QUEUE,queue)}
  function apply(ev){const k=keyForEntity(ev.entity);if(!k)return;const m=STORES[k];if(!m[1]){if(ev.operation==='delete')localStorage.removeItem(k);else save(k,ev.payload);return}const arr=load(k,[]),a=Array.isArray(arr)?arr.slice():[],i=a.findIndex(x=>String(x?.[m[2]])===String(ev.entity_id));if(ev.operation==='delete'){if(i>=0)a.splice(i,1)}else if(i>=0)a[i]=ev.payload;else a.unshift(ev.payload);save(k,a)}
  async function pull(){if(!db||!navigator.onLine)return 0;const {data,error}=await db.from(TABLE).select('op_id,device_id,entity,entity_id,operation,payload,client_ts,server_ts').gt('server_ts',new Date(cursor||0).toISOString()).order('server_ts',{ascending:true}).limit(1000);if(error)throw error;if(!data?.length)return 0;let foreign=0;for(const ev of data){if(ev.device_id!==dev()){apply(ev);foreign++}const t=Date.parse(ev.server_ts);if(Number.isFinite(t))cursor=Math.max(cursor,t+1)}localStorage.setItem(CURSOR,String(cursor));snap=takeSnap();save(SNAP,snap);return foreign}
  async function push(){if(!db||!navigator.onLine||!queue.length)return 0;const b=queue.slice(0,100),{error}=await db.from(TABLE).upsert(b,{onConflict:'op_id'});if(error)throw error;queue.splice(0,b.length);save(QUEUE,queue);return b.length}
  async function sync(){if(busy||!db||!navigator.onLine)return;busy=true;try{if(!initialized){initialized=true;const got=await pull();if(!got&&cursor===0&&!localStorage.getItem(BOOT)){snap={};save(SNAP,snap);collect(true);localStorage.setItem(BOOT,'1')}}else collect();setStatus(queue.length?`جاري المزامنة • ${queue.length} عملية`:'جاري التحقق…');await push();const got=await pull();if(got)window.FiveStarsShell?.reloadApp?.();setStatus('متزامن • تلقائي')}catch(e){console.warn('[Five Stars Sync]',e);setStatus(navigator.onLine?'المزامنة مؤجلة • ستعاد تلقائيًا':'بدون إنترنت • العمل محفوظ محليًا')}finally{busy=false}}
  async function init(){if(!window.supabase?.createClient){setStatus('خدمة المزامنة غير محملة');return}db=window.supabase.createClient(URL,KEY,{auth:{persistSession:false}});window.FiveStarsSync={syncNow:sync,status:()=>({online:navigator.onLine,queued:queue.length,deviceId:dev(),cursor})};window.addEventListener('online',()=>{setStatus('تم الاتصال • المزامنة تلقائية');sync()});window.addEventListener('offline',()=>setStatus('بدون إنترنت • العمل المحلي مستمر'));await sync();setInterval(sync,4000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
