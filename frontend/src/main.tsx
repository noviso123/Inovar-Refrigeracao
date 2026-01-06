import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = '95293049762-1sccub9ao7nkaki5oj3opjbph56gelr7.apps.googleusercontent.com';

// Error Boundary to catch runtime errors and display them instead of a white screen
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Uncaught error:", error, errorInfo);

        // Auto-reload on dynamic import failure (stale cache after deployment)
        const isDynamicImportError =
            error?.message?.includes('dynamically imported module') ||
            error?.message?.includes('Failed to fetch') ||
            error?.message?.includes('Loading chunk');

        const hasReloadedRecently = sessionStorage.getItem('errorBoundaryReloaded');

        if (isDynamicImportError && !hasReloadedRecently) {
            sessionStorage.setItem('errorBoundaryReloaded', 'true');
            // Force hard reload to bypass cache
            window.location.reload();
        }
    }

    render() {
        if (this.state.hasError) {
            // Clear the reload flag so future genuine errors show
            sessionStorage.removeItem('errorBoundaryReloaded');

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                    <div className="bg-white p-6 rounded shadow-md max-w-lg w-full">
                        <h1 className="text-xl font-bold text-red-600 mb-4">Algo deu errado.</h1>
                        <p className="text-gray-700 mb-2">Ocorreu um erro crítico ao renderizar a aplicação.</p>
                        <pre className="bg-gray-100 p-3 rounded text-xs text-red-800 overflow-auto border border-red-200 max-h-40">
                            {this.state.error?.toString()}
                        </pre>
                        <button
                            onClick={() => {
                                // Clear cache and reload
                                caches.keys().then(names => {
                                    names.forEach(name => caches.delete(name));
                                });
                                window.location.reload();
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}


const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <QueryClientProvider client={queryClient}>
                    <HashRouter>
                        <App />
                    </HashRouter>
                </QueryClientProvider>
            </GoogleOAuthProvider>
        </ErrorBoundary>
    </React.StrictMode>
);

