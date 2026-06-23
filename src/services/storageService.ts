import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Client, Charge, Loan, Payment } from '../types';
import { migrateClientData } from './financialMetrics';

const MIGRATION_FLAG = '@finbolso_data_migrated_v1';

const LOCAL_STORAGE_KEYS = {
  CLIENTS: '@finbolso_clients',
  CHARGES: '@finbolso_charges',
  LOANS: '@finbolso_loans',
  PAYMENTS: '@finbolso_payments',
  AUTH: '@finbolso_auth',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

async function getUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Usuário não autenticado');
  }

  return user.id;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  return Number(value) || 0;
}

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return new Date(value as string).toISOString();
}

function dueDateKey(value: string): string {
  return toIsoString(value).split('T')[0];
}

function parseCompositeChargeId(
  id: string
): { clienteId: string; dueDate: string } | null {
  const match = id.match(/^(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return { clienteId: match[1], dueDate: match[2] };
}

// ---------------------------------------------------------------------------
// Client mappers
// ---------------------------------------------------------------------------

function clientToRow(client: Client, userId: string) {
  return {
    id: client.id,
    user_id: userId,
    nome: client.nome,
    telefone: client.telefone,
    endereco: client.endereco ?? null,
    observacao: client.observacao ?? null,
    valor_emprestado: client.valorEmprestado,
    valor_total_receber: client.valorTotalReceber,
    valor_parcela: client.valorParcela,
    parcelas_ja_pagas: client.parcelasJaPagas ?? 0,
    frequencia: client.frequencia,
    data_inicio: client.dataInicio,
    data_termino: client.dataTermino,
    proximo_vencimento: client.proximoVencimento,
    lucro_esperado: client.lucroEsperado,
    valor_recebido: client.valorRecebido,
    saldo_devedor: client.saldoDevedor,
    parcelas_totais: client.parcelasTotais,
    parcelas_pagas: client.parcelasPagas,
    parcelas_restantes: client.parcelasRestantes,
    status: client.status,
  };
}

function rowToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    nome: row.nome as string,
    telefone: row.telefone as string,
    endereco: (row.endereco as string) || undefined,
    observacao: (row.observacao as string) || undefined,
    valorEmprestado: toNumber(row.valor_emprestado),
    valorTotalReceber: toNumber(row.valor_total_receber),
    valorParcela: toNumber(row.valor_parcela),
    parcelasJaPagas: toNumber(row.parcelas_ja_pagas),
    frequencia: row.frequencia as Client['frequencia'],
    dataInicio: toIsoString(row.data_inicio),
    dataTermino: toIsoString(row.data_termino),
    proximoVencimento: toIsoString(row.proximo_vencimento),
    lucroEsperado: toNumber(row.lucro_esperado),
    valorRecebido: toNumber(row.valor_recebido),
    saldoDevedor: toNumber(row.saldo_devedor),
    parcelasTotais: toNumber(row.parcelas_totais),
    parcelasPagas: toNumber(row.parcelas_pagas),
    parcelasRestantes: toNumber(row.parcelas_restantes),
    status: row.status as Client['status'],
    historicoPagamentos: [],
  };
}

// ---------------------------------------------------------------------------
// Charge mappers
// ---------------------------------------------------------------------------

function chargeToRow(charge: Charge, userId: string) {
  return {
    id: charge.id,
    user_id: userId,
    cliente_id: charge.clienteId,
    cliente_nome: charge.clienteNome,
    telefone: charge.telefone ?? null,
    valor: charge.valor,
    data_vencimento: charge.dataVencimento,
    data_pagamento: charge.dataPagamento ?? null,
    status: charge.status,
    parcela: charge.parcela ?? null,
    total_parcelas: charge.totalParcelas ?? null,
  };
}

function rowToCharge(row: Record<string, unknown>): Charge {
  return {
    id: row.id as string,
    clienteId: row.cliente_id as string,
    clienteNome: row.cliente_nome as string,
    telefone: (row.telefone as string) || undefined,
    valor: toNumber(row.valor),
    dataVencimento: toIsoString(row.data_vencimento),
    dataPagamento: row.data_pagamento
      ? toIsoString(row.data_pagamento)
      : undefined,
    status: row.status as Charge['status'],
    parcela: row.parcela != null ? toNumber(row.parcela) : undefined,
    totalParcelas:
      row.total_parcelas != null ? toNumber(row.total_parcelas) : undefined,
  };
}

async function resolveChargeId(charge: Charge): Promise<string> {
  if (isValidUuid(charge.id)) {
    return charge.id;
  }

  const existingId = await findChargeIdByClientAndDueDate(
    charge.clienteId,
    charge.dataVencimento
  );

  if (existingId) {
    return existingId;
  }

  const parsed = parseCompositeChargeId(charge.id);
  if (parsed) {
    const parsedExisting = await findChargeIdByClientAndDueDate(
      parsed.clienteId,
      parsed.dueDate
    );
    if (parsedExisting) {
      return parsedExisting;
    }
  }

  return generateId();
}

async function findChargeIdByClientAndDueDate(
  clienteId: string,
  dataVencimento: string
): Promise<string | null> {
  const userId = await getUserId();
  const targetDate = dueDateKey(dataVencimento);

  const { data, error } = await supabase
    .from('charges')
    .select('id, data_vencimento')
    .eq('user_id', userId)
    .eq('cliente_id', clienteId);

  if (error) {
    throw error;
  }

  const match = (data ?? []).find(
    (row) => dueDateKey(row.data_vencimento) === targetDate
  );

  return match?.id ?? null;
}

async function resolveChargeIdForDelete(id: string): Promise<string | null> {
  if (isValidUuid(id)) {
    return id;
  }

  const parsed = parseCompositeChargeId(id);
  if (!parsed) {
    return null;
  }

  return findChargeIdByClientAndDueDate(parsed.clienteId, parsed.dueDate);
}

// ---------------------------------------------------------------------------
// Payment mappers
// ---------------------------------------------------------------------------

function paymentToRow(payment: Payment, userId: string) {
  return {
    id: payment.id,
    user_id: userId,
    charge_id: payment.chargeId,
    cliente_id: payment.clienteId,
    cliente_nome: payment.clienteNome,
    valor: payment.valor,
    data_pagamento: payment.dataPagamento,
    forma_pagamento: payment.formaPagamento ?? null,
  };
}

function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    chargeId: row.charge_id as string,
    clienteId: row.cliente_id as string,
    clienteNome: row.cliente_nome as string,
    valor: toNumber(row.valor),
    dataPagamento: toIsoString(row.data_pagamento),
    formaPagamento: (row.forma_pagamento as string) || undefined,
  };
}

// ---------------------------------------------------------------------------
// One-time migration from AsyncStorage
// ---------------------------------------------------------------------------

export async function migrateLocalDataIfNeeded(): Promise<void> {
  const migrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (migrated === 'true') {
    return;
  }

  const userId = await getUserId();

  const [clientsJson, chargesJson, paymentsJson] = await Promise.all([
    AsyncStorage.getItem(LOCAL_STORAGE_KEYS.CLIENTS),
    AsyncStorage.getItem(LOCAL_STORAGE_KEYS.CHARGES),
    AsyncStorage.getItem(LOCAL_STORAGE_KEYS.PAYMENTS),
  ]);

  const localClients: Client[] = clientsJson ? JSON.parse(clientsJson) : [];
  const localCharges: Charge[] = chargesJson ? JSON.parse(chargesJson) : [];
  const localPayments: Payment[] = paymentsJson ? JSON.parse(paymentsJson) : [];

  if (
    localClients.length === 0 &&
    localCharges.length === 0 &&
    localPayments.length === 0
  ) {
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  const clientIdMap = new Map<string, string>();

  for (const rawClient of localClients) {
    const client = migrateClientData(rawClient);
    const newId = generateId();
    clientIdMap.set(client.id, newId);

    const { error } = await supabase
      .from('clients')
      .insert(clientToRow({ ...client, id: newId }, userId));

    if (error) {
      throw error;
    }
  }

  const chargeIdMap = new Map<string, string>();

  for (const charge of localCharges) {
    const newClientId = clientIdMap.get(charge.clienteId);
    if (!newClientId) {
      continue;
    }

    const newChargeId = generateId();
    chargeIdMap.set(charge.id, newChargeId);

    const { error } = await supabase.from('charges').insert(
      chargeToRow(
        {
          ...charge,
          id: newChargeId,
          clienteId: newClientId,
        },
        userId
      )
    );

    if (error) {
      throw error;
    }
  }

  for (const payment of localPayments) {
    const newClientId = clientIdMap.get(payment.clienteId);
    const newChargeId = chargeIdMap.get(payment.chargeId);

    if (!newClientId || !newChargeId) {
      continue;
    }

    const { error } = await supabase.from('payments').insert(
      paymentToRow(
        {
          ...payment,
          id: generateId(),
          clienteId: newClientId,
          chargeId: newChargeId,
        },
        userId
      )
    );

    if (error) {
      throw error;
    }
  }

  await AsyncStorage.multiRemove([
    LOCAL_STORAGE_KEYS.CLIENTS,
    LOCAL_STORAGE_KEYS.CHARGES,
    LOCAL_STORAGE_KEYS.LOANS,
    LOCAL_STORAGE_KEYS.PAYMENTS,
    LOCAL_STORAGE_KEYS.AUTH,
  ]);

  await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
}

// ---------------------------------------------------------------------------
// Client operations
// ---------------------------------------------------------------------------

export const getClients = async (): Promise<Client[]> => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => rowToClient(row));
};

export const saveClient = async (client: Client): Promise<void> => {
  const userId = await getUserId();
  const id = isValidUuid(client.id) ? client.id : generateId();

  const { error } = await supabase
    .from('clients')
    .upsert(clientToRow({ ...client, id }, userId));

  if (error) {
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Charge operations
// ---------------------------------------------------------------------------

export const getCharges = async (): Promise<Charge[]> => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('charges')
    .select('*')
    .eq('user_id', userId)
    .order('data_vencimento', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => rowToCharge(row));
};

export const saveCharge = async (charge: Charge): Promise<void> => {
  const userId = await getUserId();
  const id = await resolveChargeId(charge);

  const { error } = await supabase
    .from('charges')
    .upsert(chargeToRow({ ...charge, id }, userId));

  if (error) {
    throw error;
  }
};

export const deleteCharge = async (id: string): Promise<void> => {
  const userId = await getUserId();
  const resolvedId = (await resolveChargeIdForDelete(id)) ?? id;

  const { error } = await supabase
    .from('charges')
    .delete()
    .eq('id', resolvedId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Loan operations (legacy — always empty)
// ---------------------------------------------------------------------------

export const getLoans = async (): Promise<Loan[]> => {
  return [];
};

export const saveLoan = async (_loan: Loan): Promise<void> => {
  return;
};

export const deleteLoan = async (_id: string): Promise<void> => {
  return;
};

// ---------------------------------------------------------------------------
// Payment operations
// ---------------------------------------------------------------------------

export const getPayments = async (): Promise<Payment[]> => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('data_pagamento', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => rowToPayment(row));
};

export const savePayment = async (payment: Payment): Promise<void> => {
  const userId = await getUserId();
  const id = isValidUuid(payment.id) ? payment.id : generateId();

  const { error } = await supabase
    .from('payments')
    .upsert(paymentToRow({ ...payment, id }, userId));

  if (error) {
    throw error;
  }
};

export const deletePayment = async (id: string): Promise<void> => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Clear all data (for testing/reset)
// ---------------------------------------------------------------------------

export const clearAllData = async (): Promise<void> => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};
