import { Client, Charge, Loan, Payment, FinancialMetrics } from '../types';

export const startOfDay = (date: Date = new Date()): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export type ContractValidationError =
  | 'totalLessThanLoan'
  | 'installmentTooHigh'
  | 'installmentRemainder';

export const validateContractFinancials = (
  valorEmprestado: number,
  valorTotalReceber: number,
  valorParcela: number
): ContractValidationError | null => {
  if (valorTotalReceber < valorEmprestado) {
    return 'totalLessThanLoan';
  }

  const parcelasTotais = Math.floor(valorTotalReceber / valorParcela);
  if (parcelasTotais < 1) {
    return 'installmentTooHigh';
  }

  const remainder = Math.round((valorTotalReceber - parcelasTotais * valorParcela) * 100) / 100;
  if (remainder > 0.01) {
    return 'installmentRemainder';
  }

  return null;
};

export const isContractSettled = (
  saldoDevedor: number,
  parcelasRestantes: number
): boolean => saldoDevedor <= 0 || parcelasRestantes <= 0;

export const isContractActive = (client: Client): boolean => {
  if (client.status === 'cancelado') {
    return false;
  }

  const saldoDevedor = client.saldoDevedor ?? 0;
  const parcelasRestantes = client.parcelasRestantes ?? 0;
  return saldoDevedor > 0 && parcelasRestantes > 0;
};

export const getContractStatus = (
  client: Client,
  options?: {
    saldoDevedor?: number;
    parcelasRestantes?: number;
    proximoVencimento?: string;
  }
): Client['status'] => {
  if (client.status === 'cancelado') {
    return 'cancelado';
  }

  const saldoDevedor = options?.saldoDevedor ?? client.saldoDevedor ?? 0;
  const parcelasRestantes =
    options?.parcelasRestantes ?? client.parcelasRestantes ?? 0;
  const proximoVencimento = options?.proximoVencimento ?? client.proximoVencimento;

  if (isContractSettled(saldoDevedor, parcelasRestantes)) {
    return 'quitado';
  }

  if (proximoVencimento && isOverdue(proximoVencimento)) {
    return 'atrasado';
  }

  return 'ativo';
};

// Helper function to get days from payment frequency
export const getDaysFromFrequency = (frequency: "Diário" | "Semanal" | "Mensal" | "Anual"): number => {
  switch (frequency) {
    case 'Diário': return 1;
    case 'Semanal': return 7;
    case 'Mensal': return 30;
    case 'Anual': return 365;
    default: return 30;
  }
};

// Migration function to handle old client data structure
export const migrateClientData = (client: any): Client => {
  // If client has old field names, migrate to new structure
  const oldFieldNames = client.numero !== undefined || client.tipoPagamento !== undefined || 
                        client.dataCadastro !== undefined || client.totalParcelas !== undefined;
  
  if (!oldFieldNames) {
    const migrated = client as Client;
    if (!migrated.proximoVencimento && migrated.dataInicio) {
      return calculateContractDetails(migrated);
    }
    return migrated;
  }
  
  return {
    id: client.id,
    nome: client.nome,
    telefone: client.numero || client.telefone || '',
    endereco: client.endereco,
    observacao: client.observacao,
    valorEmprestado: client.valorEmprestado,
    valorTotalReceber: client.valorTotalReceber,
    valorParcela: client.valorParcela,
    parcelasJaPagas: client.parcelasJaPagas ?? 0,
    frequencia: client.tipoPagamento || client.frequencia || 'Mensal',
    dataInicio: client.dataCadastro || client.dataInicio || new Date().toISOString(),
    dataTermino: client.dataTermino || new Date().toISOString(),
    proximoVencimento: client.proximoVencimento || new Date().toISOString(),
    lucroEsperado: client.lucroEsperado ?? (client.valorTotalReceber - client.valorEmprestado),
    valorRecebido: client.valorRecebido ?? 0,
    saldoDevedor: client.saldoDevedor ?? client.valorTotalReceber,
    parcelasTotais: client.totalParcelas ?? client.parcelasTotais ?? Math.floor(client.valorTotalReceber / client.valorParcela),
    parcelasPagas: client.parcelasPagas ?? 0,
    parcelasRestantes: client.parcelasRestantes ?? (client.totalParcelas ?? Math.floor(client.valorTotalReceber / client.valorParcela)),
    status: client.status || 'ativo',
    historicoPagamentos: client.historicoPagamentos || [],
  };
};

// Check if a date is today
export const isToday = (dateString: string): boolean => {
  const date = startOfDay(new Date(dateString));
  const today = startOfDay();
  return date.getTime() === today.getTime();
};

// Check if a date is tomorrow
export const isTomorrow = (dateString: string): boolean => {
  const tomorrow = startOfDay();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = startOfDay(new Date(dateString));
  return date.getTime() === tomorrow.getTime();
};

// Check if contract was recently created (display-only)
export const isNewContract = (dataInicio: string, daysThreshold = 7): boolean => {
  const start = startOfDay(new Date(dataInicio));
  const today = startOfDay();
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysThreshold;
};

// Check if a date is overdue
export const isOverdue = (dateString: string): boolean => {
  const date = startOfDay(new Date(dateString));
  const today = startOfDay();
  return date.getTime() < today.getTime();
};

// Get days until due date (normalized to start of day)
export const getDaysUntilDue = (dateString: string): number => {
  const date = startOfDay(new Date(dateString));
  const today = startOfDay();
  const diffTime = date.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const toDateInputValue = (dateString: string): string => {
  const date = startOfDay(new Date(dateString));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateInputValue = (value: string): string => {
  const [year, month, day] = value.split('-').map(Number);
  return startOfDay(new Date(year, month - 1, day)).toISOString();
};

export const advanceProximoVencimento = (
  currentDueDate: string,
  frequencia: Client['frequencia']
): string => {
  const daysPerPeriod = getDaysFromFrequency(frequencia);
  const next = startOfDay(new Date(currentDueDate));
  next.setDate(next.getDate() + daysPerPeriod);
  return next.toISOString();
};

// Human-readable days until due (display-only)
export const formatDaysUntilDueLabel = (dateString: string): string => {
  const days = getDaysUntilDue(dateString);
  if (days < 0) return `Atrasado há ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias`;
};

// Check if current month
export const isCurrentMonth = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// Clamp parcelas já pagas within valid range [0, parcelasTotais]
export const clampParcelasJaPagas = (parcelasJaPagas: number | undefined, parcelasTotais: number): number => {
  const value = parcelasJaPagas ?? 0;
  return Math.max(0, Math.min(Math.floor(value), parcelasTotais));
};

// Valor recebido antes de qualquer pagamento registrado no app
export const getInitialValorRecebido = (client: Client): number => {
  return (client.parcelasJaPagas ?? 0) * client.valorParcela;
};

// Calcula a data da próxima parcela pendente com base no início do contrato
export const calculateInitialProximoVencimento = (
  dataInicio: string,
  frequencia: Client['frequencia'],
  parcelasPagas: number,
  settled: boolean,
  dataTermino: string
): string => {
  if (settled) return dataTermino;

  const daysPerPeriod = getDaysFromFrequency(frequencia);
  const startDate = startOfDay(new Date(dataInicio));
  const nextDueDate = new Date(startDate);
  nextDueDate.setDate(startDate.getDate() + parcelasPagas * daysPerPeriod);
  return nextDueDate.toISOString();
};

export const buildPendingChargeForClient = (client: Client): Charge | null => {
  if (!isContractActive(client) || !client.proximoVencimento) {
    return null;
  }

  const dueDate = startOfDay(new Date(client.proximoVencimento));

  return {
    id: `${client.id}-${dueDate.toISOString().split('T')[0]}`,
    clienteId: client.id,
    clienteNome: client.nome,
    valor: client.valorParcela,
    dataVencimento: dueDate.toISOString(),
    status: 'pendente',
    parcela: (client.parcelasPagas || 0) + 1,
    totalParcelas: client.parcelasTotais,
    telefone: client.telefone,
  };
};

export const canRegisterPayment = (client: Client): boolean => {
  if (client.status === 'cancelado') return false;
  const saldoDevedor = client.saldoDevedor ?? 0;
  const parcelasRestantes = client.parcelasRestantes ?? 0;
  return saldoDevedor > 0 && parcelasRestantes > 0;
};

// Progresso do contrato (fonte única para UI)
export const getInstallmentProgress = (client: Client) => {
  const total = client.parcelasTotais || 0;
  const paid = client.parcelasPagas || 0;
  const remaining = client.parcelasRestantes ?? Math.max(0, total - paid);
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  return {
    paid,
    total,
    remaining,
    percent,
    valorRecebido: client.valorRecebido || 0,
    valorRestante: client.saldoDevedor || 0,
  };
};

// Valida parcelas já pagas (retorna mensagem de erro ou null)
export const validateParcelasJaPagas = (
  parcelasJaPagas: number,
  parcelasTotais: number
): string | null => {
  if (parcelasJaPagas < 0) return 'negative';
  if (parcelasJaPagas > parcelasTotais) return 'exceedsTotal';
  return null;
};

// Calculate contract details automatically
export const calculateContractDetails = (
  client: Client,
  options?: { preserveProximoVencimento?: boolean }
): Client => {
  const { valorEmprestado, valorTotalReceber, valorParcela, frequencia, dataInicio } = client;

  const lucroEsperado = valorTotalReceber - valorEmprestado;
  const parcelasTotais = Math.floor(valorTotalReceber / valorParcela);
  const parcelasJaPagas = clampParcelasJaPagas(client.parcelasJaPagas, parcelasTotais);

  const daysPerPeriod = getDaysFromFrequency(frequencia);
  const startDate = startOfDay(new Date(dataInicio));
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + parcelasTotais * daysPerPeriod);
  const dataTermino = endDate.toISOString();

  const valorRecebido = parcelasJaPagas * valorParcela;
  const saldoDevedor = Math.max(0, valorTotalReceber - valorRecebido);
  const parcelasPagas = parcelasJaPagas;
  const parcelasRestantes = parcelasTotais - parcelasPagas;
  const settled = isContractSettled(saldoDevedor, parcelasRestantes);

  let proximoVencimento: string;
  if (settled) {
    proximoVencimento = dataTermino;
  } else if (options?.preserveProximoVencimento && client.proximoVencimento) {
    proximoVencimento = startOfDay(new Date(client.proximoVencimento)).toISOString();
  } else {
    proximoVencimento = calculateInitialProximoVencimento(
      dataInicio,
      frequencia,
      parcelasPagas,
      settled,
      dataTermino
    );
  }

  return {
    ...client,
    parcelasJaPagas,
    lucroEsperado,
    parcelasTotais,
    dataTermino,
    proximoVencimento,
    saldoDevedor,
    valorRecebido,
    parcelasPagas,
    parcelasRestantes,
    status: getContractStatus(client, {
      saldoDevedor,
      parcelasRestantes,
      proximoVencimento,
    }),
    historicoPagamentos: client.historicoPagamentos || [],
  };
};

// Update client financial status based on payments
export const updateClientFinancialStatus = (
  client: Client,
  payments: Payment[]
): Client => {
  const clientPayments = payments.filter(p => p.clienteId === client.id);
  const initialReceived = getInitialValorRecebido(client);
  const appPaymentsReceived = clientPayments.reduce((sum, p) => sum + p.valor, 0);
  const valorRecebido = initialReceived + appPaymentsReceived;

  const parcelasTotais = client.parcelasTotais || 0;
  const parcelasPagas = Math.min(
    parcelasTotais,
    Math.floor(valorRecebido / client.valorParcela)
  );
  const parcelasRestantes = parcelasTotais - parcelasPagas;
  const saldoDevedor = Math.max(0, client.valorTotalReceber - valorRecebido);
  const settled = isContractSettled(saldoDevedor, parcelasRestantes);

  const proximoVencimento = settled
    ? client.dataTermino
    : client.proximoVencimento
      ? startOfDay(new Date(client.proximoVencimento)).toISOString()
      : calculateInitialProximoVencimento(
          client.dataInicio,
          client.frequencia,
          parcelasPagas,
          false,
          client.dataTermino
        );

  // Build payment history from payments
  const sortedPayments = [...clientPayments].sort(
    (a, b) => new Date(a.dataPagamento).getTime() - new Date(b.dataPagamento).getTime()
  );

  const historicoPagamentos = sortedPayments.map((payment, index) => ({
    id: payment.id,
    valor: payment.valor,
    data: payment.dataPagamento.split('T')[0],
    hora: payment.dataPagamento.split('T')[1]?.split('.')[0] ?? '00:00:00',
    parcelaNumero: (client.parcelasJaPagas ?? 0) + index + 1,
  }));
  
  return {
    ...client,
    valorRecebido,
    parcelasPagas,
    parcelasRestantes,
    saldoDevedor,
    proximoVencimento,
    status: getContractStatus(client, {
      saldoDevedor,
      parcelasRestantes,
      proximoVencimento,
    }),
    historicoPagamentos,
  };
};

export const applyPaymentToClient = (
  client: Client,
  payments: Payment[]
): Client => {
  const updated = updateClientFinancialStatus(client, payments);

  if (isContractSettled(updated.saldoDevedor, updated.parcelasRestantes)) {
    return {
      ...updated,
      proximoVencimento: updated.dataTermino,
      status: 'quitado',
    };
  }

  const proximoVencimento = advanceProximoVencimento(
    client.proximoVencimento,
    client.frequencia
  );

  return {
    ...updated,
    proximoVencimento,
    status: getContractStatus(client, {
      saldoDevedor: updated.saldoDevedor,
      parcelasRestantes: updated.parcelasRestantes,
      proximoVencimento,
    }),
  };
};

// Generate charges for clients automatically
export const generateChargesForClients = (clients: Client[]): Charge[] => {
  const charges: Charge[] = [];

  clients.forEach(client => {
    if (client.status === 'cancelado') return;
    if (!isContractActive(client)) return;
    if (!client.proximoVencimento || !client.parcelasTotais) return;

    const pendingCharge = buildPendingChargeForClient(client);
    if (pendingCharge) {
      charges.push(pendingCharge);
    }
  });

  return charges;
};

// Check for overdue clients
export const getOverdueClients = (clients: Client[]): Client[] => {
  const today = new Date();
  
  return clients.filter(client => {
    if (!isContractActive(client)) return false;
    if (!client.proximoVencimento) return false;

    const nextDueDate = new Date(client.proximoVencimento);
    return nextDueDate < today;
  });
};

// Helper function to parse currency string to number
export const parseCurrencyToNumber = (currencyString: string): number => {
  if (typeof currencyString === 'number') return currencyString;
  const cleaned = currencyString.replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// Helper function to format number to currency
export const formatCurrency = (value?: number): string => {
  const numValue = value ?? 0;
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Calculate Carteira Total
// Carteira Total = Sum of valorTotalReceber of ALL contracts
export const carteiraTotal = (clients: Client[]): number => {
  return clients.reduce((sum, c) => sum + (c.valorTotalReceber || 0), 0);
};

// Calculate Capital Investido
// Capital Investido = Sum of valorEmprestado of ALL contracts
export const capitalInvestido = (clients: Client[]): number => {
  return clients.reduce((sum, c) => sum + (c.valorEmprestado || 0), 0);
};

// Calculate Valor em Trânsito (A Receber)
// Soma dos saldos devedores de contratos com saldo pendente
export const valorEmTransito = (clients: Client[]): number => {
  return clients
    .filter(isContractActive)
    .reduce((sum, c) => sum + (c.saldoDevedor || 0), 0);
};

// Calculate Lucro Esperado
// Lucro Esperado = Sum of lucroEsperado of ALL contracts
export const lucroEsperadoTotal = (clients: Client[]): number => {
  return clients.reduce((sum, c) => sum + (c.lucroEsperado || 0), 0);
};

// Calculate Recebido Hoje
// Soma de todos os pagamentos registrados hoje
export const recebidoHoje = (payments: Payment[]): number => {
  return payments
    .filter(p => isToday(p.dataPagamento))
    .reduce((sum, p) => sum + p.valor, 0);
};

// Calculate Recebido na Semana
// Soma de todos os pagamentos nos últimos 7 dias
export const recebidoSemana = (payments: Payment[]): number => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  return payments
    .filter(p => {
      const paymentDate = new Date(p.dataPagamento);
      return paymentDate >= sevenDaysAgo && paymentDate <= today;
    })
    .reduce((sum, p) => sum + p.valor, 0);
};

// Calculate Recebido nos últimos 30 dias (display-only)
export const recebidoUltimos30Dias = (payments: Payment[]): number => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return payments
    .filter(p => {
      const paymentDate = new Date(p.dataPagamento);
      return paymentDate >= thirtyDaysAgo && paymentDate <= today;
    })
    .reduce((sum, p) => sum + p.valor, 0);
};

export type ChargeDisplayFilter = 'today' | 'tomorrow' | 'overdue' | 'week';

const getActivePendingCharges = (charges: Charge[], clients: Client[]): Charge[] => {
  const activeClientIds = new Set(
    clients.filter(isContractActive).map(client => client.id)
  );

  return charges.filter(
    charge => charge.status === 'pendente' && activeClientIds.has(charge.clienteId)
  );
};

export const getChargeSummary = (charges: Charge[], clients: Client[]) => {
  const pending = getActivePendingCharges(charges, clients);

  return {
    pendentes: pending.length,
    vencidas: pending.filter(charge => isOverdue(charge.dataVencimento)).length,
    hoje: pending.filter(charge => isToday(charge.dataVencimento)).length,
    amanha: pending.filter(charge => isTomorrow(charge.dataVencimento)).length,
  };
};

export const filterPendingChargesByPeriod = (
  charges: Charge[],
  clients: Client[],
  filter: ChargeDisplayFilter
): Charge[] => {
  const today = startOfDay();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  const pending = getActivePendingCharges(charges, clients);

  const filtered = pending.filter(charge => {
    const dueDate = startOfDay(new Date(charge.dataVencimento));

    switch (filter) {
      case 'today':
        return isToday(charge.dataVencimento);
      case 'tomorrow':
        return isTomorrow(charge.dataVencimento);
      case 'overdue':
        return isOverdue(charge.dataVencimento);
      case 'week':
        return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= nextWeek.getTime();
      default:
        return true;
    }
  });

  return filtered.sort(
    (a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  );
};

export const groupPaymentsByMonth = (
  payments: Payment[]
): { key: string; label: string; payments: Payment[]; total: number }[] => {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
  );

  const groups = new Map<string, Payment[]>();

  sorted.forEach(payment => {
    const date = new Date(payment.dataPagamento);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = groups.get(key) ?? [];
    existing.push(payment);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).map(([key, groupPayments]) => {
    const [year, month] = key.split('-');
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });

    return {
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      payments: groupPayments,
      total: groupPayments.reduce((sum, p) => sum + p.valor, 0),
    };
  });
};

// Calculate Clientes Ativos
// Quantidade de contratos ativos (ativo, pendente, atrasado)
export const clientesAtivos = (clients: Client[]): number => {
  return clients.filter(isContractActive).length;
};

// Calculate Clientes Atrasados
export const clientesAtrasados = (clients: Client[], charges: Charge[]): number => {
  const overdueClientIds = new Set(
    charges
      .filter(charge => charge.status === 'pendente' && isOverdue(charge.dataVencimento))
      .map(charge => charge.clienteId)
  );

  return clients.filter(client => {
    if (!isContractActive(client)) return false;

    if (overdueClientIds.has(client.id)) {
      return true;
    }

    return Boolean(client.proximoVencimento && isOverdue(client.proximoVencimento));
  }).length;
};

// Calculate Clientes Quitados
// Quantidade de contratos concluídos (saldoDevedor = 0)
export const clientesQuitados = (clients: Client[]): number => {
  return clients.filter(
    c =>
      c.status !== 'cancelado' &&
      isContractSettled(c.saldoDevedor ?? 0, c.parcelasRestantes ?? 0)
  ).length;
};

// Calculate Taxa de Adimplência
export const taxaAdimplencia = (clients: Client[], charges: Charge[]): number => {
  const activeClients = clients.filter(isContractActive);

  if (activeClients.length === 0) {
    return 100;
  }

  const atrasados = clientesAtrasados(activeClients, charges);
  return ((activeClients.length - atrasados) / activeClients.length) * 100;
};

// Get contract status color
// Returns color based on contract status
export const getContractStatusColor = (client: Client, charges: Charge[]): string => {
  if (client.status === 'quitado') return '#3B82F6'; // Blue - Quitado
  if (client.status === 'atrasado') return '#EF4444'; // Red - Atrasado
  
  // Check if due today
  if (client.proximoVencimento && isToday(client.proximoVencimento)) {
    return '#F59E0B'; // Yellow - Vence hoje
  }
  
  // Check if overdue
  if (client.proximoVencimento && isOverdue(client.proximoVencimento)) {
    return '#EF4444'; // Red - Atrasado
  }
  
  return '#10B981'; // Green - Em dia
};

// Get charge status color
// Returns color based on charge status
export const getChargeStatusColor = (charge: Charge): string => {
  if (charge.status === 'pago') return '#10B981'; // Green - Pago
  if (charge.status === 'cancelado') return '#6B7280'; // Gray - Cancelado
  
  if (isToday(charge.dataVencimento)) {
    return '#F59E0B'; // Yellow - Vence hoje
  }
  
  if (isOverdue(charge.dataVencimento)) {
    return '#EF4444'; // Red - Atrasado
  }
  
  return '#10B981'; // Green - Em dia
};

// Calculate all metrics at once
export const calculateAllMetrics = (
  clients: Client[],
  charges: Charge[],
  loans: Loan[],
  payments: Payment[]
): FinancialMetrics => {
  return {
    carteiraTotal: carteiraTotal(clients),
    capitalInvestido: capitalInvestido(clients),
    valorEmTransito: valorEmTransito(clients),
    lucroEsperado: lucroEsperadoTotal(clients),
    recebidoHoje: recebidoHoje(payments),
    recebidoSemana: recebidoSemana(payments),
    clientesAtivos: clientesAtivos(clients),
    clientesAtrasados: clientesAtrasados(clients, charges),
    clientesQuitados: clientesQuitados(clients),
    taxaAdimplencia: taxaAdimplencia(clients, charges),
  };
};

// Get dashboard data (overdue, today's payments, etc.)
export const getDashboardData = (
  charges: Charge[],
  payments: Payment[],
  clients: Client[]
): { clientesAtrasados: (Charge & { saldoDevedor?: number; diasAtraso?: number })[]; clientesHoje: Charge[]; pagosHoje: Payment[]; listaSemana: Charge[]; contratosConcluidos: Client[] } => {
  const today = startOfDay();
  
  const clientesAtrasados = charges.filter(
    c => c.status === 'pendente' && isOverdue(c.dataVencimento)
  ).map(charge => {
    const client = clients.find(c => c.id === charge.clienteId);
    if (!client || !isContractActive(client)) return null;
    
    // Calculate days overdue
    const dueDate = new Date(charge.dataVencimento);
    const diasAtraso = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...charge,
      saldoDevedor: client?.saldoDevedor,
      diasAtraso,
    };
  }).filter(c => c !== null) as (Charge & { saldoDevedor?: number; diasAtraso?: number })[];
  
  // Deduplicate by client ID - keep only the most recent charge for each client
  const deduplicatedAtrasados = clientesAtrasados.filter((charge, index, self) =>
    index === self.findIndex(c => c.clienteId === charge.clienteId)
  );
  
  const clientesHoje = charges.filter(
    c => {
      const client = clients.find(cl => cl.id === c.clienteId);
      if (!client || !isContractActive(client)) return false;
      return c.status === 'pendente' && isToday(c.dataVencimento);
    }
  );
  
  // Deduplicate by client ID
  const deduplicatedHoje = clientesHoje.filter((charge, index, self) =>
    index === self.findIndex(c => c.clienteId === charge.clienteId)
  );
  
  const pagosHoje = payments.filter(p => isToday(p.dataPagamento));
  
  // Lista da Semana - charges dos próximos 7 dias
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);
  
  const listaSemana = charges.filter(
    c => {
      const client = clients.find(cl => cl.id === c.clienteId);
      if (!client || !isContractActive(client)) return false;
      const dueDate = startOfDay(new Date(c.dataVencimento));
      return c.status === 'pendente' && dueDate.getTime() > today.getTime() && dueDate.getTime() <= nextWeek.getTime();
    }
  ).sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  
  // Deduplicate by client ID
  const deduplicatedSemana = listaSemana.filter((charge, index, self) =>
    index === self.findIndex(c => c.clienteId === charge.clienteId)
  );
  
  const contratosConcluidos = clients.filter(
    c =>
      c.status !== 'cancelado' &&
      isContractSettled(c.saldoDevedor ?? 0, c.parcelasRestantes ?? 0)
  );
  
  return {
    clientesAtrasados: deduplicatedAtrasados,
    clientesHoje: deduplicatedHoje,
    pagosHoje,
    listaSemana: deduplicatedSemana,
    contratosConcluidos,
  };
};
