/**
 * Auth flow unit tests — validates PIN, persistence, and account switching logic.
 * Run: npm run test:auth
 */

type StoredUser = {
  id: string;
  nome: string;
  pinHash: string;
  createdAt: string;
  updatedAt: string;
};

type AuthStorageSchema = {
  schemaVersion: number;
  user: StoredUser | null;
};

const STORAGE_KEY = '@finbolso_auth_test';
const memoryStore = new Map<string, string>();

const AsyncStorageMock = {
  async getItem(key: string) {
    return memoryStore.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    memoryStore.set(key, value);
  },
  async removeItem(key: string) {
    memoryStore.delete(key);
  },
};

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getStorage(): Promise<AuthStorageSchema> {
  const jsonValue = await AsyncStorageMock.getItem(STORAGE_KEY);
  if (jsonValue) {
    return JSON.parse(jsonValue) as AuthStorageSchema;
  }
  return { schemaVersion: 1, user: null };
}

async function saveStorage(data: AuthStorageSchema): Promise<void> {
  await AsyncStorageMock.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function createUser(nome: string, pin: string): Promise<StoredUser> {
  const pinHash = await hashPin(pin);
  const user: StoredUser = {
    id: Date.now().toString(),
    nome: nome.trim(),
    pinHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const storage = await getStorage();
  storage.user = user;
  await saveStorage(storage);
  return user;
}

async function getUser(): Promise<StoredUser | null> {
  const storage = await getStorage();
  return storage.user;
}

async function validatePin(pin: string): Promise<boolean> {
  const storage = await getStorage();
  if (!storage.user) return false;
  const inputHash = await hashPin(pin);
  return inputHash === storage.user.pinHash;
}

async function deleteUser(): Promise<void> {
  const storage = await getStorage();
  storage.user = null;
  await saveStorage(storage);
}

type SessionState = {
  user: StoredUser | null;
  isAuthenticated: boolean;
};

function createSession(): SessionState {
  return { user: null, isAuthenticated: false };
}

async function loadSession(session: SessionState): Promise<void> {
  session.user = await getUser();
  session.isAuthenticated = false;
}

async function login(session: SessionState, pin: string): Promise<boolean> {
  const isValid = await validatePin(pin);
  if (isValid) {
    session.isAuthenticated = true;
    return true;
  }
  return false;
}

async function logout(session: SessionState): Promise<void> {
  session.isAuthenticated = false;
}

async function switchAccount(session: SessionState): Promise<void> {
  session.isAuthenticated = false;
  await deleteUser();
  session.user = null;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Starting Auth Flow Test Suite\n');

  memoryStore.clear();

  // Scenario 1: Correct PIN
  console.log('📌 TEST 1: PIN correto');
  const session1 = createSession();
  await createUser('Erick', '5678');
  await loadSession(session1);
  assert(session1.user !== null, 'Usuário deve existir após cadastro');
  assert(!session1.isAuthenticated, 'Sessão não deve estar autenticada antes do PIN');
  const loginOk = await login(session1, '5678');
  assert(loginOk === true, 'PIN correto deve autenticar');
  assert(session1.isAuthenticated === true, 'Sessão deve estar autenticada');
  console.log('✅ PIN correto — OK\n');

  // Scenario 2: Wrong PIN — session stays locked, user can retry
  console.log('📌 TEST 2: PIN incorreto');
  await logout(session1);
  assert(session1.isAuthenticated === false, 'Logout deve encerrar sessão');
  assert(session1.user !== null, 'Usuário deve permanecer após logout');
  const loginFail = await login(session1, '0000');
  assert(loginFail === false, 'PIN incorreto deve falhar');
  assert(session1.isAuthenticated === false, 'Sessão deve permanecer bloqueada');
  const retryOk = await login(session1, '5678');
  assert(retryOk === true, 'Nova tentativa com PIN correto deve funcionar');
  console.log('✅ PIN incorreto + nova tentativa — OK\n');

  // Scenario 3: Switch account
  console.log('📌 TEST 3: Trocar conta');
  await switchAccount(session1);
  assert(session1.user === null, 'Usuário ativo deve ser removido');
  assert(session1.isAuthenticated === false, 'Sessão deve estar encerrada');
  const storedAfterSwitch = await getUser();
  assert(storedAfterSwitch === null, 'AsyncStorage deve estar sem usuário');
  console.log('✅ Trocar conta — OK\n');

  // Scenario 4: App reopen — user exists, only PIN required
  console.log('📌 TEST 4: Reabertura do app');
  await createUser('Maria', '9876');
  const session4 = createSession();
  await loadSession(session4);
  assert(session4.user?.nome === 'Maria', 'Usuário deve ser restaurado do storage');
  assert(!session4.isAuthenticated, 'Reabertura deve exigir PIN');
  const reopenLogin = await login(session4, '9876');
  assert(reopenLogin === true, 'PIN correto na reabertura deve autenticar');
  console.log('✅ Reabertura do app — OK\n');

  // Scenario 4b: No user — full auth required
  console.log('📌 TEST 5: Sem sessão — autenticação completa');
  await switchAccount(session4);
  const session5 = createSession();
  await loadSession(session5);
  assert(session5.user === null, 'Sem usuário no storage deve exibir cadastro');
  console.log('✅ Sem sessão — OK\n');

  console.log('='.repeat(60));
  console.log('✅ ALL AUTH TESTS PASSED');
  console.log('='.repeat(60));
}

runTests().catch((error: Error) => {
  console.error('❌ TEST FAILED:', error.message);
  throw error;
});
