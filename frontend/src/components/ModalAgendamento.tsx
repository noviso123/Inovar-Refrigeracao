
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Button } from './Botao';
import { Calendar, Clock, X, Save } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (date: string) => void;
    initialDate?: string;
}

export const ModalAgendamento: React.FC<Props> = ({ isOpen, onClose, onSave, initialDate }) => {
    useBodyScrollLock(isOpen);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && initialDate) {
            const d = new Date(initialDate);
            setDate(d.toISOString().split('T')[0]);
            setTime(d.toTimeString().slice(0, 5));
        } else if (isOpen) {
            setDate('');
            setTime('');
        }
    }, [isOpen, initialDate]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!date || !time) return;
        const dateTime = `${date}T${time}:00`;
        onSave(dateTime);
    };

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
                    <Calendar className="w-5 h-5 text-brand-500" />
                    <h3 className="text-lg font-bold text-surface-800">Agendamento</h3>
                </div>
            </div>

            {/* Body - Flex-1 to fill all space */}
            <div className="flex-1 overflow-y-auto p-4 bg-surface-50">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">Data</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="input pl-10 w-full text-lg py-4"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">Horário</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="input pl-10 w-full text-lg py-4"
                            />
                        </div>
                    </div>

                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                        <p className="text-sm text-brand-700 text-center">
                            O cliente será notificado automaticamente via WhatsApp após a confirmação.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-200 flex gap-3 bg-white shrink-0">
                <Button variant="secondary" onClick={onClose} fullWidth>
                    Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!date || !time} fullWidth>
                    <Save className="w-4 h-4 mr-2" />
                    Confirmar
                </Button>
            </div>
        </div>,
        document.body
    );
};
