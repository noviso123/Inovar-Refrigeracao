import React, { useState, useEffect } from 'react';
import { Button } from '../components/Botao';
import { Usuario } from '../types';
import { authService } from '../services/authService';
import { BotaoGooglePersonalizado } from '../components/BotaoGooglePersonalizado';
import { LogIn, Key, Mail, AlertTriangle, Loader2, Snowflake } from 'lucide-react';
import { API_BASE } from '../services/api';

interface LoginProps {
  onLogin: (user: Usuario) => void;
  onRegisterCompanyClick: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegisterCompanyClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(false);

  // Warm-up: acordar backend Vercel enquanto usuário vê tela de login
  useEffect(() => {
    const warmupBackend = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
        if (response.ok) {
          setBackendReady(true);
        }
      } catch {
        // Backend pode estar acordando, tenta novamente em 3s
        setTimeout(warmupBackend, 3000);
      }
    };
    warmupBackend();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.login(email, password);
      const user = data.usuario;

      const company = (user as any).empresa || (user as any).empresas;
      if (company) {
        if (company.status === 'pendente') {
          setError('Seu cadastro de empresa está em análise. Aguarde a aprovação.');
          setIsLoading(false);
          return;
        }
        if (company.status === 'bloqueado' || company.status === 'inativo') {
          setError('Sua conta de empresa está suspensa ou bloqueada.');
          setIsLoading(false);
          return;
        }
      }

      onLogin(user);
    } catch (err: any) {
      console.error('Login Error:', err);
      let errorMsg = 'Erro ao conectar ao servidor.';

      if (err.response?.data) {
        // Handle { error: ... } or { code: ..., message: ... } directly
        const data = err.response.data;
        if (data.error) {
          errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error);
        } else if (data.message) {
          errorMsg = String(data.message);
        } else {
          errorMsg = typeof data === 'object' ? JSON.stringify(data) : String(data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.googleLogin(response.access_token);
      const user = data.usuario;

      const company = (user as any).empresa || (user as any).empresas;
      if (company) {
        if (company.status === 'pendente') {
          setError('Seu cadastro de empresa está em análise.');
          setIsLoading(false);
          return;
        }
        if (company.status === 'bloqueado' || company.status === 'inativo') {
          setError('Sua conta de empresa está suspensa.');
          setIsLoading(false);
          return;
        }
      }

      onLogin(user);
    } catch (err: any) {
      console.error('Google Login Error:', err);
      let errorMsg = 'Erro ao fazer login com Google.';

      if (err.response?.data) {
        const data = err.response.data;
        if (data.error) {
          errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error);
        } else if (data.message) {
          errorMsg = String(data.message);
        } else {
          errorMsg = typeof data === 'object' ? JSON.stringify(data) : String(data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Erro ao conectar com Google. Tente novamente.');
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-gradient-to-br from-brand-50 via-white to-surface-100">
      {/* Header decorativo */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        {/* Logo e título */}
        <div className="text-center mb-8 animate-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30 mb-4">
            <Snowflake className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-800">
            Inovar Refrigeração
          </h1>
          <p className="mt-2 text-surface-500">
            Sistema de Gestão de Serviços
          </p>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-sm animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="card p-6 sm:p-8">
            {/* Login com Google */}
            <div className="mb-6">
              <BotaoGooglePersonalizado
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="Entrar com Google"
              />
            </div>

            {/* Divisor */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-surface-400">
                  ou entre com email
                </span>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-surface-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="input pl-11"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-surface-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="input pl-11"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 animate-in">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botão de login */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
              </button>
            </form>

            {/* Link para registro */}
            <div className="mt-6 pt-6 border-t border-surface-100">
              <p className="text-center text-sm text-surface-500 mb-4">
                Não tem uma conta?
              </p>
              <button
                onClick={onRegisterCompanyClick}
                disabled={isLoading}
                className="btn btn-secondary w-full"
              >
                Criar Conta (Empresa)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-surface-400 animate-in" style={{ animationDelay: '0.2s' }}>
          © 2024 Inovar Refrigeração. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
