import { Endereco, Local } from '../types';

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
    const date = new Date(dataValue);

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

/**
 * Formata endereço de forma legível, suportando o novo modelo Local ou Endereco legado
 */
export const formatAddress = (address: Local | Endereco | string | null | undefined): string => {
  if (!address) return 'Endereço não informado';
  if (typeof address === 'string') return address;

  // Se for o novo modelo Local (possui address e street_number)
  if ('address' in address && 'street_number' in address) {
    return `${address.address}, ${address.street_number}${address.complement ? ` - ${address.complement}` : ''} - ${address.neighborhood}, ${address.city}/${address.state}`;
  }

  // Se for o modelo Endereco legado (possui logradouro e numero)
  if ('logradouro' in address && 'numero' in address) {
    return `${address.logradouro}, ${address.numero}${address.complemento ? ` - ${address.complemento}` : ''} - ${address.bairro}, ${address.cidade}/${address.estado}`;
  }

  return 'Endereço parcial informado';
};

export const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
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
export const generateGoogleCalendarLink = (title: string, description: string, start: string, address: string | Local | Endereco) => {
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
  const formatField = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  let payload = formatField('00', '01');
  payload += formatField('01', '12');

  const merchantAccount = formatField('00', 'br.gov.bcb.pix') + formatField('01', key);
  payload += formatField('26', merchantAccount);

  payload += formatField('52', '0000');
  payload += formatField('53', '986');

  if (amount > 0) {
    payload += formatField('54', amount.toFixed(2));
  }

  payload += formatField('58', 'BR');
  payload += formatField('59', name.substring(0, 25));
  payload += formatField('60', city.substring(0, 15));

  const additionalData = formatField('05', txId);
  payload += formatField('62', additionalData);

  payload += '6304';

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

export const generateFinancialReportCSV = (requests: any[]) => {
  const header = ['ID', 'Data', 'Cliente', 'Título', 'Status', 'Valor Total'];
  const rows = requests.map(r => [
    r.sequential_id || r.id,
    new Date(r.created_at).toLocaleDateString('pt-BR'),
    r.client_name || 'N/D',
    r.titulo,
    r.status,
    (r.valor_total || 0).toFixed(2)
  ]);

  const csvContent = [
    header.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};
