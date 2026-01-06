import api from './api';
import QRCode from 'qrcode';

/**
 * Gera QR Code PIX estático usando a chave PIX configurada pelo usuário
 */

interface PixConfig {
    tipo_chave: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
    chave_pix: string;
    nome_beneficiario: string;
}

/**
 * Remove formatação da chave PIX
 */
function cleanPixKey(key: string, tipo: string): string {
    if (tipo === 'email' || tipo === 'aleatoria') {
        return key;
    }
    // Remove pontos, traços, parênteses, barras, espaços
    return key.replace(/[\.\-\(\)\/\s]/g, '');
}

/**
 * Gera o payload PIX (formato Banco Central BR)
 * Referência: https://www.bcb.gov.br/estabilidadefinanceira/pix
 */
function generatePixPayload(
    chave: string,
    nome: string,
    valor: number,
    cidade: string = 'SAO PAULO',
    txid: string = '***'
): string {
    // Funções auxiliares para EMV format
    const pad = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    // Merchant Account Information (ID 26)
    const gui = pad('00', 'br.gov.bcb.pix'); // GUI
    const key = pad('01', chave); // Chave PIX
    const merchantAccountInfo = pad('26', gui + key);

    // Campos do PIX
    const payloadFormatIndicator = pad('00', '01'); // Formato
    const pointOfInitiation = pad('01', '12'); // Uso único (12) ou múltiplo (11)
    const merchantCategoryCode = pad('52', '0000'); // MCC não informado
    const transactionCurrency = pad('53', '986'); // BRL
    const transactionAmount = valor > 0 ? pad('54', valor.toFixed(2)) : '';
    const countryCode = pad('58', 'BR');
    const merchantName = pad('59', nome.substring(0, 25).toUpperCase());
    const merchantCity = pad('60', cidade.substring(0, 15).toUpperCase());

    // Additional Data Field (ID 62)
    const txidField = pad('05', txid.substring(0, 25));
    const additionalData = pad('62', txidField);

    // Monta payload sem CRC16
    const payloadWithoutCRC =
        payloadFormatIndicator +
        pointOfInitiation +
        merchantAccountInfo +
        merchantCategoryCode +
        transactionCurrency +
        transactionAmount +
        countryCode +
        merchantName +
        merchantCity +
        additionalData +
        '6304'; // CRC16 placeholder

    // Calcula CRC16 CCITT
    const crc = computeCRC16(payloadWithoutCRC);

    return payloadWithoutCRC + crc;
}

/**
 * Calcula CRC16 CCITT (XModem) - Padrão PIX
 */
function computeCRC16(payload: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
        }
        crc &= 0xFFFF;
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

export const pixService = {
    /**
     * Busca config PIX do usuário do Firestore
     */
    async getPixConfig(userId: string): Promise<PixConfig | null> {
        try {
            const response = await api.get(`/pagamentos/config/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar config PIX:', error);
            return null;
        }
    },

    /**
     * Gera QR Code PIX estático com a chave do usuário
     */
    async generatePixQRCode(
        userId: string,
        valor: number,
        referencia: string
    ): Promise<{ qr_code_base64: string; pix_copiacola: string } | null> {
        try {
            // Buscar config PIX do usuário
            const config = await this.getPixConfig(userId);

            if (!config?.chave_pix) {
                console.error('Usuário não tem chave PIX configurada');
                return null;
            }

            // Limpar chave PIX
            const chaveClean = cleanPixKey(config.chave_pix, config.tipo_chave);

            // Gerar txid único com timestamp para invalidar PIX anterior em alterações
            const timestamp = Date.now().toString(36).toUpperCase();
            const txidUnico = `${referencia.substring(0, 15)}${timestamp}`.substring(0, 25).replace(/[^a-zA-Z0-9]/g, '');

            // Gerar payload PIX
            const payload = generatePixPayload(
                chaveClean,
                config.nome_beneficiario || 'SERVICO INOVAR',
                valor,
                'SAO PAULO',
                txidUnico
            );

            // Gerar QR Code como base64 - tamanho grande e alta correção de erro
            const qrCodeBase64 = await QRCode.toDataURL(payload, {
                width: 350,
                margin: 2,
                errorCorrectionLevel: 'H', // Alta correção de erro para câmeras ruins
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qr_code_base64: qrCodeBase64,
                pix_copiacola: payload
            };
        } catch (error) {
            console.error('Erro ao gerar QR Code PIX:', error);
            return null;
        }
    }
};
