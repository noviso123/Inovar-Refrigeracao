
import React, { useState } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNotification } from '../contexts/ContextoNotificacao';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
    align?: 'left' | 'right';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ align = 'right' }) => {
    const { notifications, unreadCount, markAsRead } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    // Filtrar apenas notificações persistentes (com userId) para o dropdown
    const persistentNotifications = (notifications || []).filter(n => n.userId);

    const handleNotificationClick = async (id: string, link?: string) => {
        await markAsRead(id);
        if (link) {
            navigate(link);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white focus:outline-none"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 ring-2 ring-white text-xs font-bold text-white flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200`}>
                    <div className="py-2 px-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-700">Notificações</h3>
                        <span className="text-xs text-gray-500">{unreadCount} não lidas</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {persistentNotifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 text-sm">
                                Nenhuma notificação.
                            </div>
                        ) : (
                            persistentNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => handleNotificationClick(notification.id, notification.link)}
                                        >
                                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-blue-800' : 'text-gray-800'}`}>
                                                {notification.title || 'Notificação'}
                                            </h4>
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                                            </p>
                                        </div>

                                        {!notification.read && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                className="ml-2 text-blue-500 hover:text-blue-700"
                                                title="Marcar como lida"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="py-2 bg-gray-50 text-center border-t border-gray-200">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
