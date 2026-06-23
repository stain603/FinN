export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : '';
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validatePhone(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

export function normalizePhoneForWhatsApp(telefone: string): string | null {
  const digits = telefone.replace(/\D/g, '');

  if (digits.length < 10) {
    return null;
  }

  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function phoneMatchesSearch(telefone: string, query: string): boolean {
  const normalizedQuery = query.replace(/\D/g, '');
  if (!normalizedQuery) {
    return false;
  }

  return telefone.replace(/\D/g, '').includes(normalizedQuery);
}
