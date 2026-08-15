'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              // Never retry auth or validation failures — they will not fix themselves.
              const code = (error as { code?: string })?.code;
              if (code && ['UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION_ERROR', 'NOT_PAIRED'].includes(code)) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
