import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Charge, Loan, Payment } from '../types';

const STORAGE_KEYS = {
  CLIENTS: '@finbolso_clients',
  CHARGES: '@finbolso_charges',
  LOANS: '@finbolso_loans',
  PAYMENTS: '@finbolso_payments',
};

// Generic storage helpers
const getItem = async <T>(key: string): Promise<T[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return [];
  }
};

const setItem = async <T>(key: string, value: T[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
};

// Client operations
export const getClients = async (): Promise<Client[]> => {
  return getItem<Client>(STORAGE_KEYS.CLIENTS);
};

export const saveClient = async (client: Client): Promise<void> => {
  const clients = await getClients();
  const index = clients.findIndex(c => c.id === client.id);
  
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  
  await setItem(STORAGE_KEYS.CLIENTS, clients);
};

export const deleteClient = async (id: string): Promise<void> => {
  const clients = await getClients();
  const filtered = clients.filter(c => c.id !== id);
  await setItem(STORAGE_KEYS.CLIENTS, filtered);
};

// Charge operations
export const getCharges = async (): Promise<Charge[]> => {
  return getItem<Charge>(STORAGE_KEYS.CHARGES);
};

export const saveCharge = async (charge: Charge): Promise<void> => {
  const charges = await getCharges();
  const index = charges.findIndex(c => c.id === charge.id);
  
  if (index >= 0) {
    charges[index] = charge;
  } else {
    charges.push(charge);
  }
  
  await setItem(STORAGE_KEYS.CHARGES, charges);
};

export const deleteCharge = async (id: string): Promise<void> => {
  const charges = await getCharges();
  const filtered = charges.filter(c => c.id !== id);
  await setItem(STORAGE_KEYS.CHARGES, filtered);
};

// Loan operations
export const getLoans = async (): Promise<Loan[]> => {
  return getItem<Loan>(STORAGE_KEYS.LOANS);
};

export const saveLoan = async (loan: Loan): Promise<void> => {
  const loans = await getLoans();
  const index = loans.findIndex(l => l.id === loan.id);
  
  if (index >= 0) {
    loans[index] = loan;
  } else {
    loans.push(loan);
  }
  
  await setItem(STORAGE_KEYS.LOANS, loans);
};

export const deleteLoan = async (id: string): Promise<void> => {
  const loans = await getLoans();
  const filtered = loans.filter(l => l.id !== id);
  await setItem(STORAGE_KEYS.LOANS, filtered);
};

// Payment operations
export const getPayments = async (): Promise<Payment[]> => {
  return getItem<Payment>(STORAGE_KEYS.PAYMENTS);
};

export const savePayment = async (payment: Payment): Promise<void> => {
  const payments = await getPayments();
  const index = payments.findIndex(p => p.id === payment.id);
  
  if (index >= 0) {
    payments[index] = payment;
  } else {
    payments.push(payment);
  }
  
  await setItem(STORAGE_KEYS.PAYMENTS, payments);
};

export const deletePayment = async (id: string): Promise<void> => {
  const payments = await getPayments();
  const filtered = payments.filter(p => p.id !== id);
  await setItem(STORAGE_KEYS.PAYMENTS, filtered);
};

// Clear all data (for testing/reset)
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.CHARGES,
      STORAGE_KEYS.LOANS,
      STORAGE_KEYS.PAYMENTS,
    ]);
  } catch (e) {
    console.error('Error clearing data:', e);
  }
};
