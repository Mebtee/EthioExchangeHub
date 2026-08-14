import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
  /** Optional label rendered as the fallback heading. */
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/**
 * Catches render errors anywhere below and shows a friendly, on-brand fallback
 * instead of unmounting the whole app. Resets when the user retries.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the error visible for debugging without breaking the UI.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              {this.props.title ?? this.props.t("common.errorTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.props.t("common.errorMessage")}
            </p>
            {import.meta.env.DEV && this.state.message && (
              <p className="mt-3 rounded-lg bg-surface-low px-3 py-2 text-xs text-muted-foreground break-all">
                {this.state.message}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {this.props.t("common.tryAgain")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppErrorBoundary = withTranslation()(ErrorBoundary);
