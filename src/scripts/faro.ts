import { initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

declare global {
  interface Window {
    faroConfig: {
      url: string;
      app: {
        name: string;
        version: string;
        environment: string;
      };
      sessionTracking: {
        samplingRate: number;
        persistent: boolean;
      };
    };
  }
}

// Initialize Faro when the script loads
if (typeof window !== 'undefined' && window.faroConfig) {
  initializeFaro({
    ...window.faroConfig,
    instrumentations: [
      new TracingInstrumentation(),
    ],
  });
}