import { AuthError } from '@supabase/supabase-js';

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

function getErrorDetails(error: unknown): AuthErrorLike {
  if (!error || typeof error !== 'object') {
    return {};
  }

  const authError = error as AuthError;
  return {
    message: authError.message?.toLowerCase() ?? '',
    code: authError.code?.toLowerCase() ?? '',
    status: authError.status,
  };
}

export function mapAuthError(error: unknown): string {
  const { message: rawMessage = '', code, status } = getErrorDetails(error);
  const message = rawMessage;

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    message.includes('rate limit')
  ) {
    return 'Muitas tentativas em pouco tempo. Aguarde cerca de 1 hora e tente novamente, ou peça ao administrador para desativar a confirmação de e-mail no painel do Supabase.';
  }

  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already registered')
  ) {
    return 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password')
  ) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  }

  if (
    code === 'user_not_found' ||
    message.includes('user not found')
  ) {
    return 'Não encontramos uma conta com este e-mail. Verifique o endereço ou crie uma conta.';
  }

  if (
    code === 'email_not_confirmed' ||
    message.includes('email not confirmed')
  ) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada e spam.';
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('network error')
  ) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }

  if (code === 'weak_password' || message.includes('password should be')) {
    return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
  }

  if (status === 422 && message.includes('email')) {
    return 'Informe um e-mail válido.';
  }

  if (message.includes('jwt') || message.includes('not authenticated')) {
    return 'Sessão expirada. Faça login novamente.';
  }

  const fallbackMessage =
    error instanceof Error && error.message && !error.message.startsWith('[')
      ? error.message
      : '';

  return fallbackMessage || 'Não foi possível concluir a operação. Tente novamente.';
}

export class AuthFlowError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthFlowError';
  }
}

export const AUTH_ERROR_CODES = {
  ALREADY_REGISTERED: 'already_registered',
  EMAIL_CONFIRMATION_REQUIRED: 'email_confirmation_required',
} as const;
