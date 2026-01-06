import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { Button } from './Botao';
import { Equipamento } from '../types';
import { useNotification } from '../contexts/ContextoNotificacao';
import api from '../services/api';

interface Props {
    clienteId: number;
}

export const ListaEquipamentosCliente: React.FC<Props> = ({ clienteId }) => {
    const { notify } = useNotification();
    const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);

    const [formData, setFormData] = useState({
        nome: '',
        marca: '',
        modelo: '',
        numero_serie: '',
        tipo_equipamento: 'ar_condicionado',
        data_instalacao: ''
    });

    useEffect(() => {
        if (clienteId) {
            fetchEquipamentos();
        }
    }, [clienteId]);

    const fetchEquipamentos = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/equipamentos?clienteId=${clienteId}`);
            setEquipamentos(res.data);
        } catch (error) {
            console.error('Erro ao buscar equipamentos:', error);
            notify('Erro ao carregar equipamentos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.nome) {
                notify('Nome do equipamento é obrigatório.', 'error');
                return;
            }

            const payload = {
                ...formData,
                clienteId: clienteId
            };

            if (editingEquip) {
                await api.put(`/equipamentos/${editingEquip.id}`, payload);
                notify('Equipamento atualizado!', 'success');
            } else {
                await api.post('/equipamentos', payload);
                notify('Equipamento adicionado!', 'success');
            }

            setIsModalOpen(false);
            fetchEquipamentos();
            resetForm();
        } catch (error) {
            console.error('Erro ao salvar equipamento:', error);
            notify('Erro ao salvar equipamento.', 'error');
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Tem certeza que deseja remover este equipamento?')) return;
        try {
            await api.delete(`/equipamentos/${id}`);
            notify('Equipamento removido.', 'success');
            fetchEquipamentos();
        } catch (error) {
            console.error('Erro ao remover:', error);
            notify('Erro ao remover equipamento.', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            marca: '',
            modelo: '',
            numero_serie: '',
            tipo_equipamento: 'ar_condicionado',
            data_instalacao: ''
        });
        setEditingEquip(null);
    };

    const openEdit = (equip: Equipamento) => {
        setEditingEquip(equip);
        setFormData({
            nome: equip.nome,
            marca: equip.marca || '',
            modelo: equip.modelo || '',
            numero_serie: equip.numero_serie || '',
            tipo_equipamento: equip.tipo_equipamento || 'ar_condicionado',
            data_instalacao: equip.data_instalacao ? equip.data_instalacao.split('T')[0] : ''
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                <h4 className="font-bold text-gray-700 flex items-center">
                    <Wrench className="w-4 h-4 mr-2" /> Equipamentos do Cliente
                </h4>
                <Button size="sm" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
            </div>

            {loading ? (
                <p className="text-center text-gray-500 text-sm py-4">Carregando equipamentos...</p>
            ) : equipamentos.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm">Nenhum equipamento cadastrado para este cliente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {equipamentos.map(equip => (
                        <div key={equip.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center shadow-sm">
                            <div>
                                <h5 className="font-bold text-gray-800 text-sm">{equip.nome}</h5>
                                <p className="text-xs text-gray-500">
                                    {equip.marca} {equip.modelo ? `- ${equip.modelo}` : ''}
                                </p>
                                {equip.numero_serie && (
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">S/N: {equip.numero_serie}</p>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(equip)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(equip.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Equipamento (Nested) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">
                                {editingEquip ? 'Editar Equipamento' : 'Novo Equipamento'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">X</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nome / Identificação *</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Ex: Ar Condicionado Sala 1"
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded p-2 text-sm"
                                        value={formData.marca}
                                        onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded p-2 text-sm"
                                        value={formData.modelo}
                                        onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Número de Série</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2 text-sm"
                                    value={formData.numero_serie}
                                    onChange={e => setFormData({ ...formData, numero_serie: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm bg-white"
                                        value={formData.tipo_equipamento}
                                        onChange={e => setFormData({ ...formData, tipo_equipamento: e.target.value })}
                                    >
                                        <option value="ar_condicionado">Ar Condicionado</option>
                                        <option value="vrf">VRF</option>
                                        <option value="chiller">Chiller</option>
                                        <option value="exaustor">Exaustor</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Instalação</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2 text-sm"
                                        value={formData.data_instalacao}
                                        onChange={e => setFormData({ ...formData, data_instalacao: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleSave}>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
