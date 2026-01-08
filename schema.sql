-- Inovar Refrigeração - Clean Single-Tenant Schema
-- Generated on: 2026-01-07

CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR DEFAULT 'Inovar Refrigeração',
    cnpj VARCHAR,
    email_contact VARCHAR,
    phone_contact VARCHAR,
    address VARCHAR,
    website VARCHAR,
    logo_url VARCHAR,
    nfse_active BOOLEAN DEFAULT FALSE,
    municipal_registration VARCHAR,
    certificate_path VARCHAR,
    certificate_password VARCHAR
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    full_name VARCHAR,
    role VARCHAR DEFAULT 'prestador',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc'),
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR,
    cpf VARCHAR,
    avatar_url VARCHAR,
    signature_url TEXT,
    address_json JSON,
    automacao JSON
);

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    document VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    sequential_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    nickname VARCHAR,
    address VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip_code VARCHAR,
    street_number VARCHAR,
    complement VARCHAR,
    neighborhood VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE TABLE equipments (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    brand VARCHAR,
    model VARCHAR,
    serial_number VARCHAR,
    equipment_type VARCHAR DEFAULT 'ar_condicionado',
    installation_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE TABLE service_orders (
    id SERIAL PRIMARY KEY,
    sequential_id INTEGER,
    title VARCHAR,
    status VARCHAR DEFAULT 'aberto',
    priority VARCHAR DEFAULT 'media',
    description TEXT,
    service_type VARCHAR DEFAULT 'corretiva',
    descricao_detalhada TEXT,
    descricao_orcamento TEXT,
    relatorio_tecnico TEXT,
    orcamento_disponivel BOOLEAN DEFAULT FALSE,
    relatorio_disponivel BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc'),
    scheduled_at TIMESTAMP WITHOUT TIME ZONE,
    data_inicio_real TIMESTAMP WITHOUT TIME ZONE,
    data_fim_real TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    valor_total FLOAT DEFAULT 0.0,
    user_id INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES clients(id),
    location_id INTEGER REFERENCES locations(id),
    equipment_id INTEGER REFERENCES equipments(id),
    fotos_os JSON,
    historico_json JSON,
    nfse_json JSON,
    assinatura_cliente TEXT,
    assinatura_tecnico TEXT
);

CREATE TABLE service_order_items (
    id SERIAL PRIMARY KEY,
    solicitacao_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
    descricao_tarefa VARCHAR NOT NULL,
    quantidade FLOAT DEFAULT 1.0,
    valor_unitario FLOAT DEFAULT 0.0,
    valor_total FLOAT DEFAULT 0.0,
    status_item VARCHAR DEFAULT 'pendente',
    observacao_tecnica TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE TABLE whatsapp_instances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    instance_name VARCHAR NOT NULL,
    instance_key VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'disconnected',
    qrcode_base64 TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    external_id VARCHAR,
    sender_number VARCHAR,
    receiver_number VARCHAR,
    content TEXT,
    direction VARCHAR,
    status VARCHAR DEFAULT 'pending',
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    message VARCHAR NOT NULL,
    type VARCHAR,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc'),
    link VARCHAR
);