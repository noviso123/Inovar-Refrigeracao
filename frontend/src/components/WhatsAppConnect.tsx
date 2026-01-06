import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, Smartphone, LogOut, CheckCircle, AlertCircle, Loader2, KeyRound, QrCode } from 'lucide-react';
import { whatsappService, WhatsAppStatus } from '../services/whatsappService';
import { Button } from './Botao';
import { useNotification } from '../contexts/ContextoNotificacao';

interface WhatsAppConnectProps {
    instanceName?: string;
    onDelete?: () => void;
}

export const WhatsAppConnect: React.FC<WhatsAppConnectProps> = ({ instanceName, onDelete }) => {
    const { notify } = useNotification();
    const [status, setStatus] = useState<WhatsAppStatus['instance']>({ instanceName: instanceName || '', state: 'disconnected' });
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [connectionMethod, setConnectionMethod] = useState<'qr' | 'pairing' | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');

    const fetchStatus = async () => {
        try {
            const data = await whatsappService.getStatus(instanceName);
            if (data.instance) {
                setStatus(data.instance);
                if (data.instance.state === 'open') {
                    setQrCode(null);
                    setPairingCode(null);
                    setPolling(false);
                    setConnectionMethod(null);
                } else if (data.instance.state === 'connecting' && !qrCode && !pairingCode) {
                    // Se estiver conectando mas sem QR Code, tenta buscar
                    handleConnect();
                }
            }
        } catch (error) {
            console.error('Erro ao buscar status:', error);
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        setConnectionMethod('qr');
        try {
            const data = await whatsappService.connect(instanceName);
            if (data.base64) {
                setQrCode(data.base64);
                setPairingCode(null);
                setPolling(true);
            } else if (data.instance?.state === 'open') {
                setStatus({ ...status, state: 'open' } as any);
                notify('WhatsApp já está conectado!', 'success');
            } else if (data.count === 0 || !data.base64) {
                // Evolution API não retornou QR code
                notify('Servidor de WhatsApp indisponível. Tente novamente em alguns segundos.', 'warning');
            }
        } catch (error) {
            notify('Erro ao gerar QR Code. Verifique a conexão com o servidor.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectWithPairing = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            notify('Digite um número válido com DDI (ex: 5511999999999)', 'error');
            return;
        }

        setLoading(true);
        setConnectionMethod('pairing');
        try {
            const data = await whatsappService.connectWithPairingCode(phoneNumber, instanceName);

            if (data.success && data.pairingCode) {
                setPairingCode(data.pairingCode);
                setQrCode(null);
                setPolling(true);
                notify('Código gerado! Digite no seu WhatsApp.', 'success');
            } else if (data.fallbackToQR && data.qrcode) {
                // API não suporta pairing, volta pro QR
                setQrCode(data.qrcode);
                setPairingCode(null);
                setPolling(true);
                notify('Código de pareamento não disponível. Use o QR Code.', 'warning');
            } else {
                notify(data.message || 'Erro ao gerar código de pareamento', 'error');
            }
        } catch (error: any) {
            notify('Erro ao gerar código: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;

        setLoading(true);
        try {
            await whatsappService.logout(instanceName);
            setStatus({ ...status, state: 'disconnected' } as any);
            setQrCode(null);
            setPairingCode(null);
            setPolling(false);
            setConnectionMethod(null);
            notify('WhatsApp desconectado.', 'success');
            if (onDelete) onDelete();
        } catch (error) {
            notify('Erro ao desconectar.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Initial check
    useEffect(() => {
        fetchStatus();
    }, []);

    // Polling for status change when QR code or pairing code is shown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (polling) {
            interval = setInterval(fetchStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [polling]);

    const isConnected = status?.state === 'open';
    const showConnectionOptions = !isConnected && !qrCode && !pairingCode && !loading;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <MessageCircle className="w-6 h-6 mr-2 text-brand-500" />
                    Integração WhatsApp
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center text-sm font-medium px-3 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {isConnected ? (
                            <><CheckCircle className="w-4 h-4 mr-1" /> Conectado</>
                        ) : (
                            <><AlertCircle className="w-4 h-4 mr-1" /> Desconectado</>
                        )}
                    </span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                {/* Status Info */}
                <div className="flex-1 space-y-4">
                    <p className="text-gray-600 text-sm">
                        Conecte seu WhatsApp para enviar notificações automáticas de orçamentos e ordens de serviço para seus clientes.
                    </p>

                    <div className="bg-gray-50 p-4 rounded border border-gray-100">
                        <h4 className="font-bold text-sm text-gray-700 mb-2">Funcionalidades Ativas:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li className="flex items-center"><CheckCircle className="w-3 h-3 mr-2 text-brand-500" /> Envio de Orçamentos (PDF)</li>
                            <li className="flex items-center"><CheckCircle className="w-3 h-3 mr-2 text-brand-500" /> Status de OS em Tempo Real</li>
                            <li className="flex items-center"><CheckCircle className="w-3 h-3 mr-2 text-brand-500" /> Lembretes de Manutenção</li>
                        </ul>
                    </div>

                    {/* Connection Buttons */}
                    <div className="pt-2">
                        {isConnected ? (
                            <Button onClick={handleLogout} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 w-full md:w-auto">
                                <LogOut className="w-4 h-4 mr-2" /> Desconectar
                            </Button>
                        ) : showConnectionOptions && (
                            <div className="space-y-4">
                                {/* Method Selection */}
                                <div className="flex flex-col gap-3">
                                    <Button onClick={handleConnect} disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white w-full">
                                        {loading && connectionMethod === 'qr' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                                        Conectar via QR Code
                                    </Button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200"></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="bg-white px-2 text-gray-500">ou</span>
                                        </div>
                                    </div>

                                    {/* Pairing Code Option */}
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <KeyRound className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800">Conectar via Código de Pareamento</span>
                                        </div>
                                        <p className="text-xs text-blue-600 mb-3">
                                            Sem precisar escanear QR Code! Gere um código e digite no seu celular.
                                        </p>

                                        {/* Step 1: Phone Number Input */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-bold text-blue-800 mb-1">
                                                1️⃣ Digite SEU número de WhatsApp (com DDI):
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="tel"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                                    placeholder="Ex: 5511999999999"
                                                    className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <Button
                                                    onClick={handleConnectWithPairing}
                                                    disabled={loading || !phoneNumber}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    {loading && connectionMethod === 'pairing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Código'}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                55 = Brasil, 11 = DDD, 999999999 = seu número
                                            </p>
                                        </div>

                                        {/* Step 2: Instructions */}
                                        <div className="bg-white/60 p-3 rounded border border-blue-100">
                                            <p className="text-xs font-bold text-blue-800 mb-2">
                                                2️⃣ Após gerar o código, no seu celular:
                                            </p>
                                            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                                                <li>Abra o <strong>WhatsApp</strong></li>
                                                <li>Toque nos <strong>3 pontinhos → Dispositivos Conectados</strong></li>
                                                <li>Toque em <strong>"Conectar um dispositivo"</strong></li>
                                                <li>Toque em <strong>"Conectar com número de telefone"</strong></li>
                                                <li>Digite o <strong>código de 8 dígitos</strong> que aparecerá aqui</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleLogout} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 w-full" title="Excluir Conexão">
                                    <LogOut className="w-4 h-4 mr-2" /> Excluir Instância
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* QR Code Display */}
                {!isConnected && (qrCode || (loading && connectionMethod === 'qr')) && (
                    <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl w-72 relative">
                        {loading && !qrCode ? (
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-2" />
                                <span className="text-xs text-gray-500">Gerando QR Code...</span>
                            </div>
                        ) : qrCode ? (
                            <>
                                <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                                <p className="text-xs text-gray-500 mt-2 animate-pulse">Escaneie com seu celular</p>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-4 w-full">
                                    <Button
                                        onClick={handleConnect}
                                        variant="secondary"
                                        size="sm"
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Novo QR
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setQrCode(null);
                                            setPairingCode(null);
                                            setPolling(false);
                                            setConnectionMethod(null);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        Cancelar
                                    </Button>
                                </div>

                                {/* Switch to Pairing Code option */}
                                <button
                                    onClick={() => {
                                        setQrCode(null);
                                        setConnectionMethod(null);
                                        setPolling(false);
                                    }}
                                    className="text-xs text-blue-600 hover:underline mt-3"
                                >
                                    Prefiro usar código de pareamento
                                </button>
                            </>
                        ) : null}
                    </div>
                )}

                {/* Pairing Code Display */}
                {!isConnected && pairingCode && (
                    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl w-72 relative">
                        <KeyRound className="w-8 h-8 text-blue-600 mb-3" />
                        <p className="text-sm text-blue-700 mb-3 font-medium">Seu Código de Pareamento:</p>
                        <div className="bg-white px-6 py-4 rounded-lg shadow-sm border border-blue-200 mb-4">
                            <span className="text-3xl font-mono font-black text-gray-900 tracking-widest">{pairingCode}</span>
                        </div>
                        <div className="text-xs text-blue-600 text-center">
                            <p className="font-medium mb-1">No seu celular:</p>
                            <ol className="text-left space-y-1">
                                <li>1. Abra o WhatsApp</li>
                                <li>2. Menu → Dispositivos Conectados</li>
                                <li>3. Conectar um Dispositivo</li>
                                <li>4. Toque em "Conectar com número"</li>
                                <li>5. Digite o código acima</li>
                            </ol>
                        </div>
                        <p className="text-xs text-gray-400 mt-3 animate-pulse">Aguardando conexão...</p>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 w-full">
                            <Button 
                                onClick={handleConnectWithPairing} 
                                variant="secondary" 
                                size="sm"
                                disabled={loading || !phoneNumber}
                                className="flex-1"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Novo Código
                            </Button>
                            <Button 
                                onClick={() => {
                                    setQrCode(null);
                                    setPairingCode(null);
                                    setPolling(false);
                                    setConnectionMethod(null);
                                }} 
                                variant="outline" 
                                size="sm"
                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                                Cancelar
                            </Button>
                        </div>
                        
                        {/* Switch to QR Code option */}
                        <button 
                            onClick={() => {
                                setPairingCode(null);
                                setConnectionMethod(null);
                                setPolling(false);
                            }}
                            className="text-xs text-brand-600 hover:underline mt-3"
                        >
                            Prefiro usar QR Code
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
