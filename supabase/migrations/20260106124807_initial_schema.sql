-- Supabase Schema Fallback
-- Generated on: 2026-01-06 09:34:11.044302


CREATE TABLE clients (
	id SERIAL NOT NULL, 
	name VARCHAR, 
	document VARCHAR, 
	email VARCHAR, 
	phone VARCHAR, 
	sequential_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
)

;


CREATE TABLE system_settings (
	id SERIAL NOT NULL, 
	business_name VARCHAR, 
	cnpj VARCHAR, 
	email_contact VARCHAR, 
	phone_contact VARCHAR, 
	address VARCHAR, 
	website VARCHAR, 
	logo_url VARCHAR, 
	nfse_active BOOLEAN, 
	municipal_registration VARCHAR, 
	certificate_path VARCHAR, 
	certificate_password VARCHAR, 
	PRIMARY KEY (id)
)

;


CREATE TABLE users (
	id SERIAL NOT NULL, 
	email VARCHAR, 
	password_hash VARCHAR, 
	full_name VARCHAR, 
	role VARCHAR, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	is_active BOOLEAN, 
	phone VARCHAR, 
	cpf VARCHAR, 
	avatar_url VARCHAR, 
	signature_base64 TEXT, 
	address_json JSON, 
	PRIMARY KEY (id)
)

;


CREATE TABLE locations (
	id SERIAL NOT NULL, 
	client_id INTEGER, 
	nickname VARCHAR, 
	address VARCHAR, 
	city VARCHAR, 
	state VARCHAR, 
	zip_code VARCHAR, 
	street_number VARCHAR, 
	complement VARCHAR, 
	neighborhood VARCHAR, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id)
)

;


CREATE TABLE notifications (
	id SERIAL NOT NULL, 
	user_id INTEGER, 
	title VARCHAR, 
	message VARCHAR, 
	type VARCHAR, 
	read BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	link VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
)

;


CREATE TABLE whatsapp_instances (
	id SERIAL NOT NULL, 
	user_id INTEGER, 
	instance_name VARCHAR, 
	instance_key VARCHAR, 
	status VARCHAR, 
	qrcode_base64 TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
)

;


CREATE TABLE equipments (
	id SERIAL NOT NULL, 
	location_id INTEGER, 
	name VARCHAR, 
	brand VARCHAR, 
	model VARCHAR, 
	serial_number VARCHAR, 
	equipment_type VARCHAR, 
	installation_date TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(location_id) REFERENCES locations (id)
)

;


CREATE TABLE messages (
	id SERIAL NOT NULL, 
	instance_id INTEGER, 
	external_id VARCHAR, 
	sender_number VARCHAR, 
	receiver_number VARCHAR, 
	content TEXT, 
	direction VARCHAR, 
	status VARCHAR, 
	timestamp TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(instance_id) REFERENCES whatsapp_instances (id)
)

;


CREATE TABLE service_orders (
	id SERIAL NOT NULL, 
	sequential_id INTEGER, 
	title VARCHAR, 
	status VARCHAR, 
	priority VARCHAR, 
	description TEXT, 
	service_type VARCHAR, 
	descricao_detalhada TEXT, 
	descricao_orcamento TEXT, 
	relatorio_tecnico TEXT, 
	orcamento_disponivel BOOLEAN, 
	relatorio_disponivel BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	scheduled_at TIMESTAMP WITHOUT TIME ZONE, 
	data_inicio_real TIMESTAMP WITHOUT TIME ZONE, 
	data_fim_real TIMESTAMP WITHOUT TIME ZONE, 
	completed_at TIMESTAMP WITHOUT TIME ZONE, 
	valor_total FLOAT, 
	assinatura_cliente TEXT, 
	user_id INTEGER, 
	client_id INTEGER, 
	location_id INTEGER, 
	equipment_id INTEGER, 
	fotos_os JSON, 
	historico_json JSON, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(client_id) REFERENCES clients (id), 
	FOREIGN KEY(location_id) REFERENCES locations (id), 
	FOREIGN KEY(equipment_id) REFERENCES equipments (id)
)

;


CREATE TABLE service_order_items (
	id SERIAL NOT NULL, 
	solicitacao_id INTEGER, 
	descricao_tarefa VARCHAR, 
	quantidade FLOAT, 
	valor_unitario FLOAT, 
	valor_total FLOAT, 
	status_item VARCHAR, 
	observacao_tecnica TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(solicitacao_id) REFERENCES service_orders (id)
)

;