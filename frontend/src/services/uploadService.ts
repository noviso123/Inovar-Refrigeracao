
import { API_BASE } from './api';

export const uploadFile = async (file: File, bucket: string = 'uploads'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    const token = localStorage.getItem('token') || localStorage.getItem('AUTH_TOKEN');
    if (!token) throw new Error('Usuário não autenticado');

    console.log(`[Upload] Uploading ${file.name} to bucket: ${bucket}`);

    const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'skip_zrok_interstitial': 'true'
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Upload] Failed:', response.status, errorData);
        throw new Error(errorData.detail || errorData.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Upload] Success! URL: ${data.url}`);
    return data.url;
};
