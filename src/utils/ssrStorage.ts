/**
 * Storage adapter safe for Expo static web export (Node SSR on Vercel).
 * Avoids accessing `window` / AsyncStorage during server-side rendering.
 */
export function createSsrSafeStorage() {
  const isBrowser = typeof window !== 'undefined';

  return {
    getItem: async (key: string): Promise<string | null> => {
      if (!isBrowser) return null;
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (!isBrowser) return;
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      if (!isBrowser) return;
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem(key);
    },
  };
}

export const isBrowserEnvironment = (): boolean => typeof window !== 'undefined';
