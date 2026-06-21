import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Charge, Loan, Payment, FinancialMetrics, DashboardData } from '../types';
import * as storageService from '../services/storageService';
import { calculateAllMetrics, getDashboardData, calculateContractDetails, updateClientFinancialStatus, generateChargesForClients, migrateClientData } from '../services/financialMetrics';

interface AppContextType {
  // Data
  clients: Client[];
  charges: Charge[];
  loans: Loan[];
  payments: Payment[];
  metrics: FinancialMetrics;
  dashboardData: DashboardData;
  
  // Loading state
  isLoading: boolean;
  
  // Setters for backup/restore
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setCharges: React.Dispatch<React.SetStateAction<Charge[]>>;
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  
  // Client operations
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  
  // Charge operations
  markChargeAsPaid: (chargeId: string) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    carteiraTotal: 0,
    capitalInvestido: 0,
    valorEmTransito: 0,
    lucroEsperado: 0,
    recebidoHoje: 0,
    recebidoSemana: 0,
    clientesAtivos: 0,
    clientesAtrasados: 0,
    clientesQuitados: 0,
    taxaAdimplencia: 0,
  });
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    clientesAtrasados: [],
    clientesHoje: [],
    pagosHoje: [],
    listaSemana: [],
    contratosConcluidos: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Recalculate metrics whenever data changes
  useEffect(() => {
    if (!isLoading) {
      const newMetrics = calculateAllMetrics(clients, charges, loans, payments);
      setMetrics(newMetrics);
      
      const newDashboardData = getDashboardData(charges, payments, clients);
      setDashboardData(newDashboardData);
    }
  }, [clients, charges, loans, payments, isLoading]);

  // Update client financial status when payments change
  useEffect(() => {
    if (!isLoading && clients.length > 0) {
      const updatedClients = clients.map(client => 
        updateClientFinancialStatus(client, payments)
      );
      setClients(updatedClients);
    }
  }, [payments, isLoading]);

  // Auto-generate charges for due payments
  useEffect(() => {
    if (!isLoading && clients.length > 0) {
      const newCharges = generateChargesForClients(clients);
      
      // Add only charges that don't already exist
      newCharges.forEach(newCharge => {
        const exists = charges.some(c => c.id === newCharge.id);
        if (!exists) {
          storageService.saveCharge(newCharge);
          setCharges(prev => [...prev, newCharge]);
        }
      });
    }
  }, [clients, isLoading]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedClients, loadedCharges, loadedLoans, loadedPayments] = await Promise.all([
        storageService.getClients(),
        storageService.getCharges(),
        storageService.getLoans(),
        storageService.getPayments(),
      ]);
      
      // Migrate old client data to new structure
      const migratedClients = loadedClients.map(migrateClientData);
      
      setClients(migratedClients);
      setCharges(loadedCharges);
      setLoans(loadedLoans);
      setPayments(loadedPayments);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  // Client operations
  const addClient = async (client: Client) => {
    const clientWithCalculations = calculateContractDetails(client);
    await storageService.saveClient(clientWithCalculations);
    setClients(prev => [...prev, clientWithCalculations]);

    if (
      clientWithCalculations.status !== 'quitado' &&
      clientWithCalculations.parcelasRestantes > 0 &&
      clientWithCalculations.proximoVencimento
    ) {
      const initialCharge: Charge = {
        id: `${clientWithCalculations.id}-${clientWithCalculations.proximoVencimento.split('T')[0]}`,
        clienteId: clientWithCalculations.id,
        clienteNome: clientWithCalculations.nome,
        valor: clientWithCalculations.valorParcela,
        dataVencimento: clientWithCalculations.proximoVencimento,
        status: 'pendente',
        parcela: clientWithCalculations.parcelasPagas + 1,
        totalParcelas: clientWithCalculations.parcelasTotais,
        telefone: clientWithCalculations.telefone,
      };
      await storageService.saveCharge(initialCharge);
      setCharges(prev => [...prev, initialCharge]);
    }
  };

  const updateClient = async (client: Client) => {
    const withDetails = calculateContractDetails(client);
    const clientWithUpdatedStatus = updateClientFinancialStatus(withDetails, payments);
    await storageService.saveClient(clientWithUpdatedStatus);
    setClients(prev => prev.map(c => c.id === client.id ? clientWithUpdatedStatus : c));
  };

  const deleteClient = async (id: string) => {
    // Delete all related charges
    const clientCharges = charges.filter(c => c.clienteId === id);
    for (const charge of clientCharges) {
      await storageService.deleteCharge(charge.id);
    }
    setCharges(prev => prev.filter(c => c.clienteId !== id));

    // Delete all related payments
    const clientPayments = payments.filter(p => p.clienteId === id);
    for (const payment of clientPayments) {
      await storageService.deletePayment(payment.id);
    }
    setPayments(prev => prev.filter(p => p.clienteId !== id));

    // Delete the client
    await storageService.deleteClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // Charge operations
  const markChargeAsPaid = async (chargeId: string) => {
    const charge = charges.find(c => c.id === chargeId);
    if (!charge) return;

    // Update charge status
    const updatedCharge: Charge = {
      ...charge,
      status: 'pago',
      dataPagamento: new Date().toISOString(),
    };
    await storageService.saveCharge(updatedCharge);
    setCharges(prev => prev.map(c => c.id === chargeId ? updatedCharge : c));

    // Create payment record
    const payment: Payment = {
      id: Date.now().toString(),
      chargeId: charge.id,
      clienteId: charge.clienteId,
      clienteNome: charge.clienteNome,
      valor: charge.valor,
      dataPagamento: new Date().toISOString(),
    };
    await storageService.savePayment(payment);
    setPayments(prev => [...prev, payment]);

    // Update client financial status
    const client = clients.find(c => c.id === charge.clienteId);
    if (client) {
      const updatedClient = updateClientFinancialStatus(client, [...payments, payment]);
      await storageService.saveClient(updatedClient);
      setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
    }
  };

  const value: AppContextType = {
    // Data
    clients,
    charges,
    loans,
    payments,
    metrics,
    dashboardData,
    
    // Loading state
    isLoading,
    
    // Setters for backup/restore
    setClients,
    setCharges,
    setLoans,
    setPayments,
    
    // Client operations
    addClient,
    updateClient,
    deleteClient,
    
    // Charge operations
    markChargeAsPaid,
    
    // Refresh data
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
