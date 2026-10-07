/** Empty string is an anonymous counter customer, not an invented phone number. */
export function counterCustomerPhone(value: unknown): string {
  if (value == null || value === '' || (typeof value === 'string' && value.trim().toLowerCase() === 'walk-in')) return '';
  if (typeof value !== 'string' || /[a-z]/i.test(value)) throw new Error('Invalid customer phone');
  const phone = value.replace(/\D/g, '');
  if (phone.length < 7 || phone.length > 15) throw new Error('Invalid customer phone');
  return phone;
}
