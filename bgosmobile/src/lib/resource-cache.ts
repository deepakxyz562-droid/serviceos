// One in-memory entry per signed-in session, workspace, profile revision and GET path.
export function createResource<T>() {
  let snapshot = { data: null as T | null, loading: true, error: null as string | null };
  let updated = 0;
  let revision = 0;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  function setData(value: T | null | ((old: T | null) => T | null)) {
    revision++;
    pending = undefined;
    const data = typeof value === 'function' ? (value as (old:T|null)=>T|null)(snapshot.data) : value;
    snapshot = {data, loading:false, error:null};
    updated = Date.now();
    notify();
  }
  return {
    snapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setData,
    idle: () => !listeners.size && !pending,
    read(load: () => Promise<T>, maxAge: number, force = false) {
      // A post-mutation refresh supersedes a GET that started before the write.
      if (pending && force) { revision++; pending = undefined; }
      if (pending) return pending;
      if (updated && !snapshot.error && Date.now()-updated < maxAge) return Promise.resolve();
      const current = revision;
      pending = Promise.resolve().then(load).then(data => {
        if (current !== revision) return;
        snapshot = {data, loading:false, error:null};
        updated = Date.now();
      }, error => {
        if (current === revision) snapshot = {...snapshot, loading:false, error:error instanceof Error ? error.message : 'Could not load data. Please retry.'};
      }).finally(() => {
        if (current === revision) { pending = undefined; notify(); }
      });
      return pending;
    },
  };
}
const entries = new Map<string, ReturnType<typeof createResource<unknown>>>();
export function getResource<T>(key: string) {
  if (!entries.has(key)) {
    if (entries.size >= 100) {
      for (const [old,entry] of entries) if (entry.idle()) { entries.delete(old); if(entries.size < 80) break; }
    }
    entries.set(key, createResource());
  }
  return entries.get(key)! as ReturnType<typeof createResource<T>>;
}
let partition = 0;
const listeners = new Set<() => void>();
export const resourcePartition = () => partition;
export function subscribePartition(listener: () => void) {listeners.add(listener);return () => { listeners.delete(listener); };}
export function invalidateResourceScope() {
  entries.clear(); partition++; listeners.forEach(listener => listener());
}
