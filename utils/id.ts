
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts or older browsers
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
