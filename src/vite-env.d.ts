/// <reference types="vite/client" />

declare global {
  interface Window {
    __debug?: {
      resetFirstRunTour?: () => Promise<void>;
      [key: string]: unknown;
    };
  }
}

export {};
