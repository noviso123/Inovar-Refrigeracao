// ============================================================================
// TIPOS GERAIS DO SISTEMA (100% PT-BR - SCHEMA DEFINITIVO)
// ============================================================================

export type CargoUsuario = 'super_admin' | 'prestador' | 'tecnico' | 'admin' | 'gerente';
export type StatusEmpresa = 'ativo' | 'inativo' | 'pendente' | 'bloqueado';
export type StatusOS = 'pendente' | 'agendado' | 'em_andamento' | 'concluido' | 'cancelado' | 'aprovado' | 'faturado' | 'orcamento';
export type PrioridadeOS = 'baixa' | 'media' | 'alta' | 'critica';
export type TipoServicoOS = 'preventiva' | 'corretiva' | 'instalacao' | 'inspecao' | 'orcamento';

// ============================================================================
// TIPOS DE ASSINATURA (SaaS)
// ============================================================================
export type StatusAssinatura = 'ativa' | 'pendente' | 'vencida' | 'cancelada';

export interface PlanoAssinatura {
  id: string;
  nome: string;
  descricao: string;
  valorMensal: number;
  recursos: string[];
  limiteClientes?: number;
  limiteServicos?: number;
  limiteTecnicos?: number;
  targetUserId?: number; // ID do usuário para planos exclusivos
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Assinatura {
  id: string;
  numero?: number;
  prestadorId: string;
  planoId: string;
  plano?: PlanoAssinatura;
  status: StatusAssinatura;
  valorMensal: number;
  dataInicio: string;
  dataVencimento: string;
  dataRenovacao?: string;
  ultimoPagamentoId?: string;
  metodoPagamento: 'pix';
  criadoEm: string;
  atualizadoEm: string;
}

export interface PagamentoAssinatura {
  id: string;
  assinaturaId: string;
  prestadorId: string;
  valor: number;
  status: 'pendente' | 'confirmado' | 'cancelado';
  pixCopiaECola?: string;
  qrCodeBase64?: string;
  comprovanteUrl?: string;
  dataPagamento?: string;
  criadoEm: string;
}

export interface Endereco {
  id?: number;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  principal?: boolean;
}

export interface Usuario {
  id: number | string; // Firebase uses string IDs
  empresa_id?: number | string;
  empresaId?: string; // Firebase camelCase alias
  empresas?: Empresa;
  email: string;
  nome_completo: string;
  nomeCompleto?: string; // Firebase camelCase alias
  cpf?: string;
  cargo: CargoUsuario;
  telefone?: string;
  avatar_base64?: string;
  avatar_url?: string;
  avatarUrl?: string; // Firebase camelCase alias
  assinatura_base64?: string;
  preferencias?: any;
  google_email?: string;
  ativo: boolean;
  ultimo_login?: string;
  ultimoLogin?: any; // Firebase camelCase alias (Firestore Timestamp)
  endereco?: Endereco; // Backend returns this sometimes
  enderecos?: Endereco[];
  equipamentos?: Equipamento[];
  criado_em: string;
  criadoEm?: any; // Firebase camelCase alias (Firestore Timestamp)
  atualizado_em: string;
  atualizadoEm?: any; // Firebase camelCase alias (Firestore Timestamp)
  // Campos de aprovação (Prestador)
  aprovado?: boolean;
  dataAprovacao?: string;
  // Campos de assinatura (Prestador)
  assinaturaAtiva?: boolean;
  assinaturaId?: string;
  planoId?: string;
}



export interface Empresa {
  id: number | string;
  nome_razao_social: string;
  nomeRazaoSocial?: string; // Firebase camelCase alias
  nome_fantasia: string;
  nomeFantasia?: string; // Firebase camelCase alias
  cnpj: string;
  email_contato?: string;
  emailContato?: string; // Firebase camelCase alias
  telefone_contato?: string;
  telefoneContato?: string; // Firebase camelCase alias
  endereco_completo?: string;
  enderecoCompleto?: string; // Firebase camelCase alias
  logo_base64?: string;
  logoUrl?: string; // Firebase camelCase alias
  status: StatusEmpresa;
  plano?: string;
  criado_em: string;
  criadoEm?: any; // Firebase camelCase alias (Timestamp)
  atualizado_em: string;
  atualizadoEm?: any; // Firebase camelCase alias (Timestamp)
}

export interface Cliente {
  id: number | string;
  sequential_id?: number;
  empresa_id: number | string;
  nome: string;
  nome_fantasia?: string;
  cnpj?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  geo_localizacao?: string;
  logo_base64?: string;
  observacoes?: string;
  // Campo para controle de manutenção preventiva (em meses)
  periodoManutencaoMeses?: number;
  ultimaManutencao?: string; // Data da última manutenção concluída
  proximaManutencao?: string; // Data calculada da próxima manutenção
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Equipamento {
  id: number | string; // Firebase uses string IDs
  empresa_id?: number | string;
  cliente_id?: number | string;
  id_usuario?: number | string; // For user-owned equipment
  clientes?: Cliente;
  nome: string;
  id_marca?: number;
  id_tipo?: number;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  tag_patrimonio?: string;
  capacidade_btu?: string;
  voltagem?: string;
  tipo_gas?: string;
  tipo_equipamento?: string;
  data_instalacao?: string;
  fim_garantia?: string;
  local_instalacao?: string;
  qr_code_dados?: string;
  qr_code_imagem_base64?: string;
  foto_principal_base64?: string;
  manual_pdf_base64?: string;
  status?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface SolicitacaoServico {
  id: number | string; // Firebase uses string IDs
  sequential_id?: number; // ID numérico sequencial por empresa
  numero?: number; // ID numérico sequencial para exibição (1, 2, 3...)
  empresa_id?: number | string;
  empresaId?: string; // Firebase camelCase alias
  cliente_id?: number | string;
  clienteId?: string; // Firebase camelCase alias
  clientes?: Cliente;
  tecnico_id?: number | string;
  tecnicoId?: string; // Firebase camelCase alias
  tecnicos?: Usuario;
  tecnicoNome?: string; // Nome para exibição direta
  criado_por?: number | string;
  criadoPorId?: string; // Firebase camelCase alias
  criadoPorNome?: string; // Nome do criador para exibição direta

  codigo_os?: string;
  codigoOs?: string; // Firebase camelCase alias
  titulo: string;
  descricao_detalhada?: string;
  descricaoDetalhada?: string; // Firebase camelCase alias
  relatorio_tecnico?: string; // Relatório de conclusão/solução
  relatorioTecnico?: string; // Firebase camelCase alias
  status: StatusOS;
  prioridade: PrioridadeOS;
  tipo_servico?: TipoServicoOS;
  tipoServico?: TipoServicoOS; // Firebase camelCase alias

  data_agendamento_inicio?: string | any; // Can be Firestore Timestamp
  dataAgendamentoInicio?: any; // Firebase camelCase alias
  data_agendamento_fim?: string | any;
  dataAgendamentoFim?: any;
  data_inicio_real?: string | any;
  dataInicioReal?: any;
  data_conclusao_real?: string | any;
  dataConclusaoReal?: any;
  google_calendar_event_id?: string;

  valor_pecas?: number;
  valor_mao_obra?: number;
  valor_desconto?: number;
  valor_total?: number;
  valorTotal?: number; // Firebase camelCase alias

  relatorio_tecnico_pdf_base64?: string;

  itens_os?: ItemOS[];
  itensOs?: ItemOS[]; // Firebase camelCase alias
  fotos_os?: FotoOS[];
  fotosOs?: FotoOS[]; // Firebase camelCase alias
  aprovacoes_os?: AprovacaoOS[];

  // Campos de UI/Fluxo (Podem ser JSON ou campos virtuais)
  itens_orcamento?: ItemOrcamento[];
  descricao_orcamento?: string;
  orcamento_disponivel?: boolean;
  data_criacao_orcamento?: string;

  assinatura_cliente?: string;
  assinatura_tecnico?: string;
  relatorio_disponivel?: boolean;
  historico_json?: any[]; // Para timeline

  criado_em?: string;
  criadoEm?: any; // Firebase Timestamp
  atualizado_em?: string;
  atualizadoEm?: any; // Firebase Timestamp
  nfse?: NFSe;
}


export interface NFSe {
  id?: string;
  numero: string;
  codigo_verificacao: string;
  data_emissao: string;
  status?: string;
  url_pdf?: string;
  url_xml?: string;
}

export interface ItemOrcamento {
  id: number;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  total: number;
}

export interface ItemOS {
  id: number;
  solicitacao_id: number;
  equipamento_id?: number | string;
  equipamentos?: Equipamento;
  descricao_tarefa: string;
  quantidade?: number;
  valor_unitario?: number;
  valor_total?: number;
  status_item: string;
  observacao_tecnica?: string;
  criado_em: string;
}

export interface FotoOS {
  id: number;
  solicitacao_id: number;
  item_id?: number;
  imagem_base64: string;
  descricao?: string;
  tipo_foto: string;
  data_captura: string;
  criado_em: string;
}

export interface AprovacaoOS {
  id: number;
  solicitacao_id: number;
  nome_responsavel: string;
  documento_responsavel?: string;
  cargo_responsavel?: string;
  assinatura_base64: string;
  status_aprovacao: string;
  comentarios_cliente?: string;
  data_assinatura: string;
  criado_em: string;
}

// Aliases para compatibilidade temporária (se necessário)
export type User = Usuario;
export type ServiceRequest = SolicitacaoServico;
export type UserRole = CargoUsuario; // Alias para compatibilidade
export const UserRole = {
  SUPER_ADMIN: 'super_admin' as CargoUsuario,
  PRESTADOR: 'prestador' as CargoUsuario
};
export interface ServiceHistoryItem {
  date: string;
  status: string;
  action: string;
  authorName: string;
  note?: string;
}

export type ServiceStatus = StatusOS;
