// Data Models for FinBolso Application

// Authentication types
export interface User {
  id: string;
  nome: string;
  pinHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthStorageSchema {
  schemaVersion: number;
  user: User | null;
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  endereco?: string;
  observacao?: string;
  
  // Core financial fields (user input)
  valorEmprestado: number;
  valorTotalReceber: number;
  valorParcela: number;
  frequencia: "Diário" | "Semanal" | "Mensal" | "Anual";
  
  // Dates
  dataInicio: string;
  dataTermino: string;
  proximoVencimento: string;
  
  // Calculated fields (required, not optional)
  lucroEsperado: number;
  valorRecebido: number;
  saldoDevedor: number;
  parcelasTotais: number;
  parcelasPagas: number;
  parcelasRestantes: number;
  
  // Status
  status: "ativo" | "pendente" | "atrasado" | "quitado" | "cancelado";
  
  // Payment history
  historicoPagamentos: PaymentHistoryEntry[];
}

export interface PaymentHistoryEntry {
  id: string;
  valor: number;
  data: string;
  hora: string;
  parcelaNumero: number;
}

export interface Charge {
  id: string;
  clienteId: string;
  clienteNome: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: "pendente" | "pago" | "cancelado" | "em_transito";
  parcela?: number;
  totalParcelas?: number;
  telefone?: string;
}

export interface Loan {
  id: string;
  clienteId: string;
  clienteNome: string;
  valor: number;
  dataEmprestimo: string;
  dataQuitacao?: string;
  status: "ativo" | "quitado" | "atrasado";
  telefone?: string;
}

export interface Payment {
  id: string;
  chargeId: string;
  clienteId: string;
  clienteNome: string;
  valor: number;
  dataPagamento: string;
  formaPagamento?: string;
}

export interface FinancialMetrics {
  carteiraTotal: number;
  capitalInvestido: number;
  valorEmTransito: number;
  lucroEsperado: number;
  recebidoHoje: number;
  recebidoSemana: number;
  clientesAtivos: number;
  clientesAtrasados: number;
  clientesQuitados: number;
  taxaAdimplencia: number;
}

export interface DashboardData {
  clientesAtrasados: (Charge & { saldoDevedor?: number; diasAtraso?: number })[];
  clientesHoje: Charge[];
  pagosHoje: Payment[];
  listaSemana: Charge[];
  contratosConcluidos: Client[];
}
