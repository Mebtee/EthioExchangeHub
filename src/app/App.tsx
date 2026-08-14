import { AppErrorBoundary } from "@/components/shared/error-boundary";
import { AppRoutes } from "./router";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoutes />
    </AppErrorBoundary>
  );
}
