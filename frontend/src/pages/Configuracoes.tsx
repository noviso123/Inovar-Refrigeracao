import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Botao';
import {
    Settings as SettingsIcon, Bell, Building, Upload,
    Save, CheckCircle, ChevronRight, Loader2,
    MessageCircle, Plus, FileText, Calendar, Link2,
    Wallet, CreditCard, User as UserIcon, MapPin, Lock,
    Camera, PenTool, Eraser, Trash2, Wrench
} from 'lucide-react';
import { SecureImage } from '../components/SecureImage';
import { WhatsAppConnect } from '../components/WhatsAppConnect';
import { useNotification } from '../contexts/ContextoNotificacao';
import { Usuario, Endereco, Equipamento } from '../types';
import api from '../services/api';
import { maskCNPJ, maskPhone, maskCEP, maskCPF } from '../utils/formatadores';
import { fetchAddressByCEP } from '../services/servicoCep';
import { whatsappService, WhatsAppInstance } from '../services/whatsappService';
import { AutomacaoSettings } from './AutomacaoSettings';
import { ModalConfiguracaoNFSe } from '../components/ModalConfiguracaoNFSe';

interface SettingsProps {
    user: Usuario;
    onUpdateUser?: (userId: number | string, updates: Partial<Usuario>) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
    const { notify } = useNotification();
    const [activeSection, setActiveSection] = useState<string>('geral');
    const [isSaving, setIsSaving] = useState(false);

    // Personal Data (Migrated from Profile)
    const [name, setName] = useState(user.nome_completo);
    const [email, setEmail] = useState(user.email);
    const [phone, setPhone] = useState(user.telefone || '');
    const [cpf, setCpf] = useState(user.cpf || '');
    const [avatar, setAvatar] = useState(user.avatar_url || '');
    const [signature, setSignature] = useState(user.signature_url || user.signatureUrl || '');

    // Address (Migrated from Profile)
    const initialAddress = user.enderecos && user.enderecos.length > 0 ? user.enderecos[0] : null;
    const [cep, setCep] = useState(initialAddress?.cep || '');
    const [street, setStreet] = useState(initialAddress?.logradouro || '');
    const [number, setNumber] = useState(initialAddress?.numero || '');
    const [complement, setComplement] = useState(initialAddress?.complemento || '');
    const [neighborhood, setNeighborhood] = useState(initialAddress?.bairro || '');
    const [city, setCity] = useState(initialAddress?.cidade || '');
    const [state, setState] = useState(initialAddress?.estado || '');
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Display URLs for Zrok bypass
    const [displayAvatarUrl, setDisplayAvatarUrl] = useState('');
    const [displayLogoUrl, setDisplayLogoUrl] = useState('');

    // Signature Canvas
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Equipments (Migrated from Profile)
    const [equipments, setEquipments] = useState<Equipamento[]>([]);
    const [newEqName, setNewEqName] = useState('');
    const [newEqType, setNewEqType] = useState<number>(1);
    const [newEqBrand, setNewEqBrand] = useState<number>(1);

    // Dados da Empresa (se prestador/super_admin) - MOVED UP to avoid initialization error
    const [empresa, setEmpresa] = useState({
        nomeFantasia: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        site: '',
        inscricaoEstadual: '',
        logoUrl: ''
    });

    // Catalogs Queries
    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: async () => {
            const res = await api.get('/catalogos/marcas');
            return res.data;
        },
        staleTime: Infinity,
    });

    const { data: types = [] } = useQuery({
        queryKey: ['equipmentTypes'],
        queryFn: async () => {
            const res = await api.get('/catalogos/tipos-equipamento');
            return res.data;
        },
        staleTime: Infinity,
    });

    // Equipments Query
    const { data: fetchedEquipments = [] } = useQuery({
        queryKey: ['userEquipments', user.id],
        queryFn: async () => {
            const res = await api.get(`/equipamentos?usuario_id=${user.id}`);
            return res.data;
        },
    });

    // Sync equipments state
    useEffect(() => {
        if (fetchedEquipments) {
            setEquipments(fetchedEquipments);
        }
    }, [fetchedEquipments]);

    // Load Zrok images - moved after empresa initialization
    useEffect(() => {
        const loadImages = async () => {
            const { fetchImageWithHeaders } = await import('../utils/imageUtils');
            if (user.avatar_url) {
                const url = await fetchImageWithHeaders(user.avatar_url);
                setDisplayAvatarUrl(url);
            }
        };
        loadImages();
    }, [user.avatar_url]);

    // Load empresa logo separately to avoid undefined reference
    useEffect(() => {
        const loadLogoImage = async () => {
            if (empresa?.logoUrl && !empresa.logoUrl.startsWith('data:')) {
                const { fetchImageWithHeaders } = await import('../utils/imageUtils');
                const url = await fetchImageWithHeaders(empresa.logoUrl);
                setDisplayLogoUrl(url);
            } else if (empresa?.logoUrl) {
                setDisplayLogoUrl(empresa.logoUrl);
            }
        };
        loadLogoImage();
    }, [empresa?.logoUrl]);

    // Signature Logic
    useEffect(() => {
        if (activeSection === 'assinatura_digital' && canvasRef.current && signature) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = signature;
            }
        }
    }, [activeSection, signature]);

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = maskCEP(e.target.value);
        setCep(value);
        if (value.length === 9) {
            setIsLoadingCep(true);
            const addressData = await fetchAddressByCEP(value);
            setIsLoadingCep(false);
            if (addressData) {
                setStreet(addressData.logradouro || '');
                setNeighborhood(addressData.bairro || '');
                setCity(addressData.cidade || '');
                setState(addressData.estado || '');
                document.getElementById('address-number')?.focus();
            }
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });

                if (type === 'avatar') {
                    setDisplayAvatarUrl(dataUrl);
                    setAvatar(dataUrl); // Temporary, will be replaced by URL after upload
                } else {
                    setDisplayLogoUrl(dataUrl);
                    setEmpresa(prev => ({ ...prev, logoUrl: dataUrl }));
                }

                const { uploadFile } = await import('../services/uploadService');
                // For logo, use 'logos' bucket to trigger background removal
                const bucket = type === 'avatar' ? 'avatars' : 'logos';
                const url = await uploadFile(file, bucket);

                if (type === 'avatar') {
                    setAvatar(url);
                    // Update display with new URL (fetch with headers if needed, but usually local blob is fine for now)
                } else {
                    setEmpresa(prev => ({ ...prev, logoUrl: url }));
                }
                notify('Imagem enviada!', 'success');
            } catch (error) {
                notify('Erro ao fazer upload.', 'error');
            }
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) setSignature(canvasRef.current.toDataURL());
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setSignature('');
        }
    };

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Configurações Gerais
    const [notificacoes, setNotificacoes] = useState(false);

    // Configurações Fiscais
    const [nfseAtivo, setNfseAtivo] = useState(false);
    const [ambienteFiscal, setAmbienteFiscal] = useState<'homologacao' | 'producao'>('homologacao');
    const [codigoServico, setCodigoServico] = useState('14.01');
    const [aliquotaISS, setAliquotaISS] = useState('2.00');
    const [certificadoNome, setCertificadoNome] = useState('');
    const [certificadoSenha, setCertificadoSenha] = useState('');
    const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
    const [showCertModal, setShowCertModal] = useState(false);

    // Dados da Empresa já declarado acima para evitar erro de inicialização

    // WhatsApp State
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [creatingWhatsApp, setCreatingWhatsApp] = useState(false);

    const isAdmin = user?.cargo === 'admin';
    const isPrestador = user?.cargo === 'prestador';

    const queryClient = useQueryClient();

    // Company Query
    const { data: companyData } = useQuery({
        queryKey: ['company', 'me'],
        queryFn: async () => {
            const res = await api.get('/empresas/me');
            return res.data;
        },
        enabled: !!isAdmin,
    });

    // Sync company state
    useEffect(() => {
        if (companyData) {
            setEmpresa({
                nomeFantasia: companyData.nomeFantasia || companyData.nome_fantasia || '',
                cnpj: companyData.cnpj || '',
                email: companyData.email || companyData.emailContato || companyData.email_contato || '',
                telefone: companyData.telefone || companyData.telefoneContato || companyData.telefone_contato || '',
                endereco: companyData.enderecoCompleto || companyData.endereco_completo || '',
                site: companyData.site || '',
                inscricaoEstadual: companyData.inscricaoEstadual || companyData.inscricao_estadual || '',
                logoUrl: companyData.logoUrl || companyData.logo_url || ''
            });
            setNfseAtivo(companyData.nfseAtivo || false);
            setCertificadoNome(companyData.certificadoNome || '');
            setInscricaoMunicipal(companyData.inscricaoMunicipal || '');
            setCodigoServico(companyData.codigoServico || '14.01');
            setAliquotaISS(companyData.aliquotaISS || '2.00');
            setAmbienteFiscal(companyData.ambienteFiscal || 'homologacao');
        }
    }, [companyData]);

    // Load empresa data function
    const loadEmpresaData = async () => {
        try {
            const res = await api.get('/empresas/me');
            const data = res.data;
            setEmpresa({
                nomeFantasia: data.nomeFantasia || data.nome_fantasia || '',
                cnpj: data.cnpj || '',
                email: data.email || data.emailContato || data.email_contato || '',
                telefone: data.telefone || data.telefoneContato || data.telefone_contato || '',
                endereco: data.enderecoCompleto || data.endereco_completo || '',
                site: data.site || '',
                inscricaoEstadual: data.inscricaoEstadual || data.inscricao_estadual || '',
                logoUrl: data.logoUrl || data.logo_url || ''
            });
            setNfseAtivo(data.nfseAtivo || false);
            setCertificadoNome(data.certificadoNome || '');
            setInscricaoMunicipal(data.inscricaoMunicipal || '');
            setCodigoServico(data.codigoServico || '14.01');
            setAliquotaISS(data.aliquotaISS || '2.00');
            setAmbienteFiscal(data.ambienteFiscal || 'homologacao');
        } catch (error) {
            console.error('Erro ao carregar dados da empresa:', error);
        }
    };

    useEffect(() => {
        loadConfiguracoesGerais();
    }, [user]);

    const loadConfiguracoesGerais = () => {
        // Verificar se notificações estão permitidas
        if ('Notification' in window) {
            setNotificacoes(Notification.permission === 'granted');
        }
    };

    // WhatsApp Functions
    const getInstanceName = () => {
        if (!user) return '';
        const name = user.nome_completo || 'User';
        return name.replace(/[^a-zA-Z0-9]/g, '');
    };

    // WhatsApp Query
    const { data: whatsAppInstances = [], isLoading: loadingWhatsApp } = useQuery({
        queryKey: ['whatsapp-instances'],
        queryFn: async () => {
            const data = await whatsappService.getInstances();
            const myInstanceName = getInstanceName();
            const allInstances = Array.isArray(data) ? data : [];
            return allInstances.filter((inst: any) =>
                inst.instance?.instanceName === myInstanceName
            );
        },
        enabled: activeSection === 'whatsapp',
    });

    // Sync instances state
    useEffect(() => {
        if (whatsAppInstances) {
            setInstances(whatsAppInstances);
        }
    }, [whatsAppInstances]);

    const handleCreateInstance = async () => {
        const instanceName = getInstanceName();
        if (!instanceName) {
            notify('Erro ao identificar usuário.', 'error');
            return;
        }

        setCreatingWhatsApp(true);
        try {
            await whatsappService.createInstance(instanceName);
            notify('Conexão criada com sucesso!', 'success');
            queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
        } catch (error) {
            notify('Erro ao criar conexão.', 'error');
        } finally {
            setCreatingWhatsApp(false);
        }
    };

    const handleDeleteInstance = async (instanceName: string) => {
        if (!confirm(`Tem certeza que deseja excluir a conexão "${instanceName}"?`)) return;

        try {
            await whatsappService.deleteInstance(instanceName);
            notify('Conexão removida com sucesso.', 'success');
            queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
        } catch (error) {
            notify('Erro ao remover conexão.', 'error');
        }
    };

    const handleRequestNotifications = async () => {
        if (!('Notification' in window)) {
            notify('Seu navegador não suporta notificações', 'warning');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificacoes(true);
                notify('Notificações ativadas com sucesso!', 'success');
                // Mostrar notificação de teste
                new Notification('Inovar Refrigeração', {
                    body: 'Notificações ativadas! Você receberá alertas importantes.',
                    icon: '/favicon.ico'
                });
            } else {
                setNotificacoes(false);
                notify('Permissão de notificações negada', 'warning');
            }
        } catch (error) {
            notify('Erro ao solicitar permissão de notificações', 'error');
        }
    };

    const handleCertificadoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
            notify('Arquivo deve ser .pfx ou .p12', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB max
            notify('Arquivo muito grande. Máximo 10MB.', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append('certificado', file);
            if (certificadoSenha) {
                formData.append('senha', certificadoSenha);
            }

            // Upload para o servidor
            const response = await api.post('/empresas/certificado', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setCertificadoNome(file.name);
                notify('Certificado digital enviado com sucesso!', 'success');
            } else {
                notify(response.data.error || 'Erro ao enviar certificado', 'error');
            }
        } catch (error: any) {
            // Se a rota não existir, apenas salvar localmente o nome
            setCertificadoNome(file.name);
            notify('Certificado selecionado. Configure a senha e salve.', 'info');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });

                setEmpresa(prev => ({ ...prev, logoUrl: dataUrl }));

                const { uploadFile } = await import('../services/uploadService');
                const url = await uploadFile(file, 'logos');
                setEmpresa(prev => ({ ...prev, logoUrl: url }));
                queryClient.invalidateQueries({ queryKey: ['company', 'me'] });
                notify('Logo enviada!', 'success');
            } catch (error) {
                notify('Erro ao fazer upload da logo.', 'error');
            }
        }
    };

    const handleAddEquipment = async () => {
        if (!newEqName) return;
        try {
            const newEq = { nome: newEqName, id_tipo: newEqType, id_marca: newEqBrand, usuario_id: user.id };
            await api.post('/equipamentos', newEq);
            queryClient.invalidateQueries({ queryKey: ['userEquipments', user.id] });
            setNewEqName('');
            notify('Equipamento adicionado!', 'success');
        } catch (error) {
            notify('Erro ao adicionar equipamento.', 'error');
        }
    };

    const handleRemoveEquipment = async (id: number | string) => {
        if (!confirm('Remover este equipamento?')) return;
        try {
            await api.delete(`/equipamentos/${id}`);
            queryClient.invalidateQueries({ queryKey: ['userEquipments', user.id] });
            notify('Equipamento removido.', 'success');
        } catch (error) {
            notify('Erro ao remover.', 'error');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save Personal Data if onUpdateUser is provided
            if (onUpdateUser) {
                const updates: any = {
                    nomeCompleto: name,
                    email: email,
                    telefone: phone,
                    cpf: cpf,
                    avatarUrl: avatar,
                    assinaturaBase64: signature,
                    endereco: { cep, logradouro: street, numero: number, complemento: complement, bairro: neighborhood, cidade: city, estado: state }
                };
                await onUpdateUser(user.id, updates);

                if (password && password.length >= 6) {
                    if (password !== confirmPassword) {
                        notify('As senhas não conferem.', 'error');
                        return;
                    }
                    await api.put('/usuarios/me/senha', { novaSenha: password });
                    setPassword('');
                    setConfirmPassword('');
            // Upload signature if changed and is base64
            let finalSignatureUrl = signature;
            if (signature && signature.startsWith('data:image')) {
                 const { uploadFile } = await import('../services/uploadService');
                 const res = await fetch(signature);
                 const blob = await res.blob();
                 const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
                 finalSignatureUrl = await uploadFile(file, 'signatures');
            }

            const payload = {
                nome_completo: name,
                email: email,
                telefone: phone,
                cpf: cpf,
                avatar_url: avatar,
                signature_url: finalSignatureUrl, // Renamed
                endereco: {
                    cep: cep,
                    logradouro: street,
                    numero: number,
                    complemento: complement,
                    bairro: neighborhood,
                    cidade: city,
                    estado: state
                }
            };

            await api.put('/usuarios/me', payload);

            // Reload user data to context
            // Assuming updateUser updates the context
            updateUser({
                ...user,
                nome_completo: name,
                email: email,
                telefone: phone,
                cpf: cpf,
                avatar_url: avatar,
                assinaturaBase64: finalSignatureUrl, // Keep original field name for context
                cep: cep,
                logradouro: street,
                numero: number,
                complemento: complement,
                bairro: neighborhood,
                cidade: city,
                estado: state
            });

            notify('Perfil atualizado com sucesso!', 'success');
            // setMode('VIEW'); // Assuming setMode is defined elsewhere if needed

            if (password && password.length >= 6) {
                if (password !== confirmPassword) {
                    notify('As senhas não conferem.', 'error');
                    return;
                }
                await api.put('/usuarios/me/senha', { novaSenha: password });
                setPassword('');
                setConfirmPassword('');
            }

            // Salvar dados da empresa se aplicável
            if (isAdmin || isPrestador) {
                await api.put('/empresas/me', {
                    nomeFantasia: empresa.nomeFantasia,
                    cnpj: empresa.cnpj,
                    email: empresa.email,
                    telefone: empresa.telefone,
                    site: empresa.site,
                    inscricaoEstadual: empresa.inscricaoEstadual,
                    enderecoCompleto: empresa.endereco,
                    logoUrl: empresa.logoUrl,
                    nfseAtivo: nfseAtivo,
                    certificadoNome: certificadoNome,
                    inscricaoMunicipal: inscricaoMunicipal,
                    codigoServico: codigoServico,
                    aliquotaISS: aliquotaISS,
                    ambienteFiscal: ambienteFiscal
                });
                queryClient.invalidateQueries({ queryKey: ['company', 'me'] });
            }

            notify('Configurações salvas com sucesso!', 'success');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            notify('Erro ao salvar configurações', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const sections = [
        { id: 'geral', label: 'Dados Pessoais', icon: UserIcon },
        { id: 'endereco', label: 'Endereço', icon: MapPin },
        { id: 'seguranca', label: 'Segurança', icon: Lock },
        { id: 'assinatura_digital', label: 'Assinatura Digital', icon: PenTool },
        { id: 'equipamentos', label: 'Equipamentos', icon: Wrench },
        ...(isAdmin ? [{ id: 'empresa', label: 'Dados da Empresa', icon: Building }] : []),
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
        { id: 'notificacoes', label: 'Notificações', icon: Bell },
        ...(isAdmin ? [{ id: 'fiscal', label: 'NFS-e', icon: FileText }] : []),
        { id: 'automacao', label: 'Automação', icon: SettingsIcon },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
    ];

    return (
        <div className="min-h-screen bg-surface-50 pb-24 lg:pb-8">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white border-b border-surface-200 p-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-surface-800 flex items-center gap-2">
                    <SettingsIcon className="w-6 h-6 text-brand-500" />
                    Configurações
                </h1>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-4 lg:py-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center gap-4 mb-6">
                    <div className="p-3 bg-brand-100 rounded-xl">
                        <SettingsIcon className="w-8 h-8 text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-surface-800">Configurações</h1>
                        <p className="text-sm text-surface-500">Gerencie suas preferências e integrações</p>
                    </div>
                </div>

                {/* Mobile Section Tabs */}
                <div className="lg:hidden flex overflow-x-auto gap-2 pb-4 scrollbar-hide mb-4">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition ${activeSection === section.id
                                ? 'bg-brand-500 text-white'
                                : 'bg-white text-surface-600 border border-surface-200'
                                }`}
                        >
                            <section.icon className="w-4 h-4" />
                            {section.label}
                        </button>
                    ))}
                </div>

                <div className="lg:grid lg:grid-cols-4 lg:gap-6">
                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block">
                        <nav className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
                            {sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition ${activeSection === section.id
                                        ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-500'
                                        : 'text-surface-600 hover:bg-surface-50'
                                        }`}
                                >
                                    <section.icon className="w-5 h-5" />
                                    {section.label}
                                    <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Dados Pessoais */}
                        {activeSection === 'geral' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <UserIcon className="w-5 h-5 text-brand-500" /> Dados Pessoais
                                </h2>
                                <div className="flex justify-center mb-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                                            {displayAvatarUrl || avatar ? (
                                                <SecureImage src={displayAvatarUrl || avatar} alt={name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-brand-100 flex items-center justify-center text-brand-600 text-3xl font-bold">
                                                    {name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 bg-brand-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-brand-700 transition">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                                            <Camera className="w-4 h-4" />
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">Nome Completo</label>
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">Email</label>
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">CPF</label>
                                            <input type="text" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} maxLength={14} readOnly={user.cargo !== 'admin'} className={`w-full border border-surface-200 rounded-xl py-3 px-4 ${user.cargo !== 'admin' ? 'bg-surface-100 cursor-not-allowed' : ''}`} placeholder="000.000.000-00" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Telefone</label>
                                            <input type="text" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Endereço */}
                        {activeSection === 'endereco' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-brand-500" /> Endereço Pessoal
                                </h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">CEP</label>
                                            <div className="relative">
                                                <input type="text" value={cep} onChange={handleCepChange} maxLength={9} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                                {isLoadingCep && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-brand-600" />}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Rua</label>
                                            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Número</label>
                                            <input id="address-number" type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Complemento</label>
                                            <input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Bairro</label>
                                            <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Cidade</label>
                                            <input type="text" value={city} readOnly className="w-full border border-surface-200 rounded-xl py-3 px-4 bg-surface-100 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">UF</label>
                                            <input type="text" value={state} readOnly className="w-full border border-surface-200 rounded-xl py-3 px-4 bg-surface-100 cursor-not-allowed" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Segurança */}
                        {activeSection === 'seguranca' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-brand-500" /> Segurança
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">Nova Senha</label>
                                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" placeholder="Deixe em branco para manter" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">Confirmar Nova Senha</label>
                                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-surface-200 rounded-xl py-3 px-4" placeholder="Repita a senha" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Assinatura Digital */}
                        {activeSection === 'assinatura_digital' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <PenTool className="w-5 h-5 text-brand-500" /> Assinatura Digital
                                </h2>
                                <div className="flex flex-col items-center">
                                    <div className="w-full border-2 border-dashed border-surface-300 rounded-xl bg-surface-50 overflow-hidden touch-none">
                                        <canvas ref={canvasRef} width={350} height={150} className="w-full cursor-crosshair"
                                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <Button variant="secondary" onClick={clearSignature} size="sm"><Eraser className="w-4 h-4 mr-2" /> Limpar</Button>
                                    </div>
                                    <p className="text-xs text-surface-500 mt-2">Esta assinatura será usada nos documentos.</p>
                                </div>
                            </div>
                        )}

                        {/* Equipamentos */}
                        {activeSection === 'equipamentos' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-brand-500" /> Equipamentos
                                </h2>
                                <div className="space-y-3 mb-6">
                                    {equipments.map(eq => (
                                        <div key={eq.id} className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
                                            <div>
                                                <p className="font-bold text-surface-800">{eq.nome}</p>
                                                <p className="text-sm text-surface-500">{brands.find(b => b.id === eq.id_marca)?.nome} - {types.find(t => t.id === eq.id_tipo)?.nome}</p>
                                            </div>
                                            <button onClick={() => handleRemoveEquipment(eq.id!)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {equipments.length === 0 && <p className="text-surface-400 text-center py-4">Nenhum equipamento cadastrado.</p>}
                                </div>
                                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                                    <p className="text-sm font-bold text-surface-700 mb-3">Adicionar Novo</p>
                                    <div className="space-y-3">
                                        <input type="text" placeholder="Nome (Ex: Sala de Estar)" value={newEqName} onChange={e => setNewEqName(e.target.value)} className="w-full border border-surface-200 p-3 rounded-xl" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <select value={newEqType} onChange={e => setNewEqType(parseInt(e.target.value))} className="border border-surface-200 p-3 rounded-xl">
                                                {types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                            </select>
                                            <select value={newEqBrand} onChange={e => setNewEqBrand(parseInt(e.target.value))} className="border border-surface-200 p-3 rounded-xl">
                                                {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                                            </select>
                                        </div>
                                        <Button onClick={handleAddEquipment} className="w-full"><Plus className="w-4 h-4 mr-2" /> Adicionar</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Empresa */}
                        {activeSection === 'empresa' && isAdmin && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <Building className="w-5 h-5 text-brand-500" /> Dados da Empresa
                                </h2>

                                <div className="flex justify-center mb-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-surface-300 flex items-center justify-center overflow-hidden bg-surface-50">
                                            {displayLogoUrl || empresa.logoUrl ? (
                                                <SecureImage src={displayLogoUrl || empresa.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-surface-400 text-xs text-center px-2">Logo</span>
                                            )}
                                        </div>
                                        <label className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full shadow border cursor-pointer hover:bg-surface-50 transition">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                            <Plus className="w-3 h-3 text-brand-600" />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">Nome Fantasia</label>
                                        <input
                                            type="text"
                                            value={empresa.nomeFantasia}
                                            onChange={e => setEmpresa({ ...empresa, nomeFantasia: e.target.value })}
                                            className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">CNPJ</label>
                                            <input
                                                type="text"
                                                value={empresa.cnpj}
                                                onChange={e => setEmpresa({ ...empresa, cnpj: maskCNPJ(e.target.value) })}
                                                maxLength={18}
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                                placeholder="00.000.000/0000-00"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-surface-600 mb-1 block">Telefone</label>
                                            <input
                                                type="text"
                                                value={empresa.telefone}
                                                onChange={e => setEmpresa({ ...empresa, telefone: maskPhone(e.target.value) })}
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">E-mail de Contato</label>
                                        <input
                                            type="email"
                                            value={empresa.email}
                                            onChange={e => setEmpresa({ ...empresa, email: e.target.value })}
                                            className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-surface-600 mb-1 block">Endereço Completo</label>
                                        <input
                                            type="text"
                                            value={empresa.endereco}
                                            onChange={e => setEmpresa({ ...empresa, endereco: e.target.value })}
                                            className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                            placeholder="Rua, Número, Bairro, Cidade - UF"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WhatsApp */}
                        {activeSection === 'whatsapp' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-surface-800 flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5 text-brand-500" /> Integração WhatsApp
                                    </h2>
                                    {instances.length === 0 && !loadingWhatsApp && (
                                        <Button onClick={handleCreateInstance} disabled={creatingWhatsApp} size="sm">
                                            {creatingWhatsApp ? 'Criando...' : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Nova Conexão
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {loadingWhatsApp ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                    </div>
                                ) : instances.length === 0 ? (
                                    <div className="text-center py-8 bg-surface-50 rounded-xl border border-surface-100">
                                        <MessageCircle className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                                        <p className="text-surface-600 font-medium">Nenhuma conexão ativa</p>
                                        <p className="text-sm text-surface-400 mb-4">Conecte seu WhatsApp para enviar mensagens automáticas</p>
                                        <Button onClick={handleCreateInstance} disabled={creatingWhatsApp}>
                                            {creatingWhatsApp ? 'Criando...' : 'Criar Minha Conexão'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
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
                        )}

                        {/* Notificações */}
                        {activeSection === 'notificacoes' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-brand-500" /> Notificações
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-surface-100">
                                        <div>
                                            <p className="font-medium text-surface-800">Notificações Push</p>
                                            <p className="text-sm text-surface-500">Receba alertas de novas OS e mensagens</p>
                                        </div>
                                        {notificacoes ? (
                                            <span className="flex items-center gap-1 text-brand-600 text-sm font-medium">
                                                <CheckCircle className="w-4 h-4" /> Ativadas
                                            </span>
                                        ) : (
                                            <Button
                                                onClick={handleRequestNotifications}
                                                variant="secondary"
                                                className="text-sm"
                                            >
                                                Ativar
                                            </Button>
                                        )}
                                    </div>
                                    {!notificacoes && (
                                        <p className="text-xs text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                                            Clique em "Ativar" e permita notificações quando o navegador solicitar.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fiscal */}
                        {activeSection === 'fiscal' && isAdmin && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5">
                                <h2 className="text-lg font-bold text-surface-800 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-brand-500" /> Emissão de NFS-e
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-surface-100">
                                        <div>
                                            <p className="font-medium text-surface-800">Habilitar NFS-e</p>
                                            <p className="text-sm text-surface-500">Emitir notas fiscais automaticamente</p>
                                        </div>
                                        <button
                                            onClick={() => setNfseAtivo(!nfseAtivo)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${nfseAtivo ? 'bg-brand-500' : 'bg-surface-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nfseAtivo ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {nfseAtivo && (
                                        <div className="space-y-4 pt-2">
                                            {/* Certificado Digital */}
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <label className="text-sm font-bold text-blue-800 block">Certificado Digital A1</label>
                                                    {certificadoNome && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Configurado
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-blue-600 mb-3">
                                                    Necessário para assinar digitalmente as notas fiscais (Padrão Nacional).
                                                </p>

                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <button
                                                        onClick={() => setShowCertModal(true)}
                                                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition w-full sm:w-auto"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Configurar Certificado</span>
                                                    </button>
                                                </div>
                                                {certificadoNome && (
                                                    <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                                                        Arquivo atual: <span className="font-mono">{certificadoNome}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-surface-600 mb-1 block">Ambiente</label>
                                                    <select
                                                        value={ambienteFiscal}
                                                        onChange={e => setAmbienteFiscal(e.target.value as any)}
                                                        className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                                    >
                                                        <option value="homologacao">Homologação (Testes)</option>
                                                        <option value="producao">Produção</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-surface-600 mb-1 block">Inscrição Municipal</label>
                                                    <input
                                                        type="text"
                                                        value={inscricaoMunicipal}
                                                        onChange={e => setInscricaoMunicipal(e.target.value)}
                                                        className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                                        placeholder="Número da IM"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-surface-600 mb-1 block">Código do Serviço (CNAE)</label>
                                                    <input
                                                        type="text"
                                                        value={codigoServico}
                                                        onChange={e => setCodigoServico(e.target.value)}
                                                        className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                                        placeholder="14.01"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-surface-600 mb-1 block">Alíquota ISS (%)</label>
                                                    <input
                                                        type="text"
                                                        value={aliquotaISS}
                                                        onChange={e => setAliquotaISS(e.target.value)}
                                                        className="w-full border border-surface-200 rounded-xl py-3 px-4"
                                                        placeholder="2.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                                <p className="text-xs text-yellow-800">
                                                    <strong>Importante:</strong> O certificado digital A1 e inscrição municipal são obrigatórios para emissão de NFS-e oficial.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {activeSection === 'automacao' && (
                            <AutomacaoSettings user={user} />
                        )}

                        {/* Agenda / Google Calendar */}
                        {activeSection === 'agenda' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-surface-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-xl">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-surface-800">Integração com Agenda</h3>
                                            <p className="text-sm text-surface-500">Sincronize seus agendamentos com o Google Calendar</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 sm:p-6 space-y-6">
                                    {/* Status da Conexão */}
                                    <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-medium text-surface-800">Google Calendar</p>
                                                <p className="text-sm text-surface-500">
                                                    {user?.google_email ? (
                                                        <span className="text-green-600">Conta vinculada: {user.google_email}</span>
                                                    ) : (
                                                        <span className="text-yellow-600">Não conectado</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={async () => {
                                                const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                                                if (!clientId) {
                                                    notify('Google Client ID não configurado.', 'error');
                                                    return;
                                                }

                                                // Carregar Google Identity Services
                                                const script = document.createElement('script');
                                                script.src = 'https://accounts.google.com/gsi/client';
                                                script.async = true;
                                                script.defer = true;

                                                script.onload = () => {
                                                    // @ts-ignore
                                                    const client = google.accounts.oauth2.initCodeClient({
                                                        client_id: clientId,
                                                        scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
                                                        ux_mode: 'popup',
                                                        callback: async (response: any) => {
                                                            if (response.code) {
                                                                try {
                                                                    const res = await api.post('/auth/google/link', {
                                                                        code: response.code,
                                                                        type: 'auth_code'
                                                                    });
                                                                    const data = res.data;

                                                                    if (data.success) {
                                                                        notify('Conta Google vinculada com sucesso!', 'success');
                                                                        // Atualizar usuário no localStorage
                                                                        if (data.user) {
                                                                            localStorage.setItem('user', JSON.stringify(data.user));
                                                                        }
                                                                        window.location.reload();
                                                                    } else {
                                                                        notify(data.error || 'Erro ao vincular conta', 'error');
                                                                    }
                                                                } catch (err: any) {
                                                                    console.error('Erro ao vincular Google:', err);
                                                                    notify('Erro ao vincular conta: ' + err.message, 'error');
                                                                }
                                                            }
                                                        },
                                                    });
                                                    client.requestCode();
                                                };

                                                script.onerror = () => {
                                                    notify('Erro ao carregar Google Identity Services', 'error');
                                                };

                                                document.body.appendChild(script);
                                            }}
                                            className={user?.google_email ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                                        >
                                            <Link2 className="w-4 h-4 mr-2" />
                                            {user?.google_email ? 'Reconectar' : 'Vincular Conta'}
                                        </Button>
                                    </div>

                                    {/* Opções de Sincronização */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-surface-700 uppercase">Sincronização Automática</h4>

                                        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
                                            <div>
                                                <p className="font-medium text-surface-800">Criar evento ao agendar OS</p>
                                                <p className="text-sm text-surface-500">Cria automaticamente um evento no Google Calendar</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
                                            <div>
                                                <p className="font-medium text-surface-800">Lembrete 1 dia antes</p>
                                                <p className="text-sm text-surface-500">Notificação via Google Calendar</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                        <p className="text-xs text-blue-800">
                                            <strong>Como funciona:</strong> Ao vincular sua conta Google, os agendamentos de serviços serão automaticamente sincronizados com seu Google Calendar. Você receberá lembretes e poderá gerenciar a agenda diretamente pelo Google Calendar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Save Button - Only for sections that use main handleSave */}
            {['geral', 'endereco', 'seguranca', 'assinatura_digital', 'empresa', 'fiscal'].includes(activeSection) && (
                <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-auto z-50">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full lg:w-auto bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-xl shadow-lg shadow-brand-600/30"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </div>
            )}

            <ModalConfiguracaoNFSe
                isOpen={showCertModal}
                onClose={() => {
                    setShowCertModal(false);
                    loadEmpresaData(); // Reload to check if cert was uploaded
                }}
            />
        </div>
    );
};
