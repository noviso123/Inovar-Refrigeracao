import React, { useState } from 'react';
import { Button } from '../components/Botao';
import { Endereco, User } from '../types';
import { Mail, Phone, Lock, FileText, ArrowLeft, MapPin, Search, Loader2, Briefcase, Building, AlertTriangle } from 'lucide-react';
import { maskCEP, maskPhone } from '../utils/formatadores';
import { fetchAddressByCEP } from '../services/servicoCep';
import { validarCNPJ, validarEmail } from '../utils/validadores';
import api from '../services/api';
import { useGoogleLogin } from '@react-oauth/google';


interface RegisterProps {
  onRegister: (userData: Omit<User, 'id' | 'role' | 'avatar' | 'active'>) => void;
  onBackToLogin: () => void;
}


export const CadastroEmpresa: React.FC<RegisterProps> = ({ onRegister, onBackToLogin }) => {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estado do Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [googlePrefilled, setGooglePrefilled] = useState(false);

  // Google Prefill Login
  const googlePrefill = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoadingGoogle(true);
      try {
        // Fetch user info from Google using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userInfo = await userInfoResponse.json();

        // Prefill email and optionally name
        if (userInfo.email) {
          setEmail(userInfo.email);
        }
        if (userInfo.name && !companyName) {
          setCompanyName(userInfo.name + ' - Empresa'); // Suggest company name based on user name
        }
        setGooglePrefilled(true);
        setError('');
      } catch (err) {
        setError('Erro ao carregar dados do Google.');
      } finally {
        setIsLoadingGoogle(false);
      }
    },
    onError: () => {
      setError('Erro ao conectar com Google.');
      setIsLoadingGoogle(false);
    },
    flow: 'implicit'
  });


  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    setCnpj(v);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCEP(e.target.value);
    setCep(value);

    if (value.length === 9) {
      setIsLoadingCep(true);
      setCepError('');

      const addressData = await fetchAddressByCEP(value);

      setIsLoadingCep(false);

      if (addressData) {
        setStreet(addressData.logradouro || '');
        setNeighborhood(addressData.bairro || '');
        setCity(addressData.cidade || '');
        setState(addressData.estado || '');

        setTimeout(() => {
          document.getElementById('address-number')?.focus();
        }, 100);
      } else {
        setCepError('CEP não encontrado.');
      }
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (!companyName || !email || !cnpj || !phone || !cep || !street || !number) {
      setError('Todos os campos obrigatórios devem ser preenchidos.');
      return;
    }

    if (!validarEmail(email)) {
      setError('E-mail inválido.');
      return;
    }

    if (!validarCNPJ(cnpj)) {
      setError('CNPJ inválido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const address: Endereco = {
        cep, logradouro: street, numero: number, complemento: complement, bairro: neighborhood, cidade: city, estado: state
      };

      const payload = {
        nome: companyName,
        email,
        cpf: cnpj, // Mapeando CNPJ para campo cpf por enquanto conforme servidor
        telefone: phone,
        endereco: address,
        senha: password
      };

      const response = await api.post('/auth/register-company', payload);
      const data = response.data;

      if (response.status >= 200 && response.status < 300) {
        setSuccessMessage(data.message || 'Cadastro realizado com sucesso!');
        setTimeout(() => {
          onBackToLogin();
        }, 3000);
      } else {
        setError(data.error || 'Erro ao realizar cadastro.');
      }

    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Erro de conexão com o servidor.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-50">
              <Briefcase className="h-6 w-6 text-brand-500" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Cadastro Recebido!</h3>
            <p className="mt-2 text-sm text-gray-500">{successMessage}</p>
            <div className="mt-6">
              <Button onClick={onBackToLogin} fullWidth>Voltar para Login</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <button
          onClick={onBackToLogin}
          className="flex items-center text-sm text-gray-500 hover:text-brand-600 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Login
        </button>
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-brand-500 rounded-lg flex items-center justify-center">
            <Briefcase className="text-white h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Cadastro de Empresa
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Cadastre sua empresa de refrigeração para gerenciar técnicos e serviços.
          <br />
          <span className="text-orange-600 font-bold">Sujeito a aprovação do Super Admin.</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-brand-500">

          {/* Google Prefill Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => googlePrefill()}
              disabled={isLoadingGoogle || googlePrefilled}
              className={`flex items-center justify-center w-full px-4 py-3 border shadow-sm text-sm font-medium rounded-md transition ${googlePrefilled
                ? 'bg-brand-50 border-brand-200 text-brand-600 cursor-default'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500'
                }`}
            >
              {isLoadingGoogle ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : googlePrefilled ? (
                <svg className="w-5 h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {isLoadingGoogle ? 'Carregando...' : googlePrefilled ? 'Dados preenchidos com Google!' : 'Preencher com Google'}
            </button>
            {!googlePrefilled && (
              <p className="mt-2 text-xs text-center text-gray-500">
                Use sua conta Google para preencher automaticamente seu email
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou preencha manualmente</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="Minha Refrigeração Ltda"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">E-mail Corporativo</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={cnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    className="bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    className="bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 flex items-center mb-4">
                <MapPin className="mr-2 h-4 w-4 text-gray-500" /> Endereço da Sede
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">CEP</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input type="text" required value={cep} onChange={handleCepChange} maxLength={9} className={`bg-white text-gray-900 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border ${cepError ? 'border-red-300' : ''}`} placeholder="00000-000" />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {isLoadingCep ? <Loader2 className="h-4 w-4 text-brand-500 animate-spin" /> : <Search className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700">Rua</label>
                  <input type="text" required value={street} onChange={(e) => setStreet(e.target.value)} className="mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 text-gray-900" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Número</label>
                  <input type="text" id="address-number" required value={number} onChange={(e) => setNumber(e.target.value)} className="bg-white text-gray-900 mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700">Complemento</label>
                  <input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} className="bg-white text-gray-900 mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                </div>
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Bairro</label>
                  <input type="text" required value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 text-gray-900" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Cidade</label>
                  <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 text-gray-900" readOnly />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">UF</label>
                  <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className="mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 text-gray-900" readOnly />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 flex items-center mb-4">
                <Lock className="mr-2 h-4 w-4 text-gray-500" /> Acesso
              </h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white text-gray-900 mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full pl-3 sm:text-sm border-gray-300 rounded-md p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white text-gray-900 mt-1 focus:ring-brand-500 focus:border-brand-500 block w-full pl-3 sm:text-sm border-gray-300 rounded-md p-2 border" />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button type="submit" fullWidth className="bg-brand-500 hover:bg-brand-600" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Briefcase className="w-4 h-4 mr-2" />}
                {isSubmitting ? 'Enviando...' : 'Solicitar Cadastro de Empresa'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
