import { Client, Charge, Loan, Payment, FinancialMetrics } from '../types';

// Helper function to get days from payment frequency
const getDaysFromFrequency = (frequency: "Diário" | "Semanal" | "Mensal" | "Anual"): number => {
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
  
  if (!oldFieldNames) return client as Client;
  
  return {
    id: client.id,
    nome: client.nome,
    telefone: client.numero || client.telefone || '',
    endereco: client.endereco,
    observacao: client.observacao,
    valorEmprestado: client.valorEmprestado,
    valorTotalReceber: client.valorTotalReceber,
    valorParcela: client.valorParcela,
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
    status: client.status || client.status || 'ativo',
    historicoPagamentos: client.historicoPagamentos || [],
  };
};

// Check if a date is today
export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// Check if a date is overdue
export const isOverdue = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date < today;
};

// Get days until due date
export const getDaysUntilDue = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if current month
export const isCurrentMonth = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// Calculate contract details automatically
export const calculateContractDetails = (client: Client): Client => {
  const { valorEmprestado, valorTotalReceber, valorParcela, frequencia, dataInicio } = client;
  
  // Calculate expected profit
  const lucroEsperado = valorTotalReceber - valorEmprestado;
  
  // Calculate total parcels
  const parcelasTotais = Math.floor(valorTotalReceber / valorParcela);
  
  // Calculate end date based on frequency
  const daysPerPeriod = getDaysFromFrequency(frequencia);
  const startDate = new Date(dataInicio);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (parcelasTotais * daysPerPeriod));
  const dataTermino = endDate.toISOString();
  
  // Calculate next due date - FIRST payment should be TODAY
  const nextDueDate = new Date(startDate);
  const proximoVencimento = nextDueDate.toISOString();
  
  return {
    ...client,
    lucroEsperado,
    parcelasTotais,
    dataTermino,
    proximoVencimento,
    saldoDevedor: valorTotalReceber,
    valorRecebido: 0,
    parcelasPagas: 0,
    parcelasRestantes: parcelasTotais,
    historicoPagamentos: [],
  };
};

// Update client financial status based on payments
export const updateClientFinancialStatus = (
  client: Client,
  payments: Payment[]
): Client => {
  const clientPayments = payments.filter(p => p.clienteId === client.id);
  const valorRecebido = clientPayments.reduce((sum, p) => sum + p.valor, 0);
  
  // Calculate paid parcels
  const parcelasPagas = Math.floor(valorRecebido / client.valorParcela);
  
  // Calculate remaining debt
  const saldoDevedor = Math.max(0, client.valorTotalReceber - valorRecebido);
  
  // Check if contract is fully paid
  const isContractPaid = saldoDevedor <= 0 && client.parcelasTotais && parcelasPagas >= client.parcelasTotais;
  
  // Calculate next due date based on paid parcels (only if not paid)
  let proximoVencimento = client.proximoVencimento;
  if (!isContractPaid) {
    const daysPerPeriod = getDaysFromFrequency(client.frequencia);
    const startDate = new Date(client.dataInicio);
    const nextDueDate = new Date(startDate);
    // First payment (parcelasPagas = 0) is due TODAY
    // Subsequent payments follow the frequency
    if (parcelasPagas === 0) {
      // First payment is today
      proximoVencimento = nextDueDate.toISOString();
    } else {
      // Next payment is after the paid periods
      nextDueDate.setDate(startDate.getDate() + (parcelasPagas * daysPerPeriod));
      proximoVencimento = nextDueDate.toISOString();
    }
  }
  
  // Build payment history from payments
  const historicoPagamentos = clientPayments.map((payment, index) => ({
    id: payment.id,
    valor: payment.valor,
    data: payment.dataPagamento.split('T')[0],
    hora: payment.dataPagamento.split('T')[1].split('.')[0],
    parcelaNumero: index + 1,
  }));
  
  return {
    ...client,
    valorRecebido,
    parcelasPagas,
    parcelasRestantes: client.parcelasTotais ? client.parcelasTotais - parcelasPagas : 0,
    saldoDevedor,
    proximoVencimento,
    status: isContractPaid ? 'quitado' : client.status || 'ativo',
    historicoPagamentos,
  };
};

// Generate charges for clients automatically
export const generateChargesForClients = (clients: Client[]): Charge[] => {
  const charges: Charge[] = [];
  const today = new Date();
  
  clients.forEach(client => {
    // Skip if contract is quitado or cancelado
    if (client.status === 'quitado' || client.status === 'cancelado') return;
    
    if (!client.proximoVencimento || !client.parcelasTotais) return;
    
    const nextDueDate = new Date(client.proximoVencimento);
    
    // Only generate charge if due date is today or in the past
    if (nextDueDate <= today) {
      // Check if charge already exists for this due date
      const chargeId = `${client.id}-${nextDueDate.toISOString().split('T')[0]}`;
      
      charges.push({
        id: chargeId,
        clienteId: client.id,
        clienteNome: client.nome,
        valor: client.valorParcela,
        dataVencimento: nextDueDate.toISOString(),
        status: 'pendente',
        parcela: (client.parcelasPagas || 0) + 1,
        totalParcelas: client.parcelasTotais,
        telefone: client.telefone,
      });
    }
  });
  
  return charges;
};

// Check for overdue clients
export const getOverdueClients = (clients: Client[]): Client[] => {
  const today = new Date();
  
  return clients.filter(client => {
    if (!client.proximoVencimento || !client.saldoDevedor) return false;
    if (client.saldoDevedor <= 0) return false; // Fully paid
    if (client.status === 'quitado') return false;
    
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

// Calculate Valor em Trânsito
// Valor em Trânsito = Sum of saldoDevedor of active contracts
export const valorEmTransito = (clients: Client[]): number => {
  return clients
    .filter(c => c.status !== 'quitado' && c.status !== 'cancelado')
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

// Calculate Clientes Ativos
// Quantidade de contratos ativos (ativo, pendente, atrasado)
export const clientesAtivos = (clients: Client[]): number => {
  return clients.filter(c => 
    c.status === 'ativo' || 
    c.status === 'pendente' || 
    c.status === 'atrasado'
  ).length;
};

// Calculate Clientes Atrasados
// Quantidade de clientes em atraso (hoje > proximoVencimento e pagamento não registrado)
export const clientesAtrasados = (clients: Client[], charges: Charge[]): number => {
  const today = new Date();
  return clients.filter(client => {
    if (!client.proximoVencimento || (client.saldoDevedor ?? 0) <= 0) return false;
    if (client.status === 'quitado') return false;
    
    const nextDueDate = new Date(client.proximoVencimento);
    if (nextDueDate < today) {
      // Check if payment exists for this due date
      const hasPayment = charges.some(c => 
        c.clienteId === client.id && 
        c.status === 'pago' && 
        isToday(c.dataPagamento || '')
      );
      return !hasPayment;
    }
    return false;
  }).length;
};

// Calculate Clientes Quitados
// Quantidade de contratos concluídos (saldoDevedor = 0)
export const clientesQuitados = (clients: Client[]): number => {
  return clients.filter(c => 
    c.status === 'quitado' || 
    (c.saldoDevedor !== undefined && c.saldoDevedor <= 0)
  ).length;
};

// Calculate Taxa de Adimplência
// (Clientes em Dia ÷ Total Clientes) × 100
export const taxaAdimplencia = (clients: Client[]): number => {
  if (clients.length === 0) return 0;
  const totalClientes = clients.length;
  const clientesAtrasadosCount = clientesAtrasados(clients, []);
  const clientesEmDia = totalClientes - clientesAtrasadosCount;
  return (clientesEmDia / totalClientes) * 100;
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
    taxaAdimplencia: taxaAdimplencia(clients),
  };
};

// Get dashboard data (overdue, today's payments, etc.)
export const getDashboardData = (
  charges: Charge[],
  payments: Payment[],
  clients: Client[]
): { clientesAtrasados: (Charge & { saldoDevedor?: number; diasAtraso?: number })[]; clientesHoje: Charge[]; pagosHoje: Payment[]; listaSemana: Charge[]; contratosConcluidos: Client[] } => {
  const today = new Date();
  
  const clientesAtrasados = charges.filter(
    c => c.status === 'pendente' && isOverdue(c.dataVencimento)
  ).map(charge => {
    const client = clients.find(c => c.id === charge.clienteId);
    // Skip if contract is quitado
    if (client?.status === 'quitado') return null;
    
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
      // Skip if contract is quitado
      if (client?.status === 'quitado') return false;
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
  
  const listaSemana = charges.filter(
    c => {
      const client = clients.find(cl => cl.id === c.clienteId);
      // Skip if contract is quitado
      if (client?.status === 'quitado') return false;
      const dueDate = new Date(c.dataVencimento);
      return c.status === 'pendente' && dueDate > today && dueDate <= nextWeek;
    }
  ).sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  
  // Deduplicate by client ID
  const deduplicatedSemana = listaSemana.filter((charge, index, self) =>
    index === self.findIndex(c => c.clienteId === charge.clienteId)
  );
  
  // Contratos Concluídos - clients with status quitado or saldoDevedor = 0
  const contratosConcluidos = clients.filter(c => 
    c.status === 'quitado' || 
    (c.saldoDevedor !== undefined && c.saldoDevedor <= 0)
  );
  
  return {
    clientesAtrasados: deduplicatedAtrasados,
    clientesHoje: deduplicatedHoje,
    pagosHoje,
    listaSemana: deduplicatedSemana,
    contratosConcluidos,
  };
};
