'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { persistQueryCache, restoreQueryCache } from '@/lib/query-cache';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      });
    restoreQueryCache(client);
    return client;
  });

  useEffect(() => {
    let persistTimer: number | undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(() => persistQueryCache(queryClient), 250);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(persistTimer);
      persistQueryCache(queryClient);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
