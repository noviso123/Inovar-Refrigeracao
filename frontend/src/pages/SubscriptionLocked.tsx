import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { Lock, RefreshCw, Phone } from 'lucide-react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export const SubscriptionLocked: React.FC = () => {
    const user = authService.getCurrentUser();
    const logout = () => authService.logout();
    const navigate = useNavigate();

    const isTechnician = user?.cargo === 'tecnico';

    return (
        <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Box display="flex" justifyContent="center" mb={2}>
                    <div className="p-4 bg-red-100 rounded-full">
                        <Lock className="w-12 h-12 text-red-600" />
                    </div>
                </Box>

                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="text.primary">
                    Acesso Bloqueado
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
                    {isTechnician
                        ? "A assinatura da empresa que você presta serviço está inativa ou expirada. Por favor, entre em contato com o responsável pela empresa para regularizar a situação."
                        : "Sua assinatura está inativa ou expirada. Para continuar acessando o sistema, por favor renove seu plano."
                    }
                </Typography>

                <Box display="flex" flexDirection="column" gap={2}>
                    {!isTechnician && (
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={<RefreshCw />}
                            onClick={() => navigate('/minha-assinatura')}
                        >
                            Renovar Assinatura
                        </Button>
                    )}

                    {isTechnician && (
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Phone />}
                            href={`tel:${user?.empresas?.telefone_contato || ''}`}
                        >
                            Contatar Empresa
                        </Button>
                    )}

                    <Button
                        variant="text"
                        color="inherit"
                        onClick={logout}
                    >
                        Sair do Sistema
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};
