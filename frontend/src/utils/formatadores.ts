import { Endereco } from '../types';

/**
 * Formata data de forma segura, retornando mensagem em PT-BR se inválida
 */
export const formatarData = (
  dataValue: any,
  opcoes: { comHora?: boolean; fallback?: string } = {}
): string => {
  const { comHora = false, fallback = 'Data não informada' } = opcoes;

  if (!dataValue) return fallback;

  try {
    let date: Date;

    // Handle Firestore Timestamp
    if (dataValue?._seconds) {
      date = new Date(dataValue._seconds * 1000);
    } else if (dataValue?.seconds) {
      date = new Date(dataValue.seconds * 1000);
    } else if (dataValue?.toDate) {
      date = dataValue.toDate();
    } else {
      date = new Date(dataValue);
    }

    // Check if valid
    if (isNaN(date.getTime())) {
      return fallback;
    }

    if (comHora) {
      return date.toLocaleString('pt-BR');
    }
    return date.toLocaleDateString('pt-BR');
  } catch {
    return fallback;
  }
};

export const formatAddress = (address: Endereco | string | null | undefined): string => {
  if (!address) return 'Endereço não informado';
  if (typeof address === 'string') return address;

  return `${address.logradouro || ''}, ${address.numero || ''}${address.complemento ? ` - ${address.complemento}` : ''} - ${address.bairro || ''}, ${address.cidade || ''}/${address.estado || ''}`;
};

export const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '') // Substitui qualquer caracter que não seja número por nada
    .replace(/(\d{5})(\d)/, '$1-$2') // Captura 2 grupos de número o primeiro de 3 e o segundo de 1
    .replace(/(-\d{3})\d+?$/, '$1'); // Captura 2 grupos de número
};

export const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskPhone = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Geração de Link para Google Agenda (Deep Link)
export const generateGoogleCalendarLink = (title: string, description: string, start: string, address: string | Endereco) => {
  try {
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration default

    const format = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const addressStr = typeof address === 'string' ? address : formatAddress(address);

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${format(startDate)}/${format(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(addressStr)}`;
  } catch (e) {
    return '#';
  }
};

// Geração de Payload PIX (Padrão EMV - BR Code)
export const generatePixPayload = (key: string, name: string, city: string, amount: number, txId: string = '***'): string => {
  const cleanKey = key.replace(/\D/g, ''); // Simplificação para CNPJ/CPF/Tel (email manteria caracteres)

  // Função auxiliar para formatar campos TLV (Tag-Length-Value)
  const formatField = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // 1. Payload Format Indicator
  let payload = formatField('00', '01');
  // 2. Point of Initiation Method (12 = Dynamic, but 11/12 usually static for simple generators)
  payload += formatField('01', '12');

  // 3. Merchant Account Information (GUI + Key)
  const merchantAccount = formatField('00', 'br.gov.bcb.pix') + formatField('01', key);
  payload += formatField('26', merchantAccount);

  // 4. Merchant Category Code (0000 = General)
  payload += formatField('52', '0000');

  // 5. Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // 6. Transaction Amount
  if (amount > 0) {
    payload += formatField('54', amount.toFixed(2));
  }

  // 7. Country Code
  payload += formatField('58', 'BR');

  // 8. Merchant Name
  payload += formatField('59', name.substring(0, 25)); // Max 25 chars

  // 9. Merchant City
  payload += formatField('60', city.substring(0, 15)); // Max 15 chars

  // 10. Additional Data Field Template (TxID)
  const additionalData = formatField('05', txId);
  payload += formatField('62', additionalData);

  // 11. CRC16 (Calculated at the end)
  payload += '6304';

  // CRC16 Calculation (CCITT-FALSE)
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial);
      } else {
        crc = (crc << 1);
      }
    }
  }

  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
};

export const generateFinancialReportCSV = (requests: any[], type: 'MONTHLY' | 'ANNUAL' | 'CUSTOM') => {
  const header = ['ID', 'Data', 'Cliente', 'Título', 'Status', 'Valor Total', 'Valor Peças', 'Valor Mão de Obra'];
  const rows = requests.map(r => [
    r.id,
    new Date(r.criado_em || r.criadoEm).toLocaleDateString('pt-BR'),
    r.clientes?.nome || 'N/D',
    r.titulo,
    r.status,
    (r.valor_total || r.valorTotal || 0).toFixed(2),
    (r.valor_pecas || 0).toFixed(2),
    (r.valor_mao_obra || 0).toFixed(2)
  ]);

  const csvContent = [
    header.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};