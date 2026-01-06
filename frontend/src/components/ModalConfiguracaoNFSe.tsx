import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, Check, AlertTriangle, Lock, FileKey } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../contexts/ContextoNotificacao';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const ModalConfiguracaoNFSe: React.FC<Props> = ({ isOpen, onClose }) => {
    const { notify } = useNotification();
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasCertificate, setHasCertificate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            checkCertificateStatus();
        }
    }, [isOpen]);

    const checkCertificateStatus = async () => {
        try {
            const res = await api.get('/nfse/has-certificate');
            setHasCertificate(res.data.hasCertificate);
        } catch (error) {
            console.error('Erro ao verificar certificado:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.name.endsWith('.pfx') && !selectedFile.name.endsWith('.p12')) {
                notify('Por favor, selecione um arquivo .pfx ou .p12', 'error');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file || !password) {
            notify('Selecione o arquivo e digite a senha.', 'warning');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('certificate', file);
        formData.append('password', password);

        try {
            await api.post('/nfse/upload-certificate', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            notify('Certificado digital configurado com sucesso!', 'success');
            setHasCertificate(true);
            setFile(null);
            setPassword('');
            // onClose(); // Optional: close on success
        } catch (error: any) {
            notify(error.response?.data?.error || 'Erro ao fazer upload do certificado.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FileKey className="w-5 h-5 text-brand-400" />
                        <h3 className="font-bold text-lg">Configurar NFS-e Nacional</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Status do Certificado */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${hasCertificate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                        {hasCertificate ? (
                            <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        )}
                        <div>
                            <h4 className={`font-bold text-sm ${hasCertificate ? 'text-green-800' : 'text-amber-800'}`}>
                                {hasCertificate ? 'Certificado Digital Ativo' : 'Certificado Pendente'}
                            </h4>
                            <p className={`text-xs mt-1 ${hasCertificate ? 'text-green-700' : 'text-amber-700'}`}>
                                {hasCertificate
                                    ? 'Seu sistema está pronto para assinar e emitir notas fiscais.'
                                    : 'Faça o upload do seu certificado A1 para habilitar a emissão de notas.'}
                            </p>
                        </div>
                    </div>

                    {/* Upload Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo do Certificado (.pfx ou .p12)</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pfx,.p12"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="cert-upload"
                                />
                                <label
                                    htmlFor="cert-upload"
                                    className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors group"
                                >
                                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-brand-500" />
                                    <span className="text-sm text-gray-600 group-hover:text-brand-700">
                                        {file ? file.name : 'Clique para selecionar o arquivo'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Certificado</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Digite a senha do certificado"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-[10px] text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <p>🔒 Seus dados são armazenados de forma segura e criptografada.</p>
                        <p>⚠️ O certificado A1 tem validade de 1 ano. Fique atento ao vencimento.</p>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || !password}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Salvando...' : 'Salvar Configuração'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
