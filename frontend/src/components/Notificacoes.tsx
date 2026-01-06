import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export const Toaster = () => {
    return (
        <SonnerToaster
            position="top-right"
            richColors
            closeButton
            theme="light"
            style={{ fontFamily: 'Inter, sans-serif' }}
        />
    );
};

export const notify = {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    warning: (message: string) => toast.warning(message),
    promise: (promise: Promise<any>, messages: { loading: string; success: string; error: string }) =>
        toast.promise(promise, messages),
};
