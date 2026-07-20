import React from "react";
import { logger, getDebugMode } from "../utils/logger";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // eslint-disable-next-line no-unused-vars
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    logger.error("React Component Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (getDebugMode()) {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-gray-800">
            <div className="w-full max-w-3xl rounded-lg bg-white p-8 shadow-lg">
              <h1 className="mb-4 text-2xl font-bold text-red-600">Application Error (Debug Mode)</h1>
              <p className="mb-4">The application crashed due to an unhandled exception.</p>
              
              <div className="mb-6 overflow-auto rounded bg-red-50 p-4 text-sm text-red-800">
                <strong>{this.state.error && this.state.error.toString()}</strong>
                <br />
                <pre className="mt-2 whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={this.handleReload}
                  className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="rounded bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
            <div className="mt-4 text-sm font-bold text-gray-400">[MH MINI MART — FRONTEND]</div>
          </div>
        );
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-gray-800">
          <div className="w-full max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-800">This page could not be displayed.</h1>
            <p className="mb-8 text-gray-600">We're sorry, but something went wrong while trying to display this page.</p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={this.handleReload}
                className="rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Reload
              </button>
              <button
                onClick={this.handleGoHome}
                className="rounded border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Return Home
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
