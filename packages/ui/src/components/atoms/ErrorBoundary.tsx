import React, { Component, ErrorInfo, ReactNode } from "react";
import { cn } from "@cham-lang/shared/utils";
import { Button } from "./Button";

/**
 * Props for the fallback component when an error occurs
 */
export interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom fallback component to render when an error occurs
   */
  fallback?: React.ComponentType<FallbackProps>;
  /**
   * Callback fired when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Callback fired when the error boundary is reset
   */
  onReset?: () => void;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default fallback component
 */
function DefaultFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[200px] p-6",
        "bg-red-50 dark:bg-red-900/20",
        "border border-red-200 dark:border-red-800 rounded-lg",
      )}
    >
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg
          className="w-12 h-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-red-600 dark:text-red-400 mb-4 text-center max-w-md">
        {error.message}
      </p>
      <Button variant="danger" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

/**
 * Error boundary component for catching and handling React errors
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }

  static displayName = "ErrorBoundary";
}
