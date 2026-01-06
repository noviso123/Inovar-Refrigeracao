from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String, default="user") # admin, suporte, tecnico, cliente
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Profile Data
    phone = Column(String, nullable=True)
    cpf = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    signature_base64 = Column(Text, nullable=True)
    address_json = Column(JSON, nullable=True)
    
    # Relacionamentos
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", back_populates="users")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    cnpj = Column(String, unique=True, index=True)
    email_contact = Column(String)
    phone_contact = Column(String)
    address = Column(String)
    status = Column(String, default="ativa") # ativa, pendente, bloqueada
    
    # Additional fields for frontend
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    state_registration = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    
    # Configurações Fiscais
    nfse_active = Column(Boolean, default=False)
    municipal_registration = Column(String, nullable=True)
    certificate_path = Column(String, nullable=True)
    certificate_password = Column(String, nullable=True)
    certificate_name = Column(String, nullable=True)
    service_code = Column(String, nullable=True, default='14.01')
    iss_rate = Column(String, nullable=True, default='2.00')
    fiscal_environment = Column(String, nullable=True, default='homologacao')
    
    users = relationship("User", back_populates="company")
    clients = relationship("Client", back_populates="company")
    service_orders = relationship("ServiceOrder", back_populates="company")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    document = Column(String) # CPF/CNPJ
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    
    # New Address Fields
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    street_number = Column(String, nullable=True)
    complement = Column(String, nullable=True)
    neighborhood = Column(String, nullable=True)
    
    # Maintenance Control
    maintenance_period = Column(Integer, nullable=True)
    
    sequential_id = Column(Integer, nullable=True) # ID sequencial por empresa (1, 2, 3...)
    
    company_id = Column(Integer, ForeignKey("companies.id"))
    company = relationship("Company", back_populates="clients")
    service_orders = relationship("ServiceOrder", back_populates="client")
    equipments = relationship("Equipment", back_populates="client")

class Equipment(Base):
    __tablename__ = "equipments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    equipment_type = Column(String, default="ar_condicionado")
    installation_date = Column(DateTime, nullable=True)
    
    client_id = Column(Integer, ForeignKey("clients.id"))
    client = relationship("Client", back_populates="equipments")

class ServiceOrder(Base):
    __tablename__ = "service_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    status = Column(String, default="aberto") # aberto, agendado, em_andamento, concluido, faturado, cancelado
    priority = Column(String, default="media") # baixa, media, alta
    description = Column(Text, nullable=True)
    descricao_detalhada = Column(Text, nullable=True)
    descricao_orcamento = Column(Text, nullable=True)
    relatorio_tecnico = Column(Text, nullable=True)
    
    sequential_id = Column(Integer, nullable=True)
    
    # Flags
    orcamento_disponivel = Column(Boolean, default=False)
    relatorio_disponivel = Column(Boolean, default=False)
    
    # Datas
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(DateTime, nullable=True)
    data_agendamento_inicio = Column(DateTime, nullable=True)
    data_inicio_real = Column(DateTime, nullable=True)
    data_fim_real = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Valores
    total_value = Column(Float, default=0.0)
    valor_total = Column(Float, default=0.0)
    
    # Assinaturas (Base64)
    assinatura_cliente = Column(Text, nullable=True)
    assinatura_tecnico = Column(Text, nullable=True)
    
    # Relacionamentos
    client_id = Column(Integer, ForeignKey("clients.id"))
    client = relationship("Client", back_populates="service_orders")
    
    company_id = Column(Integer, ForeignKey("companies.id"))
    company = relationship("Company", back_populates="service_orders")
    
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    technician = relationship("User")
    
    equipment_id = Column(Integer, ForeignKey("equipments.id"), nullable=True)
    # equipment = relationship("Equipment") # Equipment model uses __tablename__ = "equipments"
    
    # JSON para dados flexíveis
    metadata_json = Column(JSON, nullable=True)
    fotos_os = Column(JSON, nullable=True) # List of {imagem_base64, url}
    historico_json = Column(JSON, nullable=True) # List of {data, descricao, usuario, fotos}
    
    # Itens da OS
    itens_os = relationship("ItemOS", back_populates="service_order", cascade="all, delete-orphan")

class ItemOS(Base):
    __tablename__ = "service_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    solicitacao_id = Column(Integer, ForeignKey("service_orders.id"))
    equipamento_id = Column(Integer, ForeignKey("equipments.id"), nullable=True)
    
    descricao_tarefa = Column(String)
    quantidade = Column(Float, default=1.0)
    valor_unitario = Column(Float, default=0.0)
    valor_total = Column(Float, default=0.0)
    status_item = Column(String, default="pendente") # pendente, concluido
    observacao_tecnica = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    service_order = relationship("ServiceOrder", back_populates="itens_os")
    equipment = relationship("Equipment")

class WhatsAppInstance(Base):
    __tablename__ = "whatsapp_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    instance_name = Column(String)
    instance_key = Column(String, unique=True, index=True) # ID no motor Go
    status = Column(String, default="disconnected") # connected, disconnected, connecting
    qrcode_base64 = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    company = relationship("Company")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("whatsapp_instances.id"))
    external_id = Column(String, nullable=True) # ID no WhatsApp
    sender_number = Column(String)
    receiver_number = Column(String)
    content = Column(Text)
    direction = Column(String) # inbound, outbound
    status = Column(String, default="pending") # pending, sent, delivered, read, error
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    instance = relationship("WhatsAppInstance")

class NFSe(Base):
    __tablename__ = "nfse"
    
    id = Column(Integer, primary_key=True, index=True)
    solicitacao_id = Column(Integer, ForeignKey("service_orders.id"), nullable=True)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    # Dados da Nota
    numero = Column(String)
    codigo_verificacao = Column(String)
    data_emissao = Column(DateTime, default=datetime.utcnow)
    status = Column(String) # processando, autorizada, erro, cancelada
    
    # Valores
    valor_servico = Column(Float)
    description = Column(Text, nullable=True)
    month_ref = Column(String, nullable=True) # MM/YYYY
    
    # Arquivos
    xml_url = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    
    # Retorno API
    mensagem_erro = Column(Text, nullable=True)
    protocolo = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    company = relationship("Company")
    service_order = relationship("ServiceOrder")
    subscription = relationship("Subscription")

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(String, primary_key=True) # plano-teste, plano-basico
    name = Column(String)
    description = Column(String)
    price = Column(Float)
    features_json = Column(JSON) # Lista de recursos
    limit_clients = Column(Integer, nullable=True)
    limit_services = Column(Integer, nullable=True)
    limit_technicians = Column(Integer, nullable=True) # Novo limite para técnicos
    active = Column(Boolean, default=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Para planos exclusivos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    target_user = relationship("User")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True)
    plan_id = Column(String, ForeignKey("subscription_plans.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    status = Column(String) # ativa, pendente, cancelada, expirada
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    # Mercado Pago
    mp_preference_id = Column(String, nullable=True)
    mp_payment_id = Column(String, nullable=True)
    mp_init_point = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    plan = relationship("SubscriptionPlan")
    company = relationship("Company")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    title = Column(String)
    message = Column(String)
    type = Column(String) # success, error, info, warning
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    link = Column(String, nullable=True)

    user = relationship("User")
    company = relationship("Company")

