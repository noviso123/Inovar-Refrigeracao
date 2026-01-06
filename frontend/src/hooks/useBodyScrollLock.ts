import { useEffect } from 'react';

export const useBodyScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (isLocked) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            // Cleanup function to restore original style
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isLocked]);
};
