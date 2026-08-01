import { ErrorBoundary } from "@/components/shared/error-boundary";
import { AppRoutes } from "./router";

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
