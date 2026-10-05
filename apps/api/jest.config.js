module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    './src/profile/profile.service.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
    './src/profile/profile.controller.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
    './src/profile/profile-migration.controller.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};
