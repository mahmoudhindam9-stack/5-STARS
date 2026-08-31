/* Five Stars — Offline-first bidirectional sync v2 */
(() => {
  'use strict';
  const URL = 'https://pndoaxhtqzoangffyijx.supabase.co';
  const KEY = 'sb_publishable_tjcD65pFVq7AqP3WunTZFA_IpslAJz2';
  const TABLE = 'fs_sync_events';
  const DEVICE = 'fs_sync_device_id_v2';
  const CURSOR = 'fs_sync_cursor_v2';
  const SNAP = 'fs_sync_snapshot_v3';
  const QUEUE = 'fs_sync_queue_v3';
  const BOOTSTRAPPED = 'fs_sync_bootstrapped_v2';
  const INTERVAL = 4000;
  const STORES = {
    fs_products:['product',true,'id'], fs_customers:['customer',true,'id'], fs_suppliers:['supplier',true,'id'],
    fs_sales:['sale',true,'id'], fs_expenses:['expense',true,'id'], fs_users:['user',true,'id'],
    fs_held_carts:['held_cart',true,'id'], fs_movements:['movement',true,'id'], fs_receipts:['receipt',true,'id'],
    fs_categories:['categories',false,null], fs_settings:['settings',false,null], fs_active_shift:['active_shift',false,null],
    fs_shift_history:['shift_history',true,'id']
  };
  let db=null, busy=false, initialized=false;
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null') ?? d}catch{return d}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const deviceId=()=>{let v=localStorage.getItem(DEVICE);if(!v){v=crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;localStorage.setItem(DEVICE,v)}return v};
  const status=(a,b='')=>{let e=document.getElementById('syncStatus');if(!e){e=document.createElement('div');e.id='syncStatus';e.dir='rtl';e.style.cssText='position:fixed;left:14px;bottom:14px;z-index:99999;font:600 12px Cairo,Arial,sans-serif;background:#0f172a;color:#fff;padding:8px 12px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.18);pointer-events:none';document.body.appendChild(e)}e.textContent=b?`${a} • ${b}`:a};
  const records=(k,m)=>{const raw=load(k,m[1]?[]:null);if(!m[1])return {singleton:JSON.stringify(raw)};const o={};(Array.isArray(raw)?raw:[]).forEach((r,i)=>o[String(r?.[m[2]]??`idx-${i}`)]=JSON.stringify(r));return o};
  const snapshot=()=>{const s={};for(const [k,m] of Object.entries(STORES))s[k]=records(k,m);return s};
  const entityKey=e=>Object.entries(STORES).find(([,m])=>m[0]===e)?.[0];
  let snap=load(SNAP,{}), queue=load(QUEUE,[]), cursor=Number(localStorage.getItem(CURSOR)||0)||0;

  function queueDiff(force=false){const cur=snapshot();for(const [k,m] of Object.entries(STORES)){const p=snap[k]||{}, c=cur[k]||{};for(const [id,txt] of Object.entries(c))if(force||p[id]!==txt)queue.push({op_id:`${deviceId()}:${Date.now()}:${Math.random().toString(36).slice(2)}`,device_id:deviceId(),entity:m[0],entity_id:id,operation:'upsert',payload:JSON.parse(txt),client_ts:new Date().toISOString()});for(const id of Object.keys(p))if(!(id in c))queue.push({op_id:`${deviceId()}:${Date.now()}:${Math.random().toString(36).slice(2)}`,device_id:deviceId(),entity:m[0],entity_id:id,operation:'delete',payload:null,client_ts:new Date().toISOString()})}snap=cur;save(SNAP,snap);save(QUEUE,queue)}
  function apply(ev){const k=entityKey(ev.entity);if(!k)return;const m=STORES[k];if(!m[1]){if(ev.operation==='delete')localStorage.removeItem(k);else save(k,ev.payload);return}const arr=load(k,[]);const a=Array.isArray(arr)?arr.slice():[];const i=a.findIndex(x=>String(x?.[m[2]])===String(ev.entity_id));if(ev.operation==='delete'){if(i>=0)a.splice(i,1)}else if(i>=0)a[i]=ev.payload;else a.unshift(ev.payload);save(k,a)}
  async function pull(){if(!db||!navigator.onLine)return 0;const {data,error}=await db.from(TABLE).select('op_id,device_id,entity,entity_id,operation,payload,client_ts,server_ts').gt('server_ts',new Date(cursor||0).toISOString()).order('server_ts',{ascending:true}).limit(1000);if(error)throw error;if(!data?.length)return 0;let applied=0;for(const ev of data){if(ev.device_id!==deviceId()){apply(ev);applied++}const t=Date.parse(ev.server_ts);if(Number.isFinite(t))cursor=Math.max(cursor,t+1)}localStorage.setItem(CURSOR,String(cursor));snap=snapshot();save(SNAP,snap);if(applied&&typeof window.renderAll==='function')window.renderAll();return data.length}
  async function push(){if(!db||!navigator.onLine||!queue.length)return 0;const batch=queue.slice(0,100);const {error}=await db.from(TABLE).upsert(batch,{onConflict:'op_id'});if(error)throw error;queue.splice(0,batch.length);save(QUEUE,queue);return batch.length}
  async function run(){if(busy||!db||!navigator.onLine)return;if(!initialized){initialized=true;const pulled=await pull();if(!pulled && !localStorage.getItem(BOOTSTRAPPED)){snap={};save(SNAP,snap);queueDiff(true);localStorage.setItem(BOOTSTRAPPED,'1')}}else queueDiff();status('جاري المزامنة',queue.length?`${queue.length} معلقة`:'');await push();await pull();status('متزامن','تحديث تلقائي');}
  async function init(){if(!window.supabase?.createClient){status('المزامنة غير متاحة','تعذر تحميل خدمة البيانات');return}db=window.supabase.createClient(URL,KEY,{auth:{persistSession:false}});window.FiveStarsSync={syncNow:run,status:()=>({online:navigator.onLine,queued:queue.length,cursor,deviceId:deviceId()})};window.addEventListener('online',()=>{status('تم الاتصال','المزامنة تبدأ تلقائيًا');run().catch(console.warn)});window.addEventListener('offline',()=>status('بدون إنترنت','كل العمل محفوظ محليًا'));status(navigator.onLine?'اتصال بالإنترنت':'بدون إنترنت');try{await run()}catch(e){console.warn('[Five Stars Sync]',e);status('المزامنة مؤجلة','ستتم المحاولة تلقائيًا')}setInterval(()=>run().catch(e=>console.warn('[Five Stars Sync]',e)),INTERVAL)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
