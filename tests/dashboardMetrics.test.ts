/**
 * Testes de parcelas já pagas — valida regras de negócio financeiras.
 * Run: npm run test:metrics
 */

function getDaysFromFrequency(frequency: string): number {
  switch (frequency) {
    case 'Diário': return 1;
    case 'Semanal': return 7;
    case 'Mensal': return 30;
    case 'Anual': return 365;
    default: return 30;
  }
}

function clampParcelasJaPagas(parcelasJaPagas: number | undefined, parcelasTotais: number): number {
  const value = parcelasJaPagas ?? 0;
  return Math.max(0, Math.min(Math.floor(value), parcelasTotais));
}

function calculateContractDetails(client: Record<string, unknown>) {
  const valorEmprestado = client.valorEmprestado as number;
  const valorTotalReceber = client.valorTotalReceber as number;
  const valorParcela = client.valorParcela as number;
  const frequencia = client.frequencia as string;
  const dataInicio = client.dataInicio as string;

  const lucroEsperado = valorTotalReceber - valorEmprestado;
  const parcelasTotais = Math.floor(valorTotalReceber / valorParcela);
  const parcelasJaPagas = clampParcelasJaPagas(client.parcelasJaPagas as number | undefined, parcelasTotais);

  const daysPerPeriod = getDaysFromFrequency(frequencia);
  const startDate = new Date(dataInicio);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (parcelasTotais * daysPerPeriod));
  const dataTermino = endDate.toISOString();

  const valorRecebido = parcelasJaPagas * valorParcela;
  const saldoDevedor = Math.max(0, valorTotalReceber - valorRecebido);
  const parcelasPagas = parcelasJaPagas;
  const parcelasRestantes = parcelasTotais - parcelasPagas;
  const isContractPaid = parcelasPagas >= parcelasTotais;

  let proximoVencimento = dataTermino;
  if (!isContractPaid) {
    const nextDueDate = new Date(startDate);
    if (parcelasPagas > 0) {
      nextDueDate.setDate(startDate.getDate() + (parcelasPagas * daysPerPeriod));
    }
    proximoVencimento = nextDueDate.toISOString();
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
    status: isContractPaid ? 'quitado' : 'ativo',
  };
}

function updateClientFinancialStatus(client: Record<string, unknown>, payments: Array<{ clienteId: string; valor: number }>) {
  const initialReceived = ((client.parcelasJaPagas as number) ?? 0) * (client.valorParcela as number);
  const clientPayments = payments.filter(p => p.clienteId === client.id);
  const appPaymentsReceived = clientPayments.reduce((sum, p) => sum + p.valor, 0);
  const valorRecebido = initialReceived + appPaymentsReceived;
  const parcelasTotais = (client.parcelasTotais as number) || 0;
  const parcelasPagas = Math.min(parcelasTotais, Math.floor(valorRecebido / (client.valorParcela as number)));
  const saldoDevedor = Math.max(0, (client.valorTotalReceber as number) - valorRecebido);

  return {
    ...client,
    valorRecebido,
    parcelasPagas,
    parcelasRestantes: parcelasTotais - parcelasPagas,
    saldoDevedor,
    status: parcelasTotais > 0 && parcelasPagas >= parcelasTotais ? 'quitado' : client.status,
  };
}

function valorEmTransito(clients: Array<{ status: string; saldoDevedor: number }>) {
  return clients
    .filter(c => c.status !== 'quitado' && c.status !== 'cancelado')
    .reduce((sum, c) => sum + (c.saldoDevedor || 0), 0);
}

function validateParcelasJaPagas(parcelasJaPagas: number, parcelasTotais: number): string | null {
  if (parcelasJaPagas < 0) return 'negative';
  if (parcelasJaPagas > parcelasTotais) return 'exceedsTotal';
  return null;
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function createBaseClient(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    nome: 'Cliente Teste',
    telefone: '83999999999',
    valorEmprestado: 35000,
    valorTotalReceber: 52500,
    valorParcela: 1500,
    parcelasJaPagas: 0,
    frequencia: 'Mensal',
    dataInicio: '2026-01-01T00:00:00.000Z',
    status: 'ativo',
    ...overrides,
  };
}

// Cenário do requisito: R$ 52.500 total, R$ 1.500 parcela, 13 já pagas
const calculated = calculateContractDetails(createBaseClient({ parcelasJaPagas: 13 }));

assertEqual(calculated.parcelasTotais, 35, 'parcelasTotais');
assertEqual(calculated.parcelasPagas, 13, 'parcelasPagas');
assertEqual(calculated.parcelasRestantes, 22, 'parcelasRestantes');
assertEqual(calculated.valorRecebido, 19500, 'valorRecebido');
assertEqual(calculated.saldoDevedor, 33000, 'saldoDevedor');
assertEqual(calculated.status, 'ativo', 'status ativo');
assertEqual(Math.round((calculated.parcelasPagas / calculated.parcelasTotais) * 100), 37, 'percentual');

assertEqual(valorEmTransito([calculated]), 33000, 'valorEmTransito (A Receber)');

const fullyPaid = calculateContractDetails(createBaseClient({ parcelasJaPagas: 35 }));
assertEqual(fullyPaid.status, 'quitado', 'contrato quitado');
assertEqual(fullyPaid.saldoDevedor, 0, 'saldo zero');

const withAppPayment = updateClientFinancialStatus(calculated, [
  { clienteId: '1', valor: 1500 },
]);
assertEqual(withAppPayment.parcelasPagas, 14, 'parcelas após pagamento no app');
assertEqual(withAppPayment.valorRecebido, 21000, 'valor recebido após pagamento');
assertEqual(withAppPayment.saldoDevedor, 31500, 'saldo após pagamento');

assertEqual(validateParcelasJaPagas(-1, 35), 'negative', 'validação negativo');
assertEqual(validateParcelasJaPagas(36, 35), 'exceedsTotal', 'validação excede total');
assertEqual(validateParcelasJaPagas(13, 35), null, 'validação ok');
assertEqual(clampParcelasJaPagas(40, 35), 35, 'clamp máximo');
assertEqual(clampParcelasJaPagas(-5, 35), 0, 'clamp mínimo');

console.log('✓ Todos os testes de parcelas já pagas passaram');
