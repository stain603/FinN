import AsyncStorage from '@react-native-async-storage/async-storage';

// User interface
export interface User {
  id: string;
  nome: string;
  pinHash: string;
  createdAt: string;
  updatedAt: string;
}

// Storage schema for future migrations
export interface AuthStorageSchema {
  schemaVersion: number;
  user: User | null;
}

const STORAGE_KEY = '@finbolso_auth';
const SCHEMA_VERSION = 1;

/**
 * Simple SHA-256 hash function for PIN security
 * Uses Web Crypto API which is available in React Native
 */
async function hashPin(pin: string): Promise<string> {
  try {
    // Encode the PIN as UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    
    // Use Web Crypto API to hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    // Fallback to simple hash if Web Crypto is not available
    console.warn('Web Crypto not available, using fallback hash');
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Get the authentication storage data
 */
async function getStorage(): Promise<AuthStorageSchema> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue) {
      const data = JSON.parse(jsonValue) as AuthStorageSchema;
      
      // Handle schema migrations if needed
      if (data.schemaVersion !== SCHEMA_VERSION) {
        // Future migration logic would go here
        data.schemaVersion = SCHEMA_VERSION;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      
      return data;
    }
  } catch (error) {
    console.error('Error reading auth storage:', error);
  }
  
  // Return default schema if storage is empty or corrupted
  return {
    schemaVersion: SCHEMA_VERSION,
    user: null,
  };
}

/**
 * Save authentication storage data
 */
async function saveStorage(data: AuthStorageSchema): Promise<void> {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving auth storage:', error);
    throw new Error('Failed to save authentication data');
  }
}

/**
 * Check if a user exists in storage
 */
export async function getUser(): Promise<User | null> {
  try {
    const storage = await getStorage();
    return storage.user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Create a new user with name and PIN
 */
export async function createUser(nome: string, pin: string): Promise<User> {
  // Validate inputs
  if (!nome || nome.trim().length === 0) {
    throw new Error('Name is required');
  }
  
  if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  
  // Validate weak PINs
  const weakPins = ['1234', '1111', '0000', '1212', '7777'];
  if (weakPins.includes(pin)) {
    throw new Error('PIN is too weak. Please choose a more secure PIN.');
  }
  
  try {
    // Generate hash for PIN
    const pinHash = await hashPin(pin);
    
    // Create user object
    const user: User = {
      id: Date.now().toString(),
      nome: nome.trim(),
      pinHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to storage
    const storage = await getStorage();
    storage.user = user;
    await saveStorage(storage);
    
    return user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create user');
  }
}

/**
 * Validate PIN against stored hash
 */
export async function validatePin(pin: string): Promise<boolean> {
  try {
    const storage = await getStorage();
    
    if (!storage.user) {
      throw new Error('No user found');
    }
    
    const inputHash = await hashPin(pin);
    return inputHash === storage.user.pinHash;
  } catch (error) {
    console.error('Error validating PIN:', error);
    return false;
  }
}

/**
 * Update user PIN
 */
export async function updatePin(currentPin: string, newPin: string): Promise<void> {
  // Validate current PIN
  const isValid = await validatePin(currentPin);
  if (!isValid) {
    throw new Error('Current PIN is incorrect');
  }
  
  // Validate new PIN
  if (!newPin || newPin.length !== 4 || !/^\d+$/.test(newPin)) {
    throw new Error('New PIN must be exactly 4 digits');
  }
  
  // Validate weak PINs
  const weakPins = ['1234', '1111', '0000', '1212', '7777'];
  if (weakPins.includes(newPin)) {
    throw new Error('PIN is too weak. Please choose a more secure PIN.');
  }
  
  try {
    const storage = await getStorage();
    
    if (!storage.user) {
      throw new Error('No user found');
    }
    
    // Generate new hash
    const newPinHash = await hashPin(newPin);
    
    // Update user
    storage.user.pinHash = newPinHash;
    storage.user.updatedAt = new Date().toISOString();
    
    await saveStorage(storage);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update PIN');
  }
}

/**
 * Update user name
 */
export async function updateName(newName: string): Promise<void> {
  if (!newName || newName.trim().length === 0) {
    throw new Error('Name cannot be empty');
  }
  
  try {
    const storage = await getStorage();
    
    if (!storage.user) {
      throw new Error('No user found');
    }
    
    // Update user
    storage.user.nome = newName.trim();
    storage.user.updatedAt = new Date().toISOString();
    
    await saveStorage(storage);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update name');
  }
}

/**
 * Logout (clears session but keeps user data)
 * This is handled by AuthContext, not storage
 */
export async function logout(): Promise<void> {
  // Session management is handled by AuthContext
  // This function is kept for future use if needed
  return;
}

/**
 * Delete user account (for testing/reset purposes)
 */
export async function deleteUser(): Promise<void> {
  try {
    const storage = await getStorage();
    storage.user = null;
    await saveStorage(storage);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}
