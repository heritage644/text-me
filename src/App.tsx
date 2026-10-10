import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { LiveRegion } from "./components/ui/live-region";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./features/auth/auth-provider";
import { queryClient } from "./lib/query-client";
import { RealtimeProvider } from "./realtime/realtime-provider";
import { AppRoutes } from "./routes/app-routes";
import { Splash } from "./routes/splash";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <Suspense fallback={<Splash />}>
            <AppRoutes />
          </Suspense>
        </RealtimeProvider>
      </AuthProvider>
      <Toaster />
      <LiveRegion />
    </QueryClientProvider>
  );
}
