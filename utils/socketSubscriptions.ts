interface EventSocket {
  on(event: string, listener: (...args: any[]) => void): unknown;
  off(event: string, listener: (...args: any[]) => void): unknown;
}
// Retirer les seuls écouteurs de cette vue, sans couper le bandeau live ou une autre vue.
export function subscribeCourtReadiness(socket: EventSocket, setReady: (courts: number[]) => void) {
  const update = (data: { readyCourts: number[] }) => setReady(data.readyCourts);
  const reset = () => setReady([]);
  socket.on('court_ready_update', update); socket.on('courts_reset', reset);
  return () => { socket.off('court_ready_update', update); socket.off('courts_reset', reset); };
}
