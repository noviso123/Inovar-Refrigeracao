import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { Button } from '../components/Botao';
import { Save, Clock, MessageSquare, Play, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../contexts/ContextoNotificacao';
import { whatsappBrain } from '../services/whatsappBrain';

interface Props {
    user: Usuario;
}

export function AutomacaoSettings({ user }: Props) {
    const { notify } = useNotification();
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);

    const [config, setConfig] = useState({
        lembreteManutencao: false,
        intervaloMeses: 6,
        templateMensagem: "Olá {cliente}, notamos que sua última manutenção foi em {data}. Recomendamos agendar uma nova visita para garantir o funcionamento ideal dos seus equipamentos.",
        whatsappInstanceName: ''
    });

    useEffect(() => {
        loadConfig();
        loadInstances();
    }, [user]);

    const loadConfig = async () => {
        try {
            const response = await api.get(`/usuarios/${user.id}`);
            const userData = response.data;

            if (userData.automacao) {
                setConfig({
                    lembreteManutencao: userData.automacao.lembreteManutencao || false,
                    intervaloMeses: userData.automacao.intervaloMeses || 6,
                    templateMensagem: userData.automacao.templateMensagem || config.templateMensagem,
                    whatsappInstanceName: userData.automacao.whatsappInstanceName || ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    };

    const getInstanceName = () => {
        if (!user) return '';
        const name = user.nome_completo || 'User';
        return name.replace(/[^a-zA-Z0-9]/g, '');
    };

    const loadInstances = async () => {
        try {
            const status = await whatsappBrain.getStatus();

            if (status && status.status === 'conectado') {
                setConfig(prev => ({ ...prev, whatsappInstanceName: 'Neonize Brain' }));
            } else {
                setConfig(prev => ({ ...prev, whatsappInstanceName: '' }));
            }
        } catch (error) {
            console.error('Erro ao carregar status do WhatsApp:', error);
            setConfig(prev => ({ ...prev, whatsappInstanceName: '' }));
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.put(`/usuarios/${user.id}/automacao`, config);
            notify('Configurações salvas com sucesso!', 'success');
        } catch (error: any) {
            console.error('Erro detalhado:', error);
            const msg = error.response?.data?.error || error.message || 'Erro ao salvar configurações.';
            notify(`Erro: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        try {
            setTesting(true);
            await api.post(`/usuarios/${user.id}/automacao/test`);
            notify('Teste de automação iniciado! Verifique os logs ou o WhatsApp.', 'success');
        } catch (error) {
            notify('Erro ao iniciar teste.', 'error');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-brand-500" />
                        Lembretes Automáticos de Manutenção
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure o sistema para enviar mensagens automáticas quando seus clientes precisarem de manutenção.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.lembreteManutencao ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {config.lembreteManutencao ? 'Ativado' : 'Desativado'}
                    </span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">

                {/* Status da Instância WhatsApp (Automático) */}
                <div className={`p-4 rounded-lg border ${config.whatsappInstanceName ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${config.whatsappInstanceName ? 'bg-green-100' : 'bg-red-100'}`}>
                            <MessageSquare className={`w-5 h-5 ${config.whatsappInstanceName ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                            <h3 className={`font-medium ${config.whatsappInstanceName ? 'text-green-900' : 'text-red-900'}`}>
                                {config.whatsappInstanceName ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                            </h3>
                            <p className={`text-sm ${config.whatsappInstanceName ? 'text-green-700' : 'text-red-700'}`}>
                                {config.whatsappInstanceName
                                    ? `O sistema identificou sua instância "${config.whatsappInstanceName}" e a usará para enviar os lembretes.`
                                    : 'Não encontramos uma instância ativa para seu usuário. Conecte seu WhatsApp na aba "WhatsApp" para ativar a automação.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Toggle Ativar */}
                <div className={`flex items-center justify-between p-4 rounded-lg ${!config.whatsappInstanceName ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-gray-50'}`}>
                    <div>
                        <h3 className="font-medium text-gray-900">Ativar Lembretes Automáticos</h3>
                        <p className="text-sm text-gray-500">O sistema verificará diariamente clientes com manutenção vencida.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.lembreteManutencao}
                            onChange={e => setConfig({ ...config, lembreteManutencao: e.target.checked })}
                            disabled={!config.whatsappInstanceName}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                </div>

                {/* Intervalo Global */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Intervalo Padrão de Manutenção (Meses)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={config.intervaloMeses}
                            onChange={e => setConfig({ ...config, intervaloMeses: parseInt(e.target.value) || 6 })}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            disabled={!config.lembreteManutencao}
                        />
                        <span className="text-gray-600">meses após a última manutenção</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Este intervalo será aplicado a <strong>todos</strong> os seus clientes e equipamentos.
                    </p>
                </div>

                {/* Template da Mensagem */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modelo da Mensagem
                    </label>
                    <div className="relative">
                        <textarea
                            rows={4}
                            value={config.templateMensagem}
                            onChange={e => setConfig({ ...config, templateMensagem: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 font-mono text-sm"
                            disabled={!config.lembreteManutencao}
                        />
                        <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    </div>
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                        <strong>Variáveis disponíveis:</strong>
                        <ul className="mt-1 list-disc list-inside">
                            <li><code>{'{cliente}'}</code> - Nome do cliente</li>
                            <li><code>{'{data}'}</code> - Data da última manutenção</li>
                        </ul>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Button
                        variant="secondary"
                        onClick={handleTest}
                        disabled={testing || !config.lembreteManutencao || !config.whatsappInstanceName}
                        className="flex items-center gap-2"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Testar Agora
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={loading || !config.whatsappInstanceName}
                        className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Configurações
                    </Button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-blue-900">Como funciona?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        O sistema verifica diariamente às 09:00 quais clientes possuem a data de "Última Manutenção" mais antiga que o intervalo configurado ({config.intervaloMeses} meses).
                        <br /><br />
                        A data de "Última Manutenção" é atualizada automaticamente sempre que você finaliza uma Ordem de Serviço (OS) do tipo "Manutenção".
                    </p>
                </div>
            </div>
        </div>
    );
}
