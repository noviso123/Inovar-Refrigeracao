import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    private retryCount = 0;
    private maxRetries = 2;

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Auto-recovery for dynamic import failures (chunk loading errors)
        const isDynamicImportError =
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Loading chunk') ||
            error.message.includes('Loading CSS chunk') ||
            error.name === 'ChunkLoadError';

        if (isDynamicImportError && this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`Attempting auto-recovery (attempt ${this.retryCount}/${this.maxRetries})...`);

            // Clear the error state and reload the page after a short delay
            setTimeout(() => {
                // Clear all caches and reload
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => caches.delete(name));
                    });
                }
                window.location.reload();
            }, 500);
        }
    }

    handleReload = () => {
        // Force a hard reload, bypassing cache
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const isDynamicImportError = this.state.error?.message?.includes('dynamically imported module');

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">
                            Algo deu errado.
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {isDynamicImportError
                                ? 'O aplicativo foi atualizado. Por favor, recarregue a página.'
                                : 'Por favor, recarregue a página.'}
                        </p>

                        <div className="bg-gray-100 rounded-lg p-3 mb-6 text-left overflow-x-auto">
                            <code className="text-xs text-red-600 break-all">
                                {this.state.error?.message || 'Erro desconhecido'}
                            </code>
                        </div>

                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Recarregar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
