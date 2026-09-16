module.exports = {
  preset: 'react-native',

  // `secureStorage` pulls in the platform CSPRNG polyfill and the file module, both
  // of which ship as ESM. The react-native preset ignores node_modules by default,
  // so without these entries every suite that reaches the storage layer fails to
  // parse. Listed explicitly rather than transforming all of node_modules, which
  // would slow the run down for no benefit.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?'
      + '|react-native-get-random-values'
      + '|@dr\\.pogodin/react-native-fs'
      + ')/)',
  ],

  setupFiles: ['<rootDir>/jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
