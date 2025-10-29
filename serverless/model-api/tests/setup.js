// Test setup file
import { jest } from '@jest/globals';

// Global test setup
global.console = {
  ...console,
  // Uncomment to hide console logs during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock AWS SDK clients globally if needed
jest.setTimeout(10000);
