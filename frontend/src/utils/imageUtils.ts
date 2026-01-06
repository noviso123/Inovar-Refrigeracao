
export const fetchImageWithHeaders = async (url: string): Promise<string> => {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('AUTH_TOKEN');
        const headers: HeadersInit = {
            'skip_zrok_interstitial': 'true'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error fetching image with headers:', error);
        return url; // Fallback to original URL
    }
};
