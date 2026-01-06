
import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from './Botao';

interface CustomGoogleButtonProps {
    onSuccess: (response: any) => void;
    onError: () => void;
    text?: string;
    className?: string;
}

export const BotaoGooglePersonalizado: React.FC<CustomGoogleButtonProps> = ({ onSuccess, onError, text = 'Entrar com Google', className }) => {
    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            // useGoogleLogin returns an access_token, not a credential (JWT) by default unless flow: 'auth-code' is used.
            // However, for the existing backend logic which expects an ID Token (credential), 
            // we might need to adjust or use the 'id_token' flow if available, OR fetch user info manually.

            // Actually, the simplest way to match the previous behavior (JWT) with useGoogleLogin is to use flow: 'implicit' (default) 
            // but we need the ID Token. 
            // useGoogleLogin with default flow returns { access_token, ... }

            // Wait, the backend expects { token: credentialResponse.credential } which is an ID Token.
            // The standard <GoogleLogin> returns { credential: "..." }.
            // useGoogleLogin returns an access token.

            // To get an ID Token with useGoogleLogin, we can't easily do it without backend changes or extra calls.
            // BUT, we can use the `onSuccess` from the standard component if we could just style it.

            // ALTERNATIVE: We can fetch the user info using the access token and then send THAT to the backend,
            // OR we can ask the backend to verify the access token (Google UserInfo endpoint).

            // Let's check the backend `server.js`. It calls `oauth2.googleapis.com/tokeninfo?id_token=${token}`.
            // So it expects an ID Token.

            // If we use useGoogleLogin, we get an access_token. We can't validate an access_token with the `id_token` endpoint.
            // We would need to change the backend to use `https://www.googleapis.com/oauth2/v3/userinfo` with the access token.

            // STRATEGY CHANGE:
            // 1. Modify Backend to accept EITHER `id_token` OR `access_token`.
            // 2. If `access_token` is provided, fetch user info from Google UserInfo endpoint.
            // 3. Use `useGoogleLogin` in frontend to get `access_token`.

            onSuccess(tokenResponse);
        },
        onError: onError,
        flow: 'implicit' // Get access token
    });

    return (
        <button
            type="button"
            onClick={() => login()}
            className={`flex items-center justify-center w-full px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${className}`}
        >
            <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                />
            </svg>
            {text}
        </button>
    );
};
