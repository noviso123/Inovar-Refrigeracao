// ============================================================================
// TIPOS GERAIS DO SISTEMA (CONSOLIDADO - MONOLITO 2026)
// ============================================================================

export type CargoUsuario = 'admin' | 'prestador';
export type StatusOS = 'pendente' | 'agendado' | 'em_andamento' | 'concluido' | 'cancelado' | 'aprovado' | 'faturado';
export type PrioridadeOS = 'baixa' | 'media' | 'alta' | 'critica';

export interface Local {
  id: number;
  client_id: number;
  nickname: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  street_number: string;
  complement?: string;
  neighborhood: string;
}

// Para compatibilidade com formatadores legados que esperam um objeto de endereço
export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Usuario {
  id: number;
  email: string;
  nome_completo: string;
  cargo: CargoUsuario;
  telefone?: string;
  cpf?: string;
  avatar_url?: string;
  signature_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Cliente {
  id: number;
  sequential_id: number;
  nome: string;
  email?: string;
  telefone?: string;
  documento?: string; // CPF ou CNPJ formatado
  cpf?: string;
  cnpj?: string;
  locations: Local[];
  created_at: string;
}

export interface Equipamento {
  id: number;
  location_id: number;
  nome: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  tipo_equipamento: string;
  data_instalacao?: string;
  created_at: string;
}

export interface SolicitacaoServico {
  id: number;
  sequential_id: number;
  titulo: string;
  description?: string;
  descricao_detalhada?: string;
  technical_report?: string;
  status: StatusOS;
  priority: PrioridadeOS;
  service_type: string;

  cliente_id: number;
  location_id?: number;
  equipment_id?: number;
  user_id: number;

  created_at: string;
  scheduled_at?: string;
  completed_at?: string;

  valor_total: number;

  // Nested data
  cliente?: {
    id: number;
    nome: string;
    telefone?: string;
    email?: string;
  };
  local?: Local | null;
  equipamento?: Equipamento | null;
  itens?: ItemOS[];
  fotos?: FotoOS[];
  historico?: HistoricoOS[];

  // Relatórios e Assinaturas
  client_signature?: string;
  tech_signature?: string;

  // Metadata
  orcamento_disponivel?: boolean;
  relatorio_disponivel?: boolean;
  nfse?: any;
}

export interface ItemOS {
  id: number;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status: string;
  equipamento_id?: number;
  equipamento?: Equipamento;
}

export interface FotoOS {
  id: number;
  url: string;
  description?: string;
}

export interface HistoricoOS {
  id: number;
  data: string;
  descricao: string;
  usuario?: string;
}

export const UserRole = {
  ADMIN: 'admin' as CargoUsuario,
  PRESTADOR: 'prestador' as CargoUsuario
};
