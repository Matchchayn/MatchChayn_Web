import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong. Please try again later.';
      
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes('Missing or insufficient permissions')) {
            errorMessage = 'You do not have permission to perform this action or access this data.';
          }
        }
      } catch (e) {
        // Not a JSON error message, use default
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050512] p-6">
          <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[40px] p-10 shadow-2xl space-y-8 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">Oops!</h1>
              <p className="text-gray-400 font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
