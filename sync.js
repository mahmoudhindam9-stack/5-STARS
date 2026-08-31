/* Five Stars — Offline First / Bidirectional Sync
 * Keeps the existing localStorage-based POS working offline, then syncs
 * record-level changes automatically to Supabase when connectivity returns.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://pndoaxhtqzoangffyijx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_tjcD65pFVq7AqP3WunTZFA_IpslAJz2';
  const EVENTS_TABLE = 'fs_sync_events';
  const DEVICE_KEY = 'fs_sync_device_id';
  const CURSOR_KEY = 'fs_sync_cursor';
  const SNAPSHOT_KEY = 'fs_sync_snapshot_v2';
  const QUEUE_KEY = 'fs_sync_queue_v2';
  const META_KEY = 'fs_sync_initialized_v2';
  const POLL_MS = 4000;

  const STORES = {
    fs_products: { entity: 'product', array: true, id: 'id' },
    fs_customers: { entity: 'customer', array: true, id: 'id' },
    fs_suppliers: { entity: 'supplier', array: true, id: 'id' },
    fs_sales: { entity: 'sale', array: true, id: 'id' },
    fs_expenses: { entity: 'expense', array: true, id: 'id' },
    fs_users: { entity: 'user', array: true, id: 'id' },
    fs_held_carts: { entity: 'held_cart', array: true, id: 'id' },
    fs_movements: { entity: 'movement', array: true, id: 'id' },
    fs_receipts: { entity: 'receipt', array: true, id: 'id' },
    fs_categories: { entity: 'categories', array: false },
    fs_settings: { entity: 'settings', array: false },
    fs_active_shift: { entity: 'active_shift', array: false },
    fs_shift_history: { entity: 'shift_history', array: true, id: 'id' }
  };

  let supabase = null;
  let timer = null;
  let syncing = false;
  let applyingRemote = false;
  let initialized = false;
  const state = {
    snapshot: loadJson(SNAPSHOT_KEY, {}),
    queue: loadJson(QUEUE_KEY, []),
    cursor: Number(localStorage.getItem(CURSOR_KEY) || 0) || 0
  };

  function loadJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return v ?? fallback;
    } catch { return fallback; }
  }
  function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function stableJson(v) {
    try { return JSON.stringify(v); } catch { return ''; }
  }
  function deviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }
  function nowIso() { return new Date().toISOString(); }

  function readStore(key, def) { return loadJson(key, def); }
  function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function recordId(meta, record, index = 0) {
    const raw = meta.id ? record?.[meta.id] : null;
    return String(raw ?? `singleton-${index}`);
  }

  function currentRecords(key, meta) {
    const raw = readStore(key, meta.array ? [] : null);
    if (!meta.array) return [{ id: 'singleton', value: raw }];
    return (Array.isArray(raw) ? raw : []).map((value, index) => ({ id: recordId(meta, value, index), value }));
  }

  function desiredSnapshot() {
    const out = {};
    for (const [key, meta] of Object.entries(STORES)) {
      const rows = currentRecords(key, meta);
      out[key] = {};
      rows.forEach(r => { out[key][r.id] = stableJson(r.value); });
    }
    return out;
  }

  function updateStatus(label, detail = '') {
    let root = document.getElementById('syncStatus');
    if (!root) {
      root = document.createElement('div');
      root.id = 'syncStatus';
      root.dir = 'rtl';
      root.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:99999;font:600 12px/1.35 Cairo,Arial,sans-serif;background:#0f172a;color:#fff;padding:8px 12px;border-radius:999px;box-shadow:0 8px 24px rgba(15,23,42,.18);transition:opacity .2s;max-width:280px;pointer-events:none;';
      document.body.appendChild(root);
    }
    root.textContent = detail ? `${label} • ${detail}` : label;
    root.style.opacity = '1';
    clearTimeout(root.__hide);
    if (label === 'متزامن') root.__hide = setTimeout(() => { root.style.opacity = '.72'; }, 2400);
  }

  function enqueueEvent(entity, entityId, operation, payload, clientTs = nowIso()) {
    const ev = {
      op_id: `${deviceId()}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,8)}`,
      device_id: deviceId(),
      entity,
      entity_id: String(entityId),
      operation,
      payload,
      client_ts: clientTs
    };
    state.queue.push(ev);
    if (state.queue.length > 5000) state.queue.splice(0, state.queue.length - 5000);
    saveJson(QUEUE_KEY, state.queue);
  }

  function diffLocalChanges() {
    if (applyingRemote) return 0;
    const current = desiredSnapshot();
    let changed = 0;
    const now = nowIso();

    for (const [key, meta] of Object.entries(STORES)) {
      const prev = state.snapshot[key] || {};
      const cur = current[key] || {};
      for (const [id, serialized] of Object.entries(cur)) {
        if (prev[id] !== serialized) {
          const parsed = JSON.parse(serialized);
          enqueueEvent(meta.entity, id, 'upsert', parsed, now);
          changed++;
        }
      }
      for (const id of Object.keys(prev)) {
        if (!(id in cur)) {
          enqueueEvent(meta.entity, id, 'delete', null, now);
          changed++;
        }
      }
    }
    state.snapshot = current;
    saveJson(SNAPSHOT_KEY, state.snapshot);
    return changed;
  }

  function entityMeta(entity) {
    return Object.entries(STORES).find(([, meta]) => meta.entity === entity)?.[0] || null;
  }

  function applyEvent(ev) {
    const key = entityMeta(ev.entity);
    if (!key) return;
    const meta = STORES[key];
    applyingRemote = true;
    try {
      if (!meta.array) {
        if (ev.operation === 'delete') localStorage.removeItem(key);
        else writeStore(key, ev.payload);
      } else {
        const arr = readStore(key, []);
        const list = Array.isArray(arr) ? arr.slice() : [];
        const idx = list.findIndex(x => String(x?.[meta.id]) === String(ev.entity_id));
        if (ev.operation === 'delete') {
          if (idx >= 0) list.splice(idx, 1);
        } else if (idx >= 0) {
          list[idx] = ev.payload;
        } else {
          list.unshift(ev.payload);
        }
        writeStore(key, list);
      }
    } finally {
      applyingRemote = false;
    }
  }

  async function pullRemote() {
    if (!supabase || !navigator.onLine) return 0;
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('op_id,device_id,entity,entity_id,operation,payload,client_ts,server_ts')
      .gt('server_ts', new Date(Math.max(0, state.cursor)).toISOString())
      .order('server_ts', { ascending: true })
      .limit(1000);
    if (error) throw error;
    if (!Array.isArray(data) || !data.length) return 0;

    let applied = 0;
    for (const ev of data) {
      const ts = Date.parse(ev.server_ts);
      if (ev.device_id !== deviceId()) {
        applyEvent(ev);
        applied++;
      }
      if (Number.isFinite(ts)) state.cursor = Math.max(state.cursor, ts + 1);
    }
    localStorage.setItem(CURSOR_KEY, String(state.cursor));
    state.snapshot = desiredSnapshot();
    saveJson(SNAPSHOT_KEY, state.snapshot);
    if (applied && typeof window.renderAll === 'function') window.renderAll();
    return data.length;
  }

  async function pushQueue() {
    if (!supabase || !navigator.onLine || !state.queue.length) return 0;
    const batch = state.queue.slice(0, 100);
    const { error } = await supabase.from(EVENTS_TABLE).upsert(batch, { onConflict: 'op_id' });
    if (error) throw error;
    state.queue.splice(0, batch.length);
    saveJson(QUEUE_KEY, state.queue);
    return batch.length;
  }

  async function syncNow(reason = 'auto') {
    if (syncing || !supabase || !navigator.onLine) {
      if (!navigator.onLine) updateStatus('بدون إنترنت', 'العمل المحلي مستمر');
      return;
    }
    syncing = true;
    try {
      diffLocalChanges();
      updateStatus('جاري المزامنة', state.queue.length ? `${state.queue.length} عملية` : '');
      await pullRemote();
      await pushQueue();
      await pullRemote();
      initialized = true;
      localStorage.setItem(META_KEY, '1');
      updateStatus('متزامن', 'آخر تحديث الآن');
    } catch (err) {
      console.warn('[Five Stars Sync]', err);
      updateStatus('تعذر المزامنة', 'سيتم المحاولة تلقائيًا');
    } finally {
      syncing = false;
    }
  }

  async function init() {
    if (!window.supabase?.createClient) {
      updateStatus('المزامنة غير مفعلة', 'تعذر تحميل Supabase');
      return;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });

    window.FiveStarsSync = {
      syncNow: () => syncNow('manual'),
      status: () => ({ online: navigator.onLine, queued: state.queue.length, cursor: state.cursor, deviceId: deviceId() })
    };

    window.addEventListener('online', () => {
      updateStatus('تم الاتصال', 'بدء المزامنة تلقائيًا');
      syncNow('online');
    });
    window.addEventListener('offline', () => updateStatus('بدون إنترنت', 'العمل المحلي مستمر'));

    updateStatus(navigator.onLine ? 'بدء المزامنة' : 'بدون إنترنت', navigator.onLine ? 'فحص البيانات' : 'العمل المحلي مستمر');
    await syncNow('startup');
    clearInterval(timer);
    timer = setInterval(() => syncNow('interval'), POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
