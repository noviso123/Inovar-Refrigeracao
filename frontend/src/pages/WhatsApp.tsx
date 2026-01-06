
import React, { useState, useEffect } from 'react';
import { whatsappBrain, BotStatus, BotConfig } from '../services/whatsappBrain';
import { Button } from '../components/Botao';
import { QrCode, Wifi, WifiOff, Clock, ShieldCheck, Settings, Power } from 'lucide-react';
import { useNotification } from '../contexts/ContextoNotificacao';

export const WhatsApp: React.FC = () => {
    const { notify } = useNotification();
    const [status, setStatus] = useState<BotStatus | null>(null);
    const [config, setConfig] = useState<BotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Polling Status every 5 seconds
    useEffect(() => {
        fetchStatus();
        fetchConfig();

        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const data = await whatsappBrain.getStatus();
            setStatus(data);
        } catch (error) {
            console.error("Error fetching status", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const data = await whatsappBrain.getConfig();
            setConfig(data);
        } catch (error) {
            console.error("Error fetching config", error);
        }
    };

    const handleConfigSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        setSaving(true);
        try {
            await whatsappBrain.updateConfig(config);
            notify('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            notify('Erro ao salvar configurações.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReconnect = async () => {
        try {
            await whatsappBrain.reconnect();
            notify('Tentativa de reconexão iniciada...', 'info');
            fetchStatus();
        } catch (error) {
            notify('Erro ao solicitar reconexão.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-green-600" />
                        WhatsApp Brain (Neonize)
                    </h1>
                    <p className="text-gray-500">Motor Anti-Ban e Gestão de Conexão Segura</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border">
                    {status?.connected ? (
                        <div className="flex items-center gap-2 text-green-600 font-bold px-3 py-1 bg-green-50 rounded-full">
                            <Wifi className="w-5 h-5" />
                            <span>ONLINE</span>
                        </div>
                    ) : status?.status === 'aguardando_qr' ? (
                        <div className="flex items-center gap-2 text-orange-600 font-bold px-3 py-1 bg-orange-50 rounded-full">
                            <QrCode className="w-5 h-5" />
                            <span>Escaneie o QR</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-600 font-bold px-3 py-1 bg-red-50 rounded-full">
                            <WifiOff className="w-5 h-5" />
                            <span>Desconectado</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Connection Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-gray-500" />
                            Conexão
                        </h2>
                    </div>
                    <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">

                        {status?.status === 'conectado' ? (
                            <div className="text-center space-y-4">
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="w-12 h-12 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Conexão Segura Ativa</h3>
                                <p className="text-gray-500 max-w-xs mx-auto">
                                    Seu bot está rodando e protegido pelo sistema Anti-Ban.
                                </p>
                                <Button variant="outline" className="mt-4 text-red-600 hover:bg-red-50 border-red-200">
                                    <Power className="w-4 h-4 mr-2" />
                                    Desconectar
                                </Button>
                            </div>
                        ) : status?.status === 'aguardando_qr' && status?.qr_code ? (
                            <div className="text-center space-y-4">
                                <h3 className="font-bold text-gray-800 mb-2">Escaneie para Conectar</h3>
                                <div className="bg-white p-2 border rounded-lg shadow-sm inline-block">
                                    <img
                                        src={`data:image/png;base64,${status.qr_code}`}
                                        alt="WhatsApp QR Code"
                                        className="w-64 h-64 object-contain"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 animate-pulse">
                                    Aguardando leitura do código...
                                </p>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <WifiOff className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-600">Bot Desconectado</h3>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto mb-4">
                                    Clique abaixo para iniciar o processo de conexão e gerar um novo QR Code.
                                </p>
                                <Button onClick={handleReconnect} className="bg-brand-600 hover:bg-brand-700 text-white">
                                    Iniciar Conexão
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Configuration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-gray-500" />
                            Configurações Anti-Ban
                        </h2>
                    </div>
                    <div className="p-6">
                        {config ? (
                            <form onSubmit={handleConfigSave} className="space-y-6">

                                {/* Status Switch */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="font-medium text-gray-700">Bot Ativo</label>
                                        <p className="text-xs text-gray-500">Pausa totalmente o envio de mensagens</p>
                                    </div>
                                    <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                                        <input
                                            type="checkbox"
                                            checked={config.ativo}
                                            onChange={(e) => setConfig({...config, ativo: e.target.checked})}
                                            className="opacity-0 w-0 h-0"
                                            id="toggle-active"
                                        />
                                        <label htmlFor="toggle-active" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${config.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.ativo ? 'transform translate-x-6' : ''}`} />
                                        </label>
                                    </div>
                                </div>

                                {/* Delays */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Delays (Aleatórios)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo (seg)</label>
                                            <input
                                                type="number"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                                                value={config.min_delay}
                                                onChange={(e) => setConfig({...config, min_delay: parseInt(e.target.value)})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Máximo (seg)</label>
                                            <input
                                                type="number"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                                                value={config.max_delay}
                                                onChange={(e) => setConfig({...config, max_delay: parseInt(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sleep Hours */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <WifiOff className="w-4 h-4" />
                                        Modo Sono (Repouso)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                            <input
                                                type="time"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                                                value={config.hora_inicio} // Note: This logic might need inversion depending on semantics "Start Working" vs "Start Sleeping". User schema says 'hora_inicio'/'hora_fim'. Assumption: Working Hours.
                                                // Actually lets check standard: 'hora_inicio' usually means start of active period.
                                                // My brain logic used 'sleep_start'.
                                                // User Schema: hora_inicio = 08:00 (Start Active), hora_fim = 21:00 (End Active).
                                                onChange={(e) => setConfig({...config, hora_inicio: e.target.value})}
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Horário que começa a trabalhar</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                            <input
                                                type="time"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                                                value={config.hora_fim}
                                                onChange={(e) => setConfig({...config, hora_fim: e.target.value})}
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Horário que vai dormir</p>
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white" disabled={saving}>
                                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                Carregando configurações...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsApp;
