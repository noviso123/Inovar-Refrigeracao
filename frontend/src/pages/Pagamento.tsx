import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle, AlertCircle, Save, Loader2, Copy, QrCode } from 'lucide-react';
import { Usuario } from '../types';
import api from '../services/api';
import { useNotification } from '../contexts/ContextoNotificacao';
import { Button } from '../components/Botao';

interface Props {
    user: Usuario;
    embedded?: boolean;
}

type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export function PaymentSettings({ user, embedded = false }: Props) {
    const { notify } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [tipoChave, setTipoChave] = useState<TipoChavePix>('cpf');
    const [chavePix, setChavePix] = useState('');
    const [nomeBeneficiario, setNomeBeneficiario] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/pagamentos/config/${user.id}`);
            if (response.data) {
                setTipoChave(response.data.tipo_chave || 'cpf');
                setChavePix(response.data.chave_pix || '');
                setNomeBeneficiario(response.data.nome_beneficiario || user.nome_completo || '');
                setSaved(!!response.data.chave_pix);
            } else {
                setNomeBeneficiario(user.nome_completo || '');
            }
        } catch (err) {
            setNomeBeneficiario(user.nome_completo || '');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!chavePix.trim()) {
            notify('Informe sua chave PIX', 'error');
            return;
        }

        try {
            setSaving(true);
            await api.post(`/pagamentos/config/${user.id}`, {
                tipo_chave: tipoChave,
                chave_pix: chavePix.trim(),
                nome_beneficiario: nomeBeneficiario.trim()
            });
            setSaved(true);
            notify('Chave PIX salva com sucesso!', 'success');
        } catch (err: any) {
            notify('Erro ao salvar: ' + (err.response?.data?.error || err.message), 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(chavePix);
        notify('Chave PIX copiada!', 'success');
    };

    const formatChave = (value: string, tipo: TipoChavePix) => {
        const digits = value.replace(/\D/g, '');
        switch (tipo) {
            case 'cpf':
                return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
            case 'cnpj':
                return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
            case 'telefone':
                return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
            default:
                return value;
        }
    };

    const handleChaveChange = (value: string) => {
        if (tipoChave === 'email' || tipoChave === 'aleatoria') {
            setChavePix(value);
        } else {
            setChavePix(formatChave(value, tipoChave));
        }
    };

    return (
        <div className={embedded ? "" : "space-y-4 sm:space-y-6 pb-20 lg:pb-4"}>
            {/* Header - Only show if not embedded */}
            {!embedded && (
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-brand-500" />
                        Configuração de Pagamento
                    </h1>
                    <p className="text-surface-500 text-sm mt-0.5">
                        Configure sua chave PIX para receber pagamentos
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Status Card */}
                    {saved && (
                        <div className="card p-4 bg-brand-50 border-brand-100 flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-brand-700">PIX Configurado!</p>
                                <p className="text-brand-500 text-sm">Sua chave será usada nos QR Codes e orçamentos</p>
                            </div>
                        </div>
                    )}

                    {/* Card Principal */}
                    <div className="card overflow-hidden">
                        {/* Header do Card */}
                        <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 sm:p-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2.5 rounded-xl">
                                    <QrCode className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold">Chave PIX</h2>
                                    <p className="text-brand-100 text-sm">Receba pagamentos instantaneamente</p>
                                </div>
                            </div>
                        </div>

                        {/* Form Body */}
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Tipo de Chave */}
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    Tipo de Chave
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {[
                                        { value: 'cpf', label: 'CPF' },
                                        { value: 'cnpj', label: 'CNPJ' },
                                        { value: 'email', label: 'Email' },
                                        { value: 'telefone', label: 'Telefone' },
                                        { value: 'aleatoria', label: 'Aleatória' }
                                    ].map((tipo) => (
                                        <button
                                            key={tipo.value}
                                            type="button"
                                            onClick={() => {
                                                setTipoChave(tipo.value as TipoChavePix);
                                                setChavePix('');
                                            }}
                                            className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${tipoChave === tipo.value
                                                ? 'bg-brand-500 text-white shadow-md'
                                                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                                                }`}
                                        >
                                            {tipo.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chave PIX */}
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    Chave PIX
                                </label>
                                <div className="relative">
                                    <input
                                        type={tipoChave === 'email' ? 'email' : 'text'}
                                        value={chavePix}
                                        onChange={(e) => handleChaveChange(e.target.value)}
                                        placeholder={
                                            tipoChave === 'cpf' ? '000.000.000-00' :
                                                tipoChave === 'cnpj' ? '00.000.000/0000-00' :
                                                    tipoChave === 'email' ? 'seu@email.com' :
                                                        tipoChave === 'telefone' ? '(00) 00000-0000' :
                                                            'Cole sua chave aleatória'
                                        }
                                        className="input pr-12 text-base"
                                    />
                                    {chavePix && (
                                        <button
                                            type="button"
                                            onClick={copyToClipboard}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-brand-500 p-1"
                                            title="Copiar"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Nome do Beneficiário */}
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">
                                    Nome do Beneficiário
                                </label>
                                <input
                                    type="text"
                                    value={nomeBeneficiario}
                                    onChange={(e) => setNomeBeneficiario(e.target.value)}
                                    placeholder="Nome que aparecerá para o cliente"
                                    className="input"
                                />
                                <p className="text-xs text-surface-400 mt-1">
                                    Este nome aparecerá no QR Code e no recibo
                                </p>
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={handleSave}
                                disabled={saving || !chavePix.trim()}
                                fullWidth
                                size="lg"
                                className="mt-4"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Salvar Chave PIX
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="card p-4 bg-surface-50">
                        <h4 className="font-semibold text-surface-700 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-surface-400" />
                            Como funciona
                        </h4>
                        <ul className="text-sm text-surface-600 space-y-1.5">
                            <li>• Sua chave PIX será usada para gerar o <strong>QR Code</strong> nos orçamentos</li>
                            <li>• O cliente escaneia e paga <strong>instantaneamente</strong> via PIX</li>
                            <li>• Você recebe o valor no mesmo dia!</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
