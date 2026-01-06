import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Crown, Check, ArrowRight, AlertTriangle, BarChart3 } from 'lucide-react';
import { Button } from './Botao';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ModalUpgradeProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

interface UsageStats {
    clientes: { usado: number; limite: number | null };
    servicos: { usado: number; limite: number | null };
    plano: string;
}

export function ModalUpgrade({ isOpen, onClose, message }: ModalUpgradeProps) {
    const navigate = useNavigate();
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/limites')
                .then(response => setStats(response.data))
                .catch(err => console.error("Erro ao carregar limites:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUpgrade = () => {
        onClose();
        navigate('/assinatura');
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-900/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] flex flex-col md:flex-row bg-white md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Lado Esquerdo - Visual Impactante */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-brand-900 to-brand-700 p-8 text-white relative flex flex-col justify-center items-center text-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/30"></div>

                    <div className="relative z-10 mb-6">
                        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm mx-auto mb-6 ring-4 ring-white/20">
                            <Crown className="w-12 h-12 text-yellow-400 fill-yellow-400 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Limite Atingido</h2>
                        <p className="text-brand-100 text-lg">Seu negócio cresceu demais para o plano atual!</p>
                    </div>

                    <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-4 w-full max-w-xs border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <BarChart3 className="w-5 h-5 text-brand-200" />
                            <span className="font-medium">Status Atual</span>
                        </div>
                        {loading ? (
                            <div className="animate-pulse h-10 bg-white/10 rounded"></div>
                        ) : stats ? (
                            <div className="text-left space-y-3">
                                {stats.clientes.limite !== null && (
                                    <div>
                                        <div className="flex justify-between text-xs text-brand-100 mb-1">
                                            <span>Clientes</span>
                                            <span>{Math.round((stats.clientes.usado / stats.clientes.limite) * 100)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-yellow-400" style={{ width: `${Math.min((stats.clientes.usado / stats.clientes.limite) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                )}
                                {stats.servicos.limite !== null && (
                                    <div>
                                        <div className="flex justify-between text-xs text-brand-100 mb-1">
                                            <span>Serviços (Mês)</span>
                                            <span>{Math.round((stats.servicos.usado / stats.servicos.limite) * 100)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-yellow-400" style={{ width: `${Math.min((stats.servicos.usado / stats.servicos.limite) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Lado Direito - Ação */}
                <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-surface-50 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-surface-200 rounded-full transition-colors text-surface-500"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="mb-8">
                        <div className="flex items-start gap-4 bg-red-50 border border-red-100 p-4 rounded-xl mb-6">
                            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-red-800 font-bold text-lg mb-1">Ação Bloqueada</h3>
                                <p className="text-red-700">{message}</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-surface-900 mb-4">Desbloqueie todo o potencial</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white transition-colors">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                    <Check className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-surface-800">Sem Limites</h4>
                                    <p className="text-sm text-surface-500">Cadastre quantos clientes e serviços precisar.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white transition-colors">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <Crown className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-surface-800">Recursos Premium</h4>
                                    <p className="text-sm text-surface-500">Acesso a relatórios avançados e suporte VIP.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button onClick={handleUpgrade} size="xl" className="w-full shadow-xl shadow-brand-500/20 text-lg py-4">
                            <span>Fazer Upgrade Agora</span>
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-surface-500 font-medium hover:text-surface-800 transition-colors"
                        >
                            Voltar e resolver depois
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
