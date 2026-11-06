/** Shared validation for service creation and partial updates. */
export function serviceInputError(input: Record<string, unknown>, partial = false): string | null {
  if (!partial || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 200) return 'Enter a service name of 1–200 characters.';
  }
  if (input.basePrice !== undefined && (input.basePrice === '' || !Number.isFinite(Number(input.basePrice)) || Number(input.basePrice) < 0)) return 'Price must be a number of 0 or more.';
  if (input.duration !== undefined && (!Number.isInteger(Number(input.duration)) || Number(input.duration) < 1 || Number(input.duration) > 1440)) return 'Duration must be between 1 and 1,440 whole minutes.';
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return 'Service visibility must be true or false.';
  return null;
}
