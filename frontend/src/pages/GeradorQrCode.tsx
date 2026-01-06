import React, { useState, useEffect, useRef } from 'react';
import { Button, FAB } from '../components/Botao';
import { QrCode, Phone, Globe, Instagram, Download, Palette, MessageCircle, Upload, Save, Trash2, Edit, Plus, X, ArrowLeft } from 'lucide-react';
import { maskPhone } from '../utils/formatadores';
import { useNotification } from '../contexts/ContextoNotificacao';
import qrcodesService, { QRCodeData } from '../services/qrcodesService';

export const GeradorQrCode: React.FC = () => {
    const { notify } = useNotification();
    const [qrcodes, setQrcodes] = useState<QRCodeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [nome, setNome] = useState('');
    const [type, setType] = useState<'whatsapp' | 'instagram' | 'link' | 'tel'>('whatsapp');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [instagramUser, setInstagramUser] = useState('');
    const [url, setUrl] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [logoUrl, setLogoUrl] = useState('');
    const [remoteLogoUrl, setRemoteLogoUrl] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [mensagemRodape, setMensagemRodape] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        fetchQRCodes();
    }, []);

    useEffect(() => {
        if (view === 'FORM') {
            setTimeout(generateCanvas, 100);
        }
    }, [view, type, phone, message, instagramUser, url, color, logoUrl, customMessage, mensagemRodape]);

    const fetchQRCodes = async () => {
        try {
            setLoading(true);
            const data = await qrcodesService.listar();
            setQrcodes(Array.isArray(data) ? data : []);
        } catch (error) {
            notify('Erro ao carregar QR Codes', 'error');
            setQrcodes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setEditingId(null);
        resetForm();
        setView('FORM');
    };

    const handleEdit = (qr: QRCodeData) => {
        setEditingId(qr.id!);
        setNome(qr.nome);
        setType(qr.tipo as any);
        setColor(qr.cor);
        setRemoteLogoUrl(qr.logoBase64 || '');
        setCustomMessage(qr.textoRodape || '');
        setMensagemRodape(qr.textoRodape || '');

        // Fetch image as blob to bypass Zrok interstitial
        if (qr.logoBase64) {
            import('../utils/imageUtils').then(({ fetchImageWithHeaders }) => {
                fetchImageWithHeaders(qr.logoBase64!).then(blobUrl => {
                    setLogoUrl(blobUrl);
                });
            });
        } else {
            setLogoUrl('');
        }

        if (qr.tipo === 'whatsapp') {
            const match = qr.destino.match(/wa\.me\/55(\d+)\?text=(.*)/);
            if (match) {
                setPhone(maskPhone(match[1]));
                setMessage(decodeURIComponent(match[2]));
            }
        } else if (qr.tipo === 'instagram') {
            const match = qr.destino.match(/instagram\.com\/(.*)/);
            if (match) setInstagramUser(match[1]);
        } else if (qr.tipo === 'link') {
            setUrl(qr.destino);
        } else if (qr.tipo === 'tel') {
            const match = qr.destino.match(/tel:(.*)/);
            if (match) setPhone(maskPhone(match[1]));
        }

        setView('FORM');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este QR Code?')) return;
        try {
            await qrcodesService.remover(id);
            notify('QR Code excluído', 'success');
            fetchQRCodes();
        } catch (error) {
            notify('Erro ao excluir', 'error');
        }
    };

    const resetForm = () => {
        setNome('');
        setType('whatsapp');
        setPhone('');
        setMessage('');
        setInstagramUser('');
        setUrl('');
        setColor('#3b82f6');
        setLogoUrl('');
        setRemoteLogoUrl('');
        setCustomMessage('');
        setMensagemRodape('');
    };

    const getPayload = (): string => {
        const cleanPhone = phone.replace(/\D/g, '');
        switch (type) {
            case 'whatsapp': return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
            case 'instagram': return `https://instagram.com/${instagramUser.replace('@', '').trim()}`;
            case 'tel': return `tel:${cleanPhone}`;
            case 'link': return url.startsWith('http') ? url : `https://${url}`;
            default: return '';
        }
    };

    const generateCanvas = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 1000;
        const lineHeight = 60;
        let textHeight = 0;
        let lines: string[] = [];

        // Use mensagemRodape or customMessage (legacy)
        const footerText = mensagemRodape || customMessage;

        if (footerText) {
            ctx.font = 'bold 50px Arial';
            const words = footerText.split(' ');
            let line = '';
            const maxWidth = size - 80;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            textHeight = (lines.length * lineHeight) + 60;
        }

        canvas.width = size;
        canvas.height = size + textHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const payload = getPayload();
        if (!payload) return;

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(payload)}&color=${color.replace('#', '')}&bgcolor=ffffff&margin=2&ecc=H`;

        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        qrImg.src = qrUrl;

        qrImg.onload = () => {
            ctx.drawImage(qrImg, 0, 0, size, size);
            if (logoUrl) {
                const logoImg = new Image();
                logoImg.crossOrigin = "anonymous";
                logoImg.src = logoUrl;
                logoImg.onload = () => {
                    const logoSize = size * 0.22;
                    const x = (size - logoSize) / 2;
                    const y = (size - logoSize) / 2;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x - 10, y - 10, logoSize + 20, logoSize + 20);
                    ctx.drawImage(logoImg, x, y, logoSize, logoSize);
                    drawText(ctx, lines, size, lineHeight);
                };
                logoImg.onerror = () => {
                    drawText(ctx, lines, size, lineHeight);
                };
            } else {
                drawText(ctx, lines, size, lineHeight);
            }
        };
    };

    const drawText = (ctx: CanvasRenderingContext2D, lines: string[], size: number, lineHeight: number) => {
        if (lines.length > 0) {
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            let startY = size + 20;
            lines.forEach((line, index) => {
                ctx.fillText(line.trim(), size / 2, startY + (index * lineHeight));
            });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                // Upload to backend which removes background via Remove.bg API
                const { uploadFile } = await import('../services/uploadService');
                const url = await uploadFile(file, 'logos');

                setRemoteLogoUrl(url); // Save remote URL for database

                // Fetch as blob for display to bypass Zrok interstitial
                const { fetchImageWithHeaders } = await import('../utils/imageUtils');
                const blobUrl = await fetchImageWithHeaders(url);
                setLogoUrl(blobUrl);

                notify('Logo processada com fundo removido!', 'success');
            } catch (error) {
                console.error("Upload error:", error);
                notify('Erro ao fazer upload da logo. Tente novamente.', 'error');
                setLogoUrl('');
                setRemoteLogoUrl('');
                e.target.value = ''; // Reset input
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async () => {
        if (!nome) return notify('Nome é obrigatório', 'error');
        const payload = getPayload();
        if (!payload) return notify('Preencha os dados do destino', 'error');

        // Use mensagemRodape or customMessage (legacy)
        const footerText = mensagemRodape || customMessage;

        const data: QRCodeData = {
            nome,
            tipo: type,
            destino: payload,
            cor: color,
            corFundo: '#ffffff',
            logoBase64: remoteLogoUrl || logoUrl, // Use remote URL if available, otherwise local (fallback)
            tamanho: 1000,
            mensagem: type === 'whatsapp' ? message : undefined,
            textoRodape: footerText
        };

        try {
            if (editingId) {
                await qrcodesService.atualizar(editingId, data);
                notify('QR Code atualizado!', 'success');
            } else {
                await qrcodesService.criar(data);
                notify('QR Code criado!', 'success');
            }
            setView('LIST');
            fetchQRCodes();
        } catch (error) {
            notify('Erro ao salvar', 'error');
        }
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `qrcode-${nome || 'download'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    if (view === 'LIST') {
        return (
            <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                            <QrCode className="w-6 h-6 text-brand-500" />
                            Meus QR Codes
                        </h1>
                        <p className="text-surface-500 text-sm mt-0.5">
                            Gerencie seus códigos para compartilhamento
                        </p>
                    </div>
                    <Button onClick={handleNew} className="hidden sm:flex">
                        <Plus className="w-5 h-5" />
                        <span>Novo QR Code</span>
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : qrcodes.length === 0 ? (
                    <div className="card p-12 text-center">
                        <QrCode className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                        <p className="text-lg font-medium text-surface-600">Nenhum QR Code criado</p>
                        <p className="text-sm text-surface-400 mt-1 mb-4">Crie seu primeiro código</p>
                        <Button onClick={handleNew}>
                            <Plus className="w-4 h-4" />
                            <span>Criar QR Code</span>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {qrcodes.map(qr => (
                            <div key={qr.id} className="card overflow-hidden">
                                <div className="p-4 flex justify-between items-start">
                                    <div className={`p-2 rounded-xl ${qr.tipo === 'whatsapp' ? 'bg-brand-50 text-brand-500' : 'bg-brand-50 text-brand-500'}`}>
                                        {qr.tipo === 'whatsapp' ? <MessageCircle size={20} /> : <Globe size={20} />}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(qr)} className="p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(qr.id!)} className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-4 pb-2">
                                    <h3 className="font-semibold text-surface-800">{qr.nome}</h3>
                                    <p className="text-xs text-surface-400 truncate">{qr.destino}</p>
                                </div>
                                <div className="p-4 pt-2 flex justify-center border-t border-surface-100">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150&data=${encodeURIComponent(qr.destino)}&color=${qr.cor.replace('#', '')}&bgcolor=ffffff&margin=2`}
                                        alt="QR"
                                        className="w-28 h-28"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* FAB Mobile */}
                <FAB
                    icon={<Plus className="w-6 h-6" />}
                    label="Novo QR Code"
                    onClick={handleNew}
                    className="lg:hidden"
                />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => setView('LIST')} className="p-2 hover:bg-surface-100 rounded-xl">
                    <ArrowLeft className="w-5 h-5 text-surface-500" />
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-surface-800">
                    {editingId ? 'Editar QR Code' : 'Novo QR Code'}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="card p-4 sm:p-6 space-y-5">
                        {/* Dados Básicos */}
                        <div>
                            <h3 className="font-semibold text-surface-800 mb-4 pb-2 border-b border-surface-100">1. Dados Principais</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-1.5">Nome do QR Code</label>
                                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: WhatsApp Loja" className="input" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-2">Tipo</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <button onClick={() => setType('whatsapp')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${type === 'whatsapp' ? 'bg-brand-50 border-2 border-brand-500 text-brand-600' : 'bg-surface-50 border-2 border-surface-200 text-surface-600'}`}>
                                            <MessageCircle size={20} />
                                            <span className="text-xs font-medium">WhatsApp</span>
                                        </button>
                                        <button onClick={() => setType('instagram')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${type === 'instagram' ? 'bg-brand-50 border-2 border-brand-500 text-brand-600' : 'bg-surface-50 border-2 border-surface-200 text-surface-600'}`}>
                                            <Instagram size={20} />
                                            <span className="text-xs font-medium">Instagram</span>
                                        </button>
                                        <button onClick={() => setType('link')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${type === 'link' ? 'bg-brand-50 border-2 border-brand-500 text-brand-600' : 'bg-surface-50 border-2 border-surface-200 text-surface-600'}`}>
                                            <Globe size={20} />
                                            <span className="text-xs font-medium">Link</span>
                                        </button>
                                        <button onClick={() => setType('tel')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${type === 'tel' ? 'bg-brand-50 border-2 border-brand-500 text-brand-600' : 'bg-surface-50 border-2 border-surface-200 text-surface-600'}`}>
                                            <Phone size={20} />
                                            <span className="text-xs font-medium">Telefone</span>
                                        </button>
                                    </div>
                                </div>

                                {type === 'whatsapp' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">WhatsApp</label>
                                            <input type="text" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999" className="input" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Mensagem</label>
                                            <textarea value={message} onChange={e => setMessage(e.target.value)} className="input resize-none" rows={2} />
                                        </div>
                                    </>
                                )}
                                {type === 'instagram' && (
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Usuário</label>
                                        <input type="text" value={instagramUser} onChange={e => setInstagramUser(e.target.value)} placeholder="@usuario" className="input" />
                                    </div>
                                )}
                                {type === 'link' && (
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 mb-1.5">URL</label>
                                        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="input" />
                                    </div>
                                )}
                                {type === 'tel' && (
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Telefone</label>
                                        <input type="text" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(11) 9999-9999" className="input" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Personalização */}
                        <div>
                            <h3 className="font-semibold text-surface-800 mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
                                <Palette className="w-4 h-4" /> 2. Personalização
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-1.5">Cor do QR Code</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 cursor-pointer border-2 border-surface-200 rounded-lg" />
                                        <span className="text-sm text-surface-500 font-mono">{color}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-2">Logo Central</label>
                                    <div className="flex items-center gap-3">
                                        {logoUrl ? (
                                            <div className="relative w-16 h-16 rounded-lg border border-surface-200 p-1 bg-white">
                                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                <button
                                                    onClick={() => {
                                                        setLogoUrl('');
                                                        setRemoteLogoUrl('');
                                                    }}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-surface-300 flex items-center justify-center bg-surface-50">
                                                <Upload className="w-6 h-6 text-surface-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <Button
                                                onClick={() => fileInputRef.current?.click()}
                                                variant="secondary"
                                                disabled={isUploading}
                                                className="w-full sm:w-auto"
                                            >
                                                {isUploading ? 'Processando...' : 'Carregar Logo'}
                                            </Button>
                                            <p className="text-xs text-surface-400 mt-1">
                                                Recomendado: PNG transparente quadrado
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-1.5">Mensagem no Rodapé</label>
                                    <input type="text" value={mensagemRodape} onChange={e => setMensagemRodape(e.target.value)} placeholder="Ex: Escaneie para falar" className="input" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="lg:col-span-1">
                    <div className="card p-6 sticky top-6">
                        <h3 className="font-semibold text-surface-800 mb-4 text-center">Preview em Tempo Real</h3>
                        <div className="flex justify-center mb-6">
                            <canvas
                                ref={canvasRef}
                                className="w-full max-w-[280px] h-auto border border-surface-200 rounded-xl shadow-sm"
                            />
                        </div>
                        <p className="text-xs text-center text-surface-400 mb-4">
                            Alta resolução (1000px)
                        </p>
                        <div className="space-y-3">
                            <Button onClick={handleDownload} className="w-full" variant="secondary">
                                <Download className="w-4 h-4" />
                                <span>Baixar PNG</span>
                            </Button>
                            <Button onClick={handleSave} className="w-full">
                                <Save className="w-4 h-4" />
                                <span>Salvar QR Code</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
