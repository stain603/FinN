export function mapSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Erro inesperado. Tente novamente.';
  }

  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : '';

  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }

  if (message.includes('JWT') || message.includes('not authenticated')) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (message.includes('duplicate key')) {
    return 'Este registro já existe.';
  }

  return message || 'Erro inesperado. Tente novamente.';
}
