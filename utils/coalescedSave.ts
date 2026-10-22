// Grouper les modifications rapprochées ; flush() force une écriture durable.
export function createCoalescedSave<T>(write: (value: T) => Promise<void>, delay = 250) {
  let latest: T | undefined;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chain: Promise<void> = Promise.resolve();
  let waiters: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  const flush = (): Promise<void> => {
    if (timer) clearTimeout(timer); timer = undefined;
    if (!pending) return chain;
    const value = latest!; pending = false;
    const batch = waiters; waiters = [];
    const task = chain.catch(() => {}).then(() => write(value));
    chain = task;
    task.then(() => batch.forEach(w => w.resolve()), error => batch.forEach(w => w.reject(error)));
    return task;
  };
  return {
    save(value: T, immediate = false): Promise<void> {
      latest = value; pending = true;
      const promise = new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }));
      // Délai maximal depuis la première modification, sans repousser indéfiniment la sauvegarde.
      if (!timer) timer = setTimeout(() => { void flush().catch(() => {}); }, delay);
      if (immediate) void flush().catch(() => {});
      return promise;
    },
    flush,
  };
}
