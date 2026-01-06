import React, { useState, useEffect } from 'react';
import { WhatsAppConnect } from '../components/WhatsAppConnect';
import { whatsappService, WhatsAppInstance } from '../services/whatsappService';
import { Plus, MessageCircle } from 'lucide-react';
import { Button } from '../components/Botao';
import { useNotification } from '../contexts/ContextoNotificacao';

export const WhatsApp: React.FC = () => {
    const { notify } = useNotification();
    const [user, setUser] = useState<any>(null);
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const getInstanceName = () => {
        if (!user) return '';
        const name = user.nome || user.nomeCompleto || user.nome_completo || user.name || 'User';
        return name.replace(/[^a-zA-Z0-9]/g, '');
    };

    const fetchInstances = async () => {
        setLoading(true);
        try {
            const data = await whatsappService.getInstances();
            const myInstanceName = getInstanceName();
            const allInstances = Array.isArray(data) ? data : [];
            const myInstances = allInstances.filter(inst =>
                inst.instance?.instanceName === myInstanceName
            );
            setInstances(myInstances);
        } catch (error) {
            console.error('Erro ao buscar instâncias:', error);
            notify('Erro ao carregar conexões.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchInstances();
        }
    }, [user]);

    const handleCreateInstance = async () => {
        const instanceName = getInstanceName();
        if (!instanceName) {
            notify('Erro ao identificar usuário.', 'error');
            return;
        }

        setCreating(true);
        try {
            await whatsappService.createInstance(instanceName);
            notify('Conexão criada com sucesso!', 'success');
            fetchInstances();
        } catch (error) {
            notify('Erro ao criar conexão.', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteInstance = async (instanceName: string) => {
        if (!confirm(`Tem certeza que deseja excluir a conexão "${instanceName}"?`)) return;

        try {
            await whatsappService.deleteInstance(instanceName);
            notify('Conexão removida com sucesso.', 'success');
            fetchInstances();
        } catch (error) {
            notify('Erro ao remover conexão.', 'error');
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-brand-500" />
                        Gerenciador de WhatsApp
                    </h1>
                    <p className="text-surface-500 text-sm mt-0.5">
                        Gerencie sua conexão do WhatsApp ({getInstanceName()})
                    </p>
                </div>
                {instances.length === 0 && !loading && (
                    <Button onClick={handleCreateInstance} disabled={creating}>
                        {creating ? 'Criando...' : (
                            <>
                                <Plus className="w-5 h-5" />
                                <span>Criar Conexão</span>
                            </>
                        )}
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : instances.length === 0 ? (
                <div className="card p-12 text-center">
                    <MessageCircle className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-surface-600">Nenhuma conexão encontrada</p>
                    <p className="text-sm text-surface-400 mt-1 mb-4">Conecte seu WhatsApp para enviar mensagens</p>
                    <Button onClick={handleCreateInstance} disabled={creating}>
                        {creating ? 'Criando...' : (
                            <>
                                <Plus className="w-4 h-4" />
                                <span>Criar Minha Conexão</span>
                            </>
                        )}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {instances.map((inst, idx) => {
                        if (!inst?.instance) return null;
                        return (
                            <div key={inst.instance.instanceName || idx}>
                                <WhatsAppConnect
                                    instanceName={inst.instance.instanceName}
                                    onDelete={() => handleDeleteInstance(inst.instance.instanceName)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WhatsApp;
