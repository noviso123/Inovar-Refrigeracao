import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Equipamento } from '../types';
import { equipamentoService } from '../services/equipamentoService';
import apiService from '../services/api';
import { Search, PlusCircle, X, ThermometerSnowflake, Loader2, Check, Square, CheckSquare } from 'lucide-react';
import { Button } from './Botao';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (equipamento: Equipamento | Equipamento[]) => void;
    clienteId: number | string;
    multiple?: boolean;
}

export const ModalSelecaoEquipamento: React.FC<Props> = ({ isOpen, onClose, onSelect, clienteId, multiple = false }) => {
    const [equipments, setEquipments] = useState<Equipamento[]>([]);
    const [filteredEquipments, setFilteredEquipments] = useState<Equipamento[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Multi-selection state
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    // New Equipment Form State
    const [newEqData, setNewEqData] = useState({
        nome: '',
        tipo: 'Split Hi-Wall',
        marca: 'Samsung',
        modelo: '',
        local: ''
    });

    useEffect(() => {
        if (isOpen && clienteId) {
            loadEquipments();
            setIsCreating(false);
            setSearchTerm('');
            setSelectedIds([]);
        }
    }, [isOpen, clienteId]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredEquipments(equipments.filter(e =>
                e.nome.toLowerCase().includes(term) ||
                (e.marca && e.marca.toLowerCase().includes(term)) ||
                (e.local_instalacao && e.local_instalacao.toLowerCase().includes(term))
            ));
        } else {
            setFilteredEquipments(equipments);
        }
    }, [searchTerm, equipments]);

    const loadEquipments = async () => {
        setIsLoading(true);
        try {
            // Manually fetching with query param since service might not expose it easily
            const response = await apiService.get(`/equipamentos?clienteId=${clienteId}`);
            const data = Array.isArray(response.data) ? response.data : [];
            setEquipments(data);
            setFilteredEquipments(data);
        } catch (error) {
            console.error('Erro ao carregar equipamentos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateEquipment = async () => {
        if (!newEqData.nome) return;
        setIsSaving(true);
        try {
            const newEq = await equipamentoService.criar({
                nome: newEqData.nome,
                tipo_equipamento: newEqData.tipo,
                marca: newEqData.marca,
                modelo: newEqData.modelo,
                local_instalacao: newEqData.local,
                cliente_id: clienteId,
                status: 'ativo'
            });

            if (multiple) {
                // If multiple, add to list and select it
                setEquipments(prev => [...prev, newEq]);
                setFilteredEquipments(prev => [...prev, newEq]); // Assuming search term doesn't filter it out immediately or we reset
                setSelectedIds(prev => [...prev, newEq.id]);
                setIsCreating(false);
            } else {
                // If single, select and close
                onSelect(newEq);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao criar equipamento:', error);
            alert('Erro ao criar equipamento.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSelection = (id: number | string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleConfirmSelection = () => {
        const selectedEqs = equipments.filter(e => selectedIds.includes(e.id));
        onSelect(selectedEqs);
        onClose();
    };

    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-orange-50 rounded-t-lg shrink-0">
                    <h3 className="text-lg font-bold text-orange-900 flex items-center">
                        <ThermometerSnowflake className="w-5 h-5 mr-2" />
                        {isCreating ? 'Novo Equipamento' : (multiple ? 'Selecionar Equipamentos' : 'Selecionar Equipamento')}
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
                                        placeholder="Buscar equipamento..."
                                        className="w-full border p-2 pl-10 rounded"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                </div>
                                <Button onClick={() => setIsCreating(true)} className="whitespace-nowrap bg-orange-600 hover:bg-orange-700">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Novo Equipamento
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredEquipments.map(eq => {
                                        const isSelected = selectedIds.includes(eq.id);
                                        return (
                                            <div
                                                key={eq.id}
                                                onClick={() => {
                                                    if (multiple) {
                                                        toggleSelection(eq.id);
                                                    } else {
                                                        onSelect(eq);
                                                        onClose();
                                                    }
                                                }}
                                                className={`p-3 border rounded cursor-pointer transition flex justify-between items-center group ${isSelected ? 'bg-orange-50 border-orange-300' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {multiple && (
                                                        <div className={`text-orange-600 ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}>
                                                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className={`font-bold ${isSelected ? 'text-orange-900' : 'text-gray-800'}`}>{eq.nome}</div>
                                                        <div className="text-sm text-gray-500">{eq.marca} • {eq.tipo_equipamento} {eq.local_instalacao ? `• ${eq.local_instalacao}` : ''}</div>
                                                    </div>
                                                </div>
                                                {!multiple && <Check className="w-5 h-5 text-orange-600 opacity-0 group-hover:opacity-100" />}
                                            </div>
                                        );
                                    })}
                                    {filteredEquipments.length === 0 && (
                                        <div className="text-center p-8 text-gray-500">
                                            Nenhum equipamento encontrado para este cliente.
                                            <br />
                                            <button onClick={() => setIsCreating(true)} className="text-orange-600 font-bold mt-2 hover:underline">
                                                Cadastrar Primeiro Equipamento
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <input type="text" placeholder="Nome (Ex: Ar Sala de Reunião) *" className="w-full border p-2 rounded" value={newEqData.nome} onChange={e => setNewEqData({ ...newEqData, nome: e.target.value })} />

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                                    <select className="w-full border p-2 rounded" value={newEqData.tipo} onChange={e => setNewEqData({ ...newEqData, tipo: e.target.value })}>
                                        <option value="Split Hi-Wall">Split Hi-Wall</option>
                                        <option value="Split Cassete">Split Cassete</option>
                                        <option value="Split Piso Teto">Split Piso Teto</option>
                                        <option value="ACJ">ACJ</option>
                                        <option value="VRF">VRF</option>
                                        <option value="Chiller">Chiller</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Marca</label>
                                    <select className="w-full border p-2 rounded" value={newEqData.marca} onChange={e => setNewEqData({ ...newEqData, marca: e.target.value })}>
                                        <option value="Samsung">Samsung</option>
                                        <option value="LG">LG</option>
                                        <option value="Daikin">Daikin</option>
                                        <option value="Midea">Midea</option>
                                        <option value="Carrier">Carrier</option>
                                        <option value="Fujitsu">Fujitsu</option>
                                        <option value="Gree">Gree</option>
                                        <option value="Outra">Outra</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Modelo (Opcional)" className="border p-2 rounded" value={newEqData.modelo} onChange={e => setNewEqData({ ...newEqData, modelo: e.target.value })} />
                                <input type="text" placeholder="Local de Instalação (Opcional)" className="border p-2 rounded" value={newEqData.local} onChange={e => setNewEqData({ ...newEqData, local: e.target.value })} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-2 shrink-0">
                    <Button variant="outline" onClick={() => isCreating ? setIsCreating(false) : onClose()}>
                        {isCreating ? 'Voltar para Lista' : 'Cancelar'}
                    </Button>
                    {isCreating ? (
                        <Button onClick={handleCreateEquipment} disabled={isSaving || !newEqData.nome} className="bg-orange-600 hover:bg-orange-700">
                            {isSaving ? 'Salvando...' : 'Salvar e Selecionar'}
                        </Button>
                    ) : (
                        multiple && (
                            <Button onClick={handleConfirmSelection} disabled={selectedIds.length === 0} className="bg-orange-600 hover:bg-orange-700">
                                Confirmar Seleção ({selectedIds.length})
                            </Button>
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
