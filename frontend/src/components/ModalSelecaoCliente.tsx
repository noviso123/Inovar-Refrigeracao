import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Cliente } from '../types';
import { clienteService } from '../services/clienteService';
import { fetchAddressByCEP } from '../services/servicoCep';
import { maskCPF, maskPhone, maskCEP } from '../utils/formatadores';
import { Search, PlusCircle, X, User, Loader2, Check } from 'lucide-react';
import { Button } from './Botao';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (cliente: Cliente) => void;
}

export const ModalSelecaoCliente: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    const [clients, setClients] = useState<Cliente[]>([]);
    const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New Client Form State
    const [newClientData, setNewClientData] = useState({
        name: '', email: '', cpf: '', phone: '',
        cep: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadClients();
            setIsCreating(false);
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredClients(clients.filter(c =>
                c.nome.toLowerCase().includes(term) ||
                (c.email && c.email.toLowerCase().includes(term)) ||
                (c.cpf && c.cpf.includes(term))
            ));
        } else {
            setFilteredClients(clients);
        }
    }, [searchTerm, clients]);

    const loadClients = async () => {
        setIsLoading(true);
        try {
            const data = await clienteService.listar();
            const safeData = Array.isArray(data) ? data : [];
            setClients(safeData);
            setFilteredClients(safeData);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateClient = async () => {
        if (!newClientData.name) return;
        setIsSaving(true);
        try {
            const newClient = await clienteService.criar({
                nome: newClientData.name,
                email: newClientData.email,
                cpf: newClientData.cpf,
                telefone: newClientData.phone,
                cep: newClientData.cep,
                endereco: `${newClientData.address}, ${newClientData.number}${newClientData.complement ? ` - ${newClientData.complement}` : ''} - ${newClientData.neighborhood}`,
                cidade: newClientData.city,
                estado: newClientData.state,
                ativo: true
            });
            onSelect(newClient);
            onClose();
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            alert('Erro ao criar cliente. Verifique os dados.');
        } finally {
            setIsSaving(false);
        }
    };

    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-blue-50 rounded-t-lg shrink-0">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        {isCreating ? 'Novo Cliente' : 'Selecionar Cliente'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto pb-6">
                    {!isCreating ? (
                        <>
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome, email ou CPF..."
                                        className="w-full border p-2 pl-10 rounded"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                </div>
                                <Button onClick={() => setIsCreating(true)} className="whitespace-nowrap">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Novo Cliente
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredClients.map(client => (
                                        <div
                                            key={client.id}
                                            onClick={() => {
                                                onClose();
                                                // Small delay to allow modal to close animation to start/finish before heavy parent updates
                                                setTimeout(() => onSelect(client), 50);
                                            }}
                                            className="p-3 border rounded hover:bg-blue-50 cursor-pointer transition flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-bold text-gray-800 group-hover:text-blue-800">{client.nome}</div>
                                                <div className="text-sm text-gray-500">{client.email} • {client.telefone}</div>
                                            </div>
                                            <Check className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100" />
                                        </div>
                                    ))}
                                    {filteredClients.length === 0 && (
                                        <div className="text-center p-8 text-gray-500">Nenhum cliente encontrado.</div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input type="text" placeholder="Nome Completo *" className="border p-2 rounded" value={newClientData.name} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} />
                                <input type="email" placeholder="Email" className="border p-2 rounded" value={newClientData.email} onChange={e => setNewClientData({ ...newClientData, email: e.target.value })} />
                                <input type="text" placeholder="CPF" className="border p-2 rounded" value={newClientData.cpf} onChange={e => setNewClientData({ ...newClientData, cpf: maskCPF(e.target.value) })} />
                                <input type="text" placeholder="Telefone" className="border p-2 rounded" value={newClientData.phone} onChange={e => setNewClientData({ ...newClientData, phone: maskPhone(e.target.value) })} />
                            </div>

                            <div className="border-t pt-3">
                                <h4 className="text-sm font-bold text-gray-700 mb-2">Endereço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="CEP"
                                        className="border p-2 rounded"
                                        value={newClientData.cep}
                                        onChange={async e => {
                                            const val = maskCEP(e.target.value);
                                            setNewClientData(prev => ({ ...prev, cep: val }));
                                            if (val.length === 9) {
                                                const addr = await fetchAddressByCEP(val);
                                                if (addr) {
                                                    setNewClientData(prev => ({
                                                        ...prev,
                                                        cep: val,
                                                        address: addr.logradouro,
                                                        neighborhood: addr.bairro,
                                                        city: addr.cidade,
                                                        state: addr.estado
                                                    }));
                                                }
                                            }
                                        }}
                                    />
                                    <input type="text" placeholder="Rua" className="border p-2 rounded md:col-span-2" value={newClientData.address} onChange={e => setNewClientData({ ...newClientData, address: e.target.value })} />
                                    <input type="text" placeholder="Número" className="border p-2 rounded" value={newClientData.number} onChange={e => setNewClientData({ ...newClientData, number: e.target.value })} />
                                    <input type="text" placeholder="Complemento" className="border p-2 rounded" value={newClientData.complement} onChange={e => setNewClientData({ ...newClientData, complement: e.target.value })} />
                                    <input type="text" placeholder="Bairro" className="border p-2 rounded" value={newClientData.neighborhood} onChange={e => setNewClientData({ ...newClientData, neighborhood: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" placeholder="Cidade" className="border p-2 rounded" value={newClientData.city} onChange={e => setNewClientData({ ...newClientData, city: e.target.value })} />
                                        <input type="text" placeholder="UF" className="border p-2 rounded" value={newClientData.state} onChange={e => setNewClientData({ ...newClientData, state: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-2 shrink-0">
                    <Button variant="outline" onClick={() => isCreating ? setIsCreating(false) : onClose()}>
                        {isCreating ? 'Voltar para Lista' : 'Cancelar'}
                    </Button>
                    {isCreating && (
                        <Button onClick={handleCreateClient} disabled={isSaving || !newClientData.name}>
                            {isSaving ? 'Salvando...' : 'Salvar e Selecionar'}
                        </Button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
