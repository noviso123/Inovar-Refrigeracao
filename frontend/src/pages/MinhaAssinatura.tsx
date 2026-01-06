import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Usuario, Assinatura, PlanoAssinatura } from '../types';
import { assinaturaService } from '../services/assinaturaService';
import { useNotification } from '../contexts/ContextoNotificacao';
import {
    CreditCard, Package, Calendar, AlertTriangle, CheckCircle,
    Clock, Loader2, Crown, ArrowRight, RefreshCw, ExternalLink
} from 'lucide-react';
import { Button } from '../components/Botao';

interface Props {
    user: Usuario;
    embedded?: boolean;
}

export function SubscriptionSettings({ user, embedded = false }: Props) {
    const { notify } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
    const [planos, setPlanos] = useState<PlanoAssinatura[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(false);
    const [processandoPlano, setProcessandoPlano] = useState<string | null>(null);
    const [verificandoPagamento, setVerificandoPagamento] = useState(false);

    const carregarDados = async () => {
        if (user.cargo === 'super_admin') {
            setCarregando(false);
            return;
        }

        try {
            setCarregando(true);
            const [minha, todosPlanos] = await Promise.all([
                assinaturaService.obterMinhaAssinatura().catch(() => null), // Fail safe
                assinaturaService.listarPlanos().catch(() => []) // Fail safe
            ]);

            if (minha) setAssinatura(minha);

            // Garantir que todosPlanos é um array antes de filtrar
            const planosArray = Array.isArray(todosPlanos) ? todosPlanos : [];
            if (planosArray.length > 0) {
                setPlanos(planosArray.filter((p: any) => p.ativo));
            } else {
                setPlanos([]);
            }
        } catch (error: any) {
            console.error('Erro ao carregar dados de assinatura:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        // Skip for super_admin - they don't need subscription
        if (user.cargo === 'super_admin') {
            setCarregando(false);
            return;
        }

        carregarDados();

        // Verificar se retornou do checkout do Mercado Pago
        const mpStatus = searchParams.get('mp_status');
        const preapprovalId = searchParams.get('preapproval_id');

        if (mpStatus === 'callback' || preapprovalId) {
            setVerificandoPagamento(true);
            notify('Pagamento em processamento. Verificando status...', 'info');

            // Limpar parâmetros da URL
            setSearchParams({});

            // Polling Avançado: 
            // 1. A cada 1 segundo durante a primeira hora (3600 tentativas)
            // 2. Depois, a cada 5 minutos

            const startTime = Date.now();
            const oneHour = 60 * 60 * 1000;
            const fortyEightHours = 48 * 60 * 60 * 1000;
            let timeoutId: NodeJS.Timeout;

            const pollStatus = async () => {
                const elapsed = Date.now() - startTime;

                // Se passou de 48h, parar e avisar (cancelamento automático visual)
                if (elapsed > fortyEightHours) {
                    setVerificandoPagamento(false);
                    notify('Tempo limite de pagamento excedido (48h). Por favor, gere um novo link.', 'error');
                    return;
                }

                try {
                    // Forçar sincronização explícita com o backend/Mercado Pago
                    const resultadoSync = await assinaturaService.sincronizarAssinatura();

                    if (resultadoSync.status_atual === 'ativa') {
                        // Se ativou, recarrega o objeto completo para atualizar a UI
                        const assinaturaAtualizada = await assinaturaService.obterMinhaAssinatura();
                        if (assinaturaAtualizada) setAssinatura(assinaturaAtualizada);

                        setVerificandoPagamento(false);
                        notify('Assinatura ativada com sucesso!', 'success');
                        return; // Sucesso! Parar polling.
                    }
                } catch (e) {
                    console.error("Erro ao verificar status:", e);
                }

                // Definir próximo intervalo
                let nextInterval = 1000; // Padrão: 1 segundo
                if (elapsed > oneHour) {
                    nextInterval = 5 * 60 * 1000; // 5 minutos após 1 hora
                }

                // Agendar próxima verificação
                timeoutId = setTimeout(pollStatus, nextInterval);
            };

            // Iniciar polling
            pollStatus();

            // Cleanup function para cancelar timeout se o componente desmontar
            return () => {
                if (timeoutId) clearTimeout(timeoutId);
            };
        }
    }, []);

    /**
     * Criar assinatura recorrente via Mercado Pago
     * Abre o checkout do MP onde o usuário preenche o cartão
     */
    const assinarPlano = async (planoId: string) => {
        try {
            setProcessandoPlano(planoId);

            // Chamar API para criar assinatura
            const response = await assinaturaService.assinarPlano(planoId) as any;

            console.log('Resposta da assinatura:', response);

            // Verificar se retornou URL de checkout do Mercado Pago
            const checkoutUrl = response.mpInitPoint;

            if (checkoutUrl) {
                notify('Abrindo checkout do Mercado Pago...', 'info');

                // Abrir checkout em nova aba
                const checkoutWindow = window.open(checkoutUrl, '_blank');

                if (!checkoutWindow) {
                    // Popup bloqueado - redirecionar na mesma página
                    notify('Redirecionando para o Mercado Pago...', 'info');
                    window.location.href = checkoutUrl;
                    return;
                }

                // Atualizar estado local com a assinatura pendente
                setAssinatura({
                    ...response,
                    mpInitPoint: checkoutUrl
                });

                notify('Complete o pagamento na aba do Mercado Pago e depois clique em "Verificar Status".', 'success');
            } else {
                // Assinatura criada mas sem checkout MP
                setAssinatura(response);
                notify('Assinatura criada! Entre em contato para finalizar o pagamento.', 'warning');
            }
        } catch (error: any) {
            console.error('Erro ao criar assinatura:', error);
            notify('Erro ao criar assinatura: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setProcessandoPlano(null);
        }
    };


    const cancelarAssinatura = async () => {
        if (!assinatura) return;
        if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso às funcionalidades premium.')) return;

        try {
            setProcessando(true);
            await assinaturaService.cancelarAssinatura(assinatura.id);
            notify('Assinatura cancelada.', 'info');
            setAssinatura(null);
            carregarDados();
        } catch (error: any) {
            notify('Erro ao cancelar: ' + error.message, 'error');
        } finally {
            setProcessando(false);
        }
    };

    // Helpers
    const diasRestantes = assinatura ? assinaturaService.diasAteVencimento(assinatura) : 0;
    const estaAtiva = assinatura?.status === 'ativa';
    const estaPendente = assinatura?.status === 'pendente';

    if (carregando) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <span className="ml-3 text-surface-500">Carregando...</span>
            </div>
        );
    }

    // Super Admin Exemption Message
    if (user.cargo === 'super_admin') {
        return (
            <div className={embedded ? "" : "p-6 max-w-4xl mx-auto"}>
                {!embedded && (
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <CreditCard className="w-8 h-8 text-brand-500" />
                            Minha Assinatura
                        </h1>
                    </div>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                    <Crown className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-blue-900 mb-2">Acesso Ilimitado</h2>
                    <p className="text-blue-700 max-w-lg mx-auto">
                        Como <strong>Super Admin</strong>, você tem acesso total e irrestrito a todas as funcionalidades da plataforma.
                        Não é necessário assinar nenhum plano.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={embedded ? "" : "p-6 max-w-4xl mx-auto"}>
            {/* Cabeçalho - Only show if not embedded */}
            {!embedded && (
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-brand-500" />
                        Minha Assinatura
                    </h1>
                    <p className="text-surface-500 mt-1">Gerencie seu plano e pagamentos recorrentes</p>
                </div>
            )}

            {/* Status da Assinatura Atual */}
            {assinatura && (
                <div className={`rounded-2xl shadow-lg border-2 overflow-hidden mb-8 ${estaAtiva ? 'border-brand-200 bg-gradient-to-r from-brand-50 to-blue-50' :
                    estaPendente ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50' :
                        'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
                    }`}>
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    {estaAtiva ? (
                                        <CheckCircle className="w-6 h-6 text-brand-500" />
                                    ) : estaPendente ? (
                                        <Clock className="w-6 h-6 text-yellow-600" />
                                    ) : (
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    )}
                                    <span className={`text-sm font-bold uppercase ${estaAtiva ? 'text-brand-600' :
                                        estaPendente ? 'text-yellow-700' : 'text-red-700'
                                        }`}>
                                        {estaAtiva ? 'Assinatura Ativa' :
                                            estaPendente ? 'Aguardando Confirmação' : 'Assinatura Inativa'}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
                                    <Crown className="w-6 h-6 text-brand-500" />
                                    {assinatura.plano?.nome || 'Plano'}
                                </h2>
                                <p className="text-gray-600 mt-1">{assinatura.plano?.descricao}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-gray-900">
                                    R$ {(assinatura.valorMensal || 0).toFixed(2)}
                                    <span className="text-sm font-normal text-gray-500">/mês</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Cobrado via Mercado Pago
                                </p>
                            </div>
                        </div>

                        {estaAtiva && (
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Próxima cobrança: {new Date(assinatura.dataVencimento).toLocaleDateString('pt-BR')}
                                </div>
                                <div className={`text-sm font-medium ${diasRestantes <= 5 ? 'text-red-600' : 'text-brand-600'}`}>
                                    ({diasRestantes} dias)
                                </div>
                            </div>
                        )}

                        {estaPendente && (
                            <div className="mt-4 p-4 bg-yellow-100 rounded-lg border border-yellow-200">
                                <p className="text-sm text-yellow-800 mb-3">
                                    <Clock className="w-4 h-4 inline mr-2" />
                                    {(assinatura as any).mpInitPoint
                                        ? 'Complete o pagamento para ativar sua assinatura.'
                                        : 'Aguardando confirmação do pagamento pelo Mercado Pago.'}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {/* Botão Pagar Agora - só aparece se tiver URL de checkout */}
                                    {(assinatura as any).mpInitPoint && (
                                        <Button
                                            onClick={() => window.open((assinatura as any).mpInitPoint, '_blank')}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Pagar Agora
                                            <ExternalLink className="w-3 h-3 ml-2" />
                                        </Button>
                                    )}

                                    <Button
                                        onClick={carregarDados}
                                        variant="secondary"
                                        disabled={verificandoPagamento}
                                    >
                                        {verificandoPagamento ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                        )}
                                        Verificar Status
                                    </Button>

                                    {/* Botão Cancelar - para escolher outro plano */}
                                    <Button
                                        onClick={cancelarAssinatura}
                                        variant="secondary"
                                        disabled={processando}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        {processando ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : null}
                                        Cancelar e Escolher Outro Plano
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Ações */}
                        <div className="mt-6 flex gap-3">
                            {estaAtiva && (
                                <Button variant="secondary" onClick={cancelarAssinatura} disabled={processando}>
                                    {processando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Cancelar Assinatura
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de Planos Disponíveis - Mostrar se não tiver assinatura ou se estiver cancelada/inativa */}
            {(!assinatura || assinatura.status === 'cancelada' || assinatura.status === 'inativa') && (
                <>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Escolha seu Plano</h2>

                    {/* Badge Mercado Pago */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-blue-800">Pagamento Seguro via Mercado Pago</p>
                            <p className="text-sm text-blue-600">Assinatura recorrente com renovação automática mensal</p>
                        </div>
                    </div>

                    {planos.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nenhum plano disponível no momento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {planos.map(plano => (
                                <div
                                    key={plano.id}
                                    className="bg-white rounded-2xl shadow-lg border-2 border-brand-100 overflow-hidden hover:border-brand-300 transition-all hover:shadow-xl"
                                >
                                    <div className="bg-brand-500 p-6 text-white">
                                        <h3 className="text-xl font-bold">{plano.nome}</h3>
                                        <p className="text-brand-100 text-sm">{plano.descricao}</p>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-baseline mb-4">
                                            <span className="text-sm text-gray-500">R$</span>
                                            <span className="text-4xl font-black text-gray-900 mx-1">
                                                {(plano.valorMensal || 0).toFixed(2).split('.')[0]}
                                            </span>
                                            <span className="text-gray-500">,{(plano.valorMensal || 0).toFixed(2).split('.')[1]}/mês</span>
                                        </div>

                                        <ul className="space-y-2 mb-6">
                                            {plano.recursos?.slice(0, 4).map((recurso, idx) => (
                                                <li key={idx} className="flex items-center text-sm text-gray-600">
                                                    <CheckCircle className="w-4 h-4 mr-2 text-brand-500" />
                                                    {recurso}
                                                </li>
                                            ))}
                                        </ul>

                                        <Button
                                            onClick={() => assinarPlano(plano.id)}
                                            disabled={processandoPlano === plano.id}
                                            className="w-full bg-brand-500 hover:bg-brand-600"
                                        >
                                            {processandoPlano === plano.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Processando...
                                                </>
                                            ) : (
                                                <>
                                                    Assinar com Mercado Pago
                                                    <ExternalLink className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Botão Atualizar */}
            <div className="mt-8 text-center">
                <button
                    onClick={carregarDados}
                    className="text-sm text-surface-500 hover:text-brand-500 flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar dados
                </button>
            </div>
        </div>
    );
}
