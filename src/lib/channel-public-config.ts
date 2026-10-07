// Channel preferences are public to the merchant; provider secrets are not.
const secretKey = /token|secret|password|credential|authorization|api.?key|private.?key/i;
export function publicChannelConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(clean);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).filter(([key]) => !secretKey.test(key)).map(([key, child]) => [key, clean(child)]));
    return item;
  };
  return clean(value) as Record<string, unknown>;
}
