import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, ImageOff } from 'lucide-react';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    fallback?: React.ReactNode;
}

export const SecureImage: React.FC<SecureImageProps> = ({ src, fallback, className, alt, ...props }) => {
    const [imgSrc, setImgSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchImage = async () => {
            if (!src) {
                setLoading(false);
                return;
            }

            // Se for base64, usa direto
            if (src.startsWith('data:')) {
                setImgSrc(src);
                setLoading(false);
                return;
            }

            // Se for URL blob (preview local do browser), usa direto
            if (src.startsWith('blob:')) {
                setImgSrc(src);
                setLoading(false);
                return;
            }

            // Fix legacy Zrok URLs to be relative
            if (src.includes('inovar.share.zrok.io')) {
                src = src.replace('https://inovar.share.zrok.io', '');
            }

            // Fix internal MinIO URLs (Docker internal network)
            if (src.includes('minio:9000')) {
                src = src.replace(/https?:\/\/minio:9000/, '');
            }

            try {
                setLoading(true);
                setError(false);

                // Se for URL externa (não do nosso backend), tenta carregar direto
                const isExternal = src.startsWith('http') && !src.includes(window.location.hostname) && !src.includes('inovar.share.zrok.io');

                if (isExternal) {
                    console.log('[SecureImage] Loading external image:', src);
                    setImgSrc(src);
                    setLoading(false);
                    return;
                }

                // Busca a imagem como Blob usando a instância da API (que tem os headers)
                // Remove /api prefix if present because api instance adds it
                let requestPath = src;

                // Remove leading slash if present to make it easier to check for api/
                if (requestPath.startsWith('/')) {
                    requestPath = requestPath.substring(1);
                }

                // Remove all leading api/ segments
                while (requestPath.startsWith('api/')) {
                    requestPath = requestPath.substring(4);
                }

                // Ensure it starts with / for the api.get call
                requestPath = '/' + requestPath;

                console.log('[SecureImage] Fetching internal image:', requestPath);
                const response = await api.get(requestPath, { responseType: 'blob' });
                const blobUrl = URL.createObjectURL(response.data);

                if (isMounted) {
                    setImgSrc(blobUrl);
                }
            } catch (err) {
                console.error('[SecureImage] Erro ao carregar imagem:', src, err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
            if (imgSrc && imgSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imgSrc);
            }
        };
    }, [src]);

    if (loading) {
        return <div className={`flex items-center justify-center bg-gray-100 ${className}`}><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
    }

    if (error || !imgSrc) {
        return fallback ? <>{fallback}</> : <div className={`flex items-center justify-center bg-gray-100 ${className}`}><ImageOff className="w-5 h-5 text-gray-400" /></div>;
    }

    return <img src={imgSrc} alt={alt} className={className} {...props} />;
};
