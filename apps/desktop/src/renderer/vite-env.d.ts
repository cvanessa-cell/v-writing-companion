import type { VApi } from '../preload/index';

declare global {
  interface Window {
    v: VApi;
  }
}

export {};
