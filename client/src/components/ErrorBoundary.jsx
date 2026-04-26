import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ Error boundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="card max-w-2xl px-8 py-10 text-center">
            <div className="mb-4 text-5xl">💥</div>
            <h1 className="text-2xl font-bold text-slate-900">
              Something went wrong
            </h1>
            <p className="mt-3 text-slate-600">
              The application encountered an unexpected error.
            </p>

            {this.state.error && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Error Details
                </div>
                <div className="mt-2 overflow-auto text-sm text-red-600">
                  <code>{this.state.error.toString()}</code>
                </div>
                {this.state.errorInfo && (
                  <details className="mt-3 text-xs text-slate-600">
                    <summary className="cursor-pointer font-semibold">
                      Stack trace
                    </summary>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                className="btn-secondary"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
