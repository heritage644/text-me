import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { errorMessage, isApiError } from "../api/errors";
import { toast } from "../components/ui/toast-store";

declare module "@tanstack/react-query" {
  interface Register {
    /** `silent: true` → the caller shows the error itself (forms, inline states). */
    mutationMeta: { silent?: boolean };
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Initial-load failures render an inline error state; only background
    // refetch failures (when stale data is still on screen) need a toast.
    onError: (error, query) => {
      if (query.state.data !== undefined) toast.error(errorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      if (isApiError(error) && error.hasFieldErrors) return;
      toast.error(errorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => (isApiError(error) ? error.isRetryable && failureCount < 2 : failureCount < 2),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: false },
  },
});
