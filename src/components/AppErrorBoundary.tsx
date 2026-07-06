import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EliteTee render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="app-fallback">
        <div className="app-fallback-inner">
          <p className="app-fallback-eyebrow">EliteTee</p>
          <h1>Something went wrong loading this page.</h1>
          <p>
            The public site is still available. If you were signing in, member login may be
            temporarily unavailable.
          </p>
          <a className="app-fallback-btn" href="/">
            Return to homepage
          </a>
        </div>
      </div>
    );
  }
}
