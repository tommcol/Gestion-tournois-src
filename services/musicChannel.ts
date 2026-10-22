let snapshot: any = null;
const listeners = new Set<(data: any) => void>();
let send = (_data: any) => {};
export const setMusicSender = (sender: (data: any) => void) => { send = sender; };
export const sendMusicCommand = (data: any) => send(data);
export const receiveMusicCommand = (data: any) => {
  if (data.command === 'snapshot') snapshot = data;
  for (const listener of listeners) listener(data);
};
export const subscribeMusic = (listener: (data: any) => void) => {
  listeners.add(listener); if (snapshot) listener(snapshot);
  return () => { listeners.delete(listener); };
};
