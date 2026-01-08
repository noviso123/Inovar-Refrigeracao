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
    phone_whatsapp = Column(String, nullable=True)

    # Address Data
    cep = Column(String, nullable=True)
    logradouro = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)

    website = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    pix_key = Column(String, nullable=True)

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
    data_nascimento = Column(String, nullable=True)
    estado_civil = Column(String, nullable=True)
    profissao = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    signature_url = Column(Text, nullable=True)

    # Address Data
    cep = Column(String, nullable=True)
    logradouro = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)

    automacao = Column(JSON, nullable=True) # { "lembreteManutencao": bool, "intervaloMeses": int, "templateMensagem": str, "whatsappInstanceName": str }

    # Relationships
    service_orders = relationship("ServiceOrder", back_populates="user")

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    document = Column(String) # CPF/CNPJ
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    sequential_id = Column(Integer, nullable=True)
    maintenance_period = Column(Integer, default=6) # In months
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    locations = relationship("Location", back_populates="client", cascade="all, delete-orphan")
    service_orders = relationship("ServiceOrder", back_populates="client")

    @property
    def cpf(self):
        return self.document if self.document and len(self.document) <= 11 else None

    @property
    def cnpj(self):
        return self.document if self.document and len(self.document) > 11 else None

    @property
    def cep(self):
        return self.locations[0].zip_code if self.locations else None

    @property
    def logradouro(self):
        return self.locations[0].address if self.locations else None

    @property
    def numero(self):
        return self.locations[0].street_number if self.locations else None

    @property
    def complemento(self):
        return self.locations[0].complement if self.locations else None

    @property
    def bairro(self):
        return self.locations[0].neighborhood if self.locations else None

    @property
    def cidade(self):
        return self.locations[0].city if self.locations else None

    @property
    def estado(self):
        return self.locations[0].state if self.locations else None

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))

    nickname = Column(String) # e.g., "Sede", "Filial Centro"
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    street_number = Column(String)
    complement = Column(String, nullable=True)
    neighborhood = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="locations")
    equipments = relationship("Equipment", back_populates="location")
    service_orders = relationship("ServiceOrder", back_populates="location")

class Equipment(Base):
    __tablename__ = "equipments"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))

    name = Column(String)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    equipment_type = Column(String, default="ar_condicionado")
    installation_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    location = relationship("Location", back_populates="equipments")
    service_orders = relationship("ServiceOrder", back_populates="equipment")

class ServiceOrder(Base):
    __tablename__ = "service_orders"

    id = Column(Integer, primary_key=True, index=True)
    sequential_id = Column(Integer, nullable=True) # User-facing ID

    title = Column(String, nullable=True)
    status = Column(String, default="aberto")
    priority = Column(String, default="media")
    description = Column(Text, nullable=True)
    service_type = Column(String, default="corretiva") # corretiva, preventiva, instalacao, inspecao
    descricao_detalhada = Column(Text, nullable=True)
    descricao_orcamento = Column(Text, nullable=True)
    relatorio_tecnico = Column(Text, nullable=True)

    # Flags
    orcamento_disponivel = Column(Boolean, default=False)
    relatorio_disponivel = Column(Boolean, default=False)

    # Datas
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(DateTime, nullable=True)
    data_inicio_real = Column(DateTime, nullable=True)
    data_fim_real = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Valores
    valor_total = Column(Float, default=0.0)

    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"))
    client_id = Column(Integer, ForeignKey("clients.id"))
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    equipment_id = Column(Integer, ForeignKey("equipments.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="service_orders")
    client = relationship("Client", back_populates="service_orders")
    location = relationship("Location", back_populates="service_orders")
    equipment = relationship("Equipment", back_populates="service_orders")
    itens_os = relationship("ItemOS", back_populates="service_order", cascade="all, delete-orphan")

    # JSON
    fotos_os = Column(JSON, nullable=True)
    historico_json = Column(JSON, nullable=True)
    nfse_json = Column(JSON, nullable=True)

    # Assinaturas
    assinatura_cliente = Column(Text, nullable=True)
    assinatura_tecnico = Column(Text, nullable=True)

class ItemOS(Base):
    __tablename__ = "service_order_items"

    id = Column(Integer, primary_key=True, index=True)
    solicitacao_id = Column(Integer, ForeignKey("service_orders.id"))

    descricao_tarefa = Column(String)
    quantidade = Column(Float, default=1.0)
    valor_unitario = Column(Float, default=0.0)
    valor_total = Column(Float, default=0.0)
    status_item = Column(String, default="pendente")
    observacao_tecnica = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    service_order = relationship("ServiceOrder", back_populates="itens_os")

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

class BotConfig(Base):
    __tablename__ = "bot_config"

    id = Column(String, primary_key=True, default=lambda: "1")
    bot_nome = Column(String, default="Inovar Bot")
    ativo = Column(Boolean, default=True)
    min_delay = Column(Integer, default=15)
    max_delay = Column(Integer, default=45)
    hora_inicio = Column(String, default="08:00")
    hora_fim = Column(String, default="21:00")
    simular_digitando = Column(Boolean, default=True)

class FilaEnvio(Base):
    __tablename__ = "fila_envio"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, nullable=False)
    mensagem = Column(Text, nullable=False)
    media_url = Column(String, nullable=True)
    status = Column(String, default="pendente") # pendente, processando, enviado, erro
    tentativas = Column(Integer, default=0)
    erro_log = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    enviado_em = Column(DateTime, nullable=True)

class BotStatus(Base):
    __tablename__ = "bot_status"

    id = Column(Integer, primary_key=True, default=1)
    status_conexao = Column(String, default="desconectado") # conectado, desconectado, aguardando_qr
    qr_code_base64 = Column(Text, nullable=True)
    pairing_code = Column(String, nullable=True)
    ultima_atualizacao = Column(DateTime, default=datetime.utcnow)

class ManutencaoAgendada(Base):
    __tablename__ = "manutencoes_agendadas"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    equipment_id = Column(Integer, ForeignKey("equipments.id"))
    data_prevista = Column(DateTime)
    status = Column(String, default="pendente") # pendente, notificado, agendado, concluido
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client")
    equipment = relationship("Equipment")
