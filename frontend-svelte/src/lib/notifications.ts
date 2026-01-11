import { writable } from 'svelte/store';
import { token } from './auth';

export interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    read: boolean;
    created_at: string;
    link: string | null;
}

export const notifications = writable<Notification[]>([]);
export const unreadCount = writable(0);

export async function fetchNotifications() {
    let currentToken: string | null = null;
    token.subscribe(t => currentToken = t)();

    if (!currentToken) return;

    try {
        const response = await fetch('/api/notifications/', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            notifications.set(data);
            unreadCount.set(data.filter((n: Notification) => !n.read).length);
        }
    } catch (error) {
        console.error("Error fetching notifications:", error);
    }
}

export async function markAsRead(id: number) {
    let currentToken: string | null = null;
    token.subscribe(t => currentToken = t)();

    if (!currentToken) return;

    try {
        const response = await fetch(`/api/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            notifications.update(list => {
                return list.map(n => n.id === id ? { ...n, read: true } : n);
            });
            unreadCount.update(c => Math.max(0, c - 1));
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}
