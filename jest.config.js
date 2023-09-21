/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  collectCoverage: true,
  coverageReporters: ['clover', 'text'],
  preset: 'ts-jest',
  testEnvironment: 'node',
};
