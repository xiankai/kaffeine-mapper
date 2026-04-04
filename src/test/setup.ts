import '@testing-library/jest-dom';

// Mock browser APIs that may not be available in test environment
Object.defineProperty(window, 'alert', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'FileReader', {
  value: class FileReader {
    result: string | null = null;
    readAsText = jest.fn().mockImplementation((file: File) => {
      // Simulate async file reading
      setTimeout(() => {
        this.result = 'mock file content';
        if (this.onload) {
          this.onload({ target: { result: this.result } } as any);
        }
      }, 0);
    });
    onload: ((event: any) => void) | null = null;
  },
  writable: true,
});

// Mock Date.now for consistent test results
let mockDate = 1609459200000; // 2021-01-01 00:00:00 UTC
Object.defineProperty(global.Date, 'now', {
  value: jest.fn(() => mockDate),
  writable: true,
});

// Helper to set mock date
export const setMockDate = (timestamp: number) => {
  mockDate = timestamp;
};

// Helper to reset mock date
export const resetMockDate = () => {
  mockDate = 1609459200000;
};