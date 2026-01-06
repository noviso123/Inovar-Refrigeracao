import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ItemOS } from '../types';
import { Button } from './Botao';
import { Plus, Trash2, X, Save, Wrench } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    items: ItemOS[];
    onSave: (items: ItemOS[], description: string, taxAmount: number) => void;
    initialDescription?: string;
    availableEquipments?: { id: number | string; nome: string; marca?: string; modelo?: string }[];
    initialTax?: number;
}

export const ModalEditorOrcamento: React.FC<Props> = ({
    isOpen, onClose, items, onSave, initialDescription = '', availableEquipments = [], initialTax = 0
}) => {
    useBodyScrollLock(isOpen);
    const [localItems, setLocalItems] = useState<ItemOS[]>(items);
    const [quoteDesc, setQuoteDesc] = useState(initialDescription);

    // New Item State
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState<string>('1');
    const [newItemPrice, setNewItemPrice] = useState<string>('');
    const [newItemEquipId, setNewItemEquipId] = useState<string>(
        availableEquipments.length > 0 ? availableEquipments[0].id.toString() : ''
    );


    // Pre-select first equipment when availableEquipments changes
    useEffect(() => {
        if (availableEquipments.length > 0 && !newItemEquipId) {
            setNewItemEquipId(availableEquipments[0].id.toString());
        }
    }, [availableEquipments]);

    const handleAddItem = () => {
        if (!newItemDesc || !newItemPrice || !newItemQty || !newItemEquipId) {
            return;
        }
        const qty = parseFloat(newItemQty);
        const price = parseFloat(newItemPrice);

        // Handle both string and number IDs
        const equipId = newItemEquipId;
        const selectedEquip = availableEquipments.find(e => e.id.toString() === equipId);
        const equipName = selectedEquip?.nome;

        const newItem: ItemOS = {
            id: Date.now(),
            solicitacao_id: 0,
            descricao_tarefa: newItemDesc,
            quantidade: qty,
            valor_unitario: price,
            valor_total: qty * price,
            status_item: 'pendente',
            criado_em: new Date().toISOString(),
            equipamento_id: selectedEquip ? selectedEquip.id : undefined,
            equipamentos: selectedEquip ? {
                id: selectedEquip.id,
                nome: equipName || '',
                marca: selectedEquip.marca || '',
                modelo: selectedEquip.modelo || ''
            } : undefined
        };
        setLocalItems([...localItems, newItem]);
        setNewItemDesc('');
        setNewItemQty('1');
        setNewItemPrice('');
    };

    const handleRemoveItem = (id: number) => {
        setLocalItems(localItems.filter(i => i.id !== id));
    };

    const calculateTotal = () => localItems.reduce((acc, item) => acc + (item.valor_total || 0), 0);

    const total = calculateTotal();

    // Don't render if not open
    if (!isOpen) return null;



    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-surface-200 flex items-center gap-3 bg-white shrink-0">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-surface-100 rounded-xl transition-colors text-surface-500"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-brand-500" />
                    <h3 className="text-lg font-bold text-surface-800">Editor de Orçamento</h3>
                </div>
            </div>

            {/* Body - fills all remaining space */}
            <div id="modal-editor-content" className="flex-1 overflow-y-auto p-4 bg-surface-50">

                {/* Add Item Form */}
                <div className="card p-4 sm:p-5 mb-6">
                    <h4 className="text-sm font-bold text-surface-700 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-brand-500" />
                        Adicionar Novo Item
                    </h4>
                    <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 md:col-span-4">
                            <label className="label">Descrição do Serviço / Peça <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                list="service-suggestions-modal"
                                value={newItemDesc}
                                onChange={e => setNewItemDesc(e.target.value)}
                                className="input w-full"
                                placeholder="Ex: Limpeza de Ar Condicionado"
                            />
                            <datalist id="service-suggestions-modal">
                                <option value="Limpeza de Ar Condicionado Split" />
                                <option value="Limpeza de Ar Condicionado ACJ" />
                                <option value="Limpeza de Ar Condicionado Cassete" />
                                <option value="Limpeza de Ar Condicionado Piso Teto" />
                                <option value="Manutenção Preventiva (PMOC)" />
                                <option value="Manutenção Corretiva" />
                                <option value="Instalação de Ar Condicionado 9.000 BTUs" />
                                <option value="Instalação de Ar Condicionado 12.000 BTUs" />
                                <option value="Instalação de Ar Condicionado 18.000 BTUs" />
                                <option value="Instalação de Ar Condicionado 24.000 BTUs" />
                                <option value="Troca de Capacitor" />
                                <option value="Troca de Compressor" />
                                <option value="Carga de Gás Refrigerante" />
                                <option value="Higienização Completa" />
                                <option value="Visita Técnica" />
                                <option value="Laudo Técnico" />
                                <option value="Desinstalação de Equipamento" />
                                <option value="Infraestrutura para Ar Condicionado" />
                            </datalist>
                        </div>
                        <div className="col-span-12 md:col-span-3">
                            <label className="label">Equipamento <span className="text-red-500">*</span></label>
                            <select
                                className={`input w-full ${!newItemEquipId ? 'border-red-300 bg-red-50' : ''}`}
                                value={newItemEquipId}
                                onChange={e => setNewItemEquipId(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {availableEquipments.map(eq => (
                                    <option key={eq.id} value={eq.id}>{eq.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                            <label className="label">Qtd</label>
                            <input type="number" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} className="input w-full" />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                            <label className="label">Valor Unit (R$)</label>
                            <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="input w-full" placeholder="0.00" />
                        </div>
                        <div className="col-span-12 md:col-span-1">
                            <Button
                                onClick={handleAddItem}
                                className="w-full h-[42px] flex items-center justify-center"
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="card overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[600px]">
                            <thead className="bg-surface-50 text-surface-600 font-semibold text-xs uppercase border-b border-surface-100">
                                <tr>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4">Equipamento</th>
                                    <th className="p-4 w-20 text-center">Qtd</th>
                                    <th className="p-4 w-28 text-right">Unitário</th>
                                    <th className="p-4 w-28 text-right">Total</th>
                                    <th className="p-4 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100 bg-white">
                                {localItems.map(item => (
                                    <tr key={item.id} className="hover:bg-surface-50 transition-colors">
                                        <td className="p-4 font-medium text-surface-900">{item.descricao_tarefa}</td>
                                        <td className="p-4 text-surface-600 text-xs">
                                            {item.equipamentos?.nome ? (
                                                <span className="flex items-center gap-1 bg-surface-100 text-surface-700 px-2 py-1 rounded-lg border border-surface-200">
                                                    <Wrench className="w-3 h-3" /> {item.equipamentos.nome}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-center text-surface-600">{item.quantidade}</td>
                                        <td className="p-4 text-right text-surface-600">R$ {(item.valor_unitario || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right font-bold text-surface-900">R$ {(item.valor_total || 0).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {localItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-surface-400 italic">
                                            Nenhum item adicionado ao orçamento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Total sempre visível */}
                    <div className="bg-surface-50 p-4 border-t border-surface-100 flex justify-between items-center">
                        <span className="text-surface-600 font-bold uppercase text-sm">Total do Orçamento</span>
                        <span className="text-brand-600 text-xl font-bold">R$ {total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Observations */}
                <div className="card p-4">
                    <label className="label mb-2">Observações Gerais do Orçamento</label>
                    <textarea
                        placeholder="Ex: Validade da proposta de 15 dias..."
                        className="input w-full"
                        rows={3}
                        value={quoteDesc}
                        onChange={e => setQuoteDesc(e.target.value)}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-200 flex justify-end gap-3 bg-white shrink-0">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => {
                    onSave(localItems, quoteDesc, 0);
                }}>
                    <Save className="w-4 h-4 mr-2" /> Salvar Orçamento
                </Button>
            </div>
        </div>,
        document.body
    );
};
