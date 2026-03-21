-- Tabla de solicitudes KYC
CREATE TABLE kyc_requests (
  id VARCHAR(36) PRIMARY KEY,
  cliente_id VARCHAR(36) NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, verified, rejected
  didit_session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  webhook_data JSON,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabla de documentos KYC
CREATE TABLE kyc_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kyc_request_id VARCHAR(36),
  document_type VARCHAR(50), -- id_front, id_back, selfie, proof_address
  didit_document_id VARCHAR(100),
  status VARCHAR(20),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kyc_request_id) REFERENCES kyc_requests(id)
);