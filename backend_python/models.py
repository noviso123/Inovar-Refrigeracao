from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True) # Always 1
    business_name = Column(String, default="Inovar Refrigeração")
    cnpj = Column(String, nullable=True)
    email_contact = Column(String, nullable=True)
    phone_contact = Column(String, nullable=True)
    address = Column(String, nullable=True)
    website = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    
    # Configurações Fiscais (Simplificado)
    nfse_active = Column(Boolean, default=False)
    municipal_registration = Column(String, nullable=True)
    certificate_path = Column(String, nullable=True)
    certificate_password = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String, default="prestador") # admin, prestador
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Profile Data
    phone = Column(String, nullable=True)
    cpf = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    signature_base64 = Column(Text, nullable=True)
    address_json = Column(JSON, nullable=True)

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    document = Column(String) # CPF/CNPJ
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    
    # Address Fields
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    street_number = Column(String, nullable=True)
    complement = Column(String, nullable=True)
    neighborhood = Column(String, nullable=True)
    
    # Maintenance Control
    maintenance_period = Column(Integer, nullable=True)
    
    sequential_id = Column(Integer, nullable=True)
    
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
    status = Column(String, default="aberto")
    priority = Column(String, default="media")
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
    
    # Assinaturas
    assinatura_cliente = Column(Text, nullable=True)
    assinatura_tecnico = Column(Text, nullable=True)
    
    # Relacionamentos
    client_id = Column(Integer, ForeignKey("clients.id"))
    client = relationship("Client", back_populates="service_orders")
    
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    technician = relationship("User")
    
    equipment_id = Column(Integer, ForeignKey("equipments.id"), nullable=True)
    
    # JSON
    metadata_json = Column(JSON, nullable=True)
    fotos_os = Column(JSON, nullable=True)
    historico_json = Column(JSON, nullable=True)
    
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
    status_item = Column(String, default="pendente")
    observacao_tecnica = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    service_order = relationship("ServiceOrder", back_populates="itens_os")
    equipment = relationship("Equipment")

class WhatsAppInstance(Base):
    __tablename__ = "whatsapp_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    instance_name = Column(String)
    instance_key = Column(String, unique=True, index=True)
    status = Column(String, default="disconnected")
    qrcode_base64 = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("whatsapp_instances.id"))
    external_id = Column(String, nullable=True)
    sender_number = Column(String)
    receiver_number = Column(String)
    content = Column(Text)
    direction = Column(String)
    status = Column(String, default="pending")
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    instance = relationship("WhatsAppInstance")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String)
    message = Column(String)
    type = Column(String)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    link = Column(String, nullable=True)

    user = relationship("User")
