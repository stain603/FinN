import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Client, Charge, Loan, Payment, FinancialMetrics, DashboardData } from '../types';
import * as storageService from '../services/storageService';
import { generateId } from '../services/storageService';
import { useAuth } from './AuthContext';
import { calculateAllMetrics, getDashboardData, calculateContractDetails, updateClientFinancialStatus, generateChargesForClients, migrateClientData, isContractActive } from '../services/financialMetrics';
import { mapSupabaseError } from '../utils/supabaseErrors';

interface AppContextType {
  clients: Client[];
  charges: Charge[];
  loans: Loan[];
  payments: Payment[];
  metrics: FinancialMetrics;
  dashboardData: DashboardData;
  isLoading: boolean;
  loadError: string | null;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setCharges: React.Dispatch<React.SetStateAction<Charge[]>>;
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  markChargeAsPaid: (chargeId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const chargeDueDateKey = (dateString: string) => dateString.split('T')[0];

const syncClientsWithPayments = (clients: Client[], payments: Payment[]): Client[] =>
  clients.map(client => updateClientFinancialStatus(client, payments));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      await storageService.migrateLocalDataIfNeeded();

      const [loadedClients, loadedCharges, loadedLoans, loadedPayments] = await Promise.all([
        storageService.getClients(),
        storageService.getCharges(),
        storageService.getLoans(),
        storageService.getPayments(),
      ]);

      const migratedClients = loadedClients.map(migrateClientData);
      const syncedClients = syncClientsWithPayments(migratedClients, loadedPayments);

      setClients(syncedClients);
      setCharges(loadedCharges);
      setLoans(loadedLoans);
      setPayments(loadedPayments);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadError(mapSupabaseError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setClients([]);
      setCharges([]);
      setLoans([]);
      setPayments([]);
      setLoadError(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, loadData]);

  useEffect(() => {
    if (!isLoading) {
      setMetrics(calculateAllMetrics(clients, charges, loans, payments));
      setDashboardData(getDashboardData(charges, payments, clients));
    }
  }, [clients, charges, loans, payments, isLoading]);

  useEffect(() => {
    if (isLoading || clients.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const generated = generateChargesForClients(clients);
        if (generated.length === 0) {
          return;
        }

        const existingCharges = await storageService.getCharges();
        const existingKeys = new Set(
          existingCharges.map(
            charge => `${charge.clienteId}:${chargeDueDateKey(charge.dataVencimento)}`
          )
        );

        const toCreate = generated.filter(
          charge =>
            !existingKeys.has(`${charge.clienteId}:${chargeDueDateKey(charge.dataVencimento)}`)
        );

        for (const charge of toCreate) {
          if (cancelled) {
            return;
          }
          await storageService.saveCharge(charge);
        }

        if (toCreate.length > 0 && !cancelled) {
          const refreshedCharges = await storageService.getCharges();
          setCharges(refreshedCharges);
        }
      } catch (error) {
        console.error('Error generating charges:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clients, isLoading]);

  const refreshData = async () => {
    await loadData();
  };

  const addClient = async (client: Client) => {
    try {
      const clientWithCalculations = calculateContractDetails({
        ...client,
        id: storageService.isValidUuid(client.id) ? client.id : generateId(),
      });

      await storageService.saveClient(clientWithCalculations);
      setClients(prev => [...prev, clientWithCalculations]);

      if (isContractActive(clientWithCalculations) && clientWithCalculations.proximoVencimento) {
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
        const savedCharges = await storageService.getCharges();
        const savedCharge = savedCharges.find(
          charge =>
            charge.clienteId === initialCharge.clienteId &&
            chargeDueDateKey(charge.dataVencimento) === chargeDueDateKey(initialCharge.dataVencimento)
        );
        setCharges(prev => [...prev, savedCharge ?? initialCharge]);
      }
    } catch (error) {
      throw new Error(mapSupabaseError(error));
    }
  };

  const updateClient = async (client: Client) => {
    try {
      const withDetails = calculateContractDetails(client);
      const clientWithUpdatedStatus = updateClientFinancialStatus(withDetails, payments);
      await storageService.saveClient(clientWithUpdatedStatus);
      setClients(prev => prev.map(c => (c.id === client.id ? clientWithUpdatedStatus : c)));
    } catch (error) {
      throw new Error(mapSupabaseError(error));
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const clientCharges = charges.filter(charge => charge.clienteId === id);
      for (const charge of clientCharges) {
        await storageService.deleteCharge(charge.id);
      }
      setCharges(prev => prev.filter(charge => charge.clienteId !== id));

      const clientPayments = payments.filter(payment => payment.clienteId === id);
      for (const payment of clientPayments) {
        await storageService.deletePayment(payment.id);
      }
      setPayments(prev => prev.filter(payment => payment.clienteId !== id));

      await storageService.deleteClient(id);
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (error) {
      throw new Error(mapSupabaseError(error));
    }
  };

  const markChargeAsPaid = async (chargeId: string) => {
    const charge = charges.find(item => item.id === chargeId);
    if (!charge) {
      throw new Error('Cobrança não encontrada.');
    }

    try {
      const updatedCharge: Charge = {
        ...charge,
        status: 'pago',
        dataPagamento: new Date().toISOString(),
      };

      await storageService.saveCharge(updatedCharge);

      const savedCharges = await storageService.getCharges();
      const persistedCharge =
        savedCharges.find(
          item =>
            item.clienteId === charge.clienteId &&
            chargeDueDateKey(item.dataVencimento) === chargeDueDateKey(charge.dataVencimento)
        ) ?? { ...updatedCharge, id: chargeId };

      setCharges(prev =>
        prev.map(item =>
          item.clienteId === charge.clienteId &&
          chargeDueDateKey(item.dataVencimento) === chargeDueDateKey(charge.dataVencimento)
            ? { ...updatedCharge, id: persistedCharge.id }
            : item
        )
      );

      const payment: Payment = {
        id: generateId(),
        chargeId: persistedCharge.id,
        clienteId: charge.clienteId,
        clienteNome: charge.clienteNome,
        valor: charge.valor,
        dataPagamento: new Date().toISOString(),
      };

      await storageService.savePayment(payment);
      const nextPayments = [...payments, payment];
      setPayments(nextPayments);

      const client = clients.find(item => item.id === charge.clienteId);
      if (client) {
        const updatedClient = updateClientFinancialStatus(client, nextPayments);
        await storageService.saveClient(updatedClient);
        setClients(prev => prev.map(item => (item.id === client.id ? updatedClient : item)));
      }
    } catch (error) {
      throw new Error(mapSupabaseError(error));
    }
  };

  const value: AppContextType = {
    clients,
    charges,
    loans,
    payments,
    metrics,
    dashboardData,
    isLoading,
    loadError,
    setClients,
    setCharges,
    setLoans,
    setPayments,
    addClient,
    updateClient,
    deleteClient,
    markChargeAsPaid,
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
