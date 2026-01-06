import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
    const { pathname, hash } = useLocation();

    const handleScroll = () => {
        // 1. Window Scroll
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        // 2. Root Element Scroll
        const root = document.getElementById('root');
        if (root) root.scrollTop = 0;

        // 3. Main Content Scroll (Common selectors)
        const scrollableSelectors = [
            'main',
            '[role="main"]',
            '.main-content',
            '#main-content',
            '.overflow-y-auto', // Tailwind scroll container
            '.overflow-auto'    // Tailwind scroll container
        ];

        scrollableSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.scrollTop = 0;
            });
        });
    };

    useLayoutEffect(() => {
        if (!hash) {
            handleScroll();
        }
    }, [pathname, hash]);

    useEffect(() => {
        if (!hash) {
            // Immediate scroll
            handleScroll();

            // Retry sequence to catch async renders
            const timers = [
                setTimeout(handleScroll, 50),
                setTimeout(handleScroll, 150),
                setTimeout(handleScroll, 300),
                setTimeout(handleScroll, 500)
            ];

            return () => timers.forEach(clearTimeout);
        }
    }, [pathname, hash]);

    return null;
};
