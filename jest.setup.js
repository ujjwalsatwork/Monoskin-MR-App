/* eslint-env jest */

// Native modules the security layer depends on. Jest runs outside a native binary,
// so TurboModuleRegistry.getEnforcing throws on import unless they are stubbed.
//
// The file module is backed by an in-memory map rather than a bare jest.fn(), so
// tests can exercise the real key-generate-then-reload path in `secureStorage`
// instead of only asserting that a mock was called.
jest.mock('@dr.pogodin/react-native-fs', () => {
  const files = new Map();
  // Remote responses keyed by URL, so a test can make a download return a real
  // file, an error page, or a non-200 status: { status, body }.
  const remote = new Map();
  const need = (path) => {
    if (!files.has(path)) { throw new Error(`ENOENT: ${path}`); }
    return files.get(path);
  };
  return {
    __esModule: true,
    LibraryDirectoryPath: '/mock/Library',
    DocumentDirectoryPath: '/mock/Documents',
    CachesDirectoryPath: '/mock/Caches',
    TemporaryDirectoryPath: '/mock/tmp',
    exists: jest.fn(async (path) => files.has(path)),
    readFile: jest.fn(async (path) => need(path)),
    read: jest.fn(async (path, length = Infinity, position = 0) =>
      need(path).slice(position, position + length)),
    stat: jest.fn(async (path) => ({ size: need(path).length, isFile: () => true })),
    writeFile: jest.fn(async (path, contents) => { files.set(path, contents); }),
    copyFile: jest.fn(async (from, into) => { files.set(into, need(from)); }),
    unlink: jest.fn(async (path) => { files.delete(path); }),
    mkdir: jest.fn(async () => undefined),
    readDir: jest.fn(async () => []),
    downloadFile: jest.fn(({ fromUrl, toFile }) => {
      const response = remote.get(fromUrl);
      if (response && response.body != null) { files.set(toFile, response.body); }
      return { promise: Promise.resolve({ statusCode: response ? response.status : 200 }) };
    }),
    __files: files,
    __remote: remote,
  };
});

// The polyfill is a native no-op here: Node 19+ already exposes a WebCrypto
// `globalThis.crypto.getRandomValues`, which is what crypto-js looks for.
jest.mock('react-native-get-random-values', () => ({}));

// AsyncStorage ships ESM only and is what the encrypted layer writes through.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
      setItem: jest.fn(async (k, v) => { store.set(k, v); }),
      removeItem: jest.fn(async (k) => { store.delete(k); }),
      clear: jest.fn(async () => { store.clear(); }),
      __store: store,
    },
  };
});

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getTags: jest.fn(async () => 'release-keys'),
    getUniqueId: jest.fn(async () => 'mock-device-id'),
    getDeviceName: jest.fn(async () => 'Mock Device'),
  },
  getTags: jest.fn(async () => 'release-keys'),
}));
