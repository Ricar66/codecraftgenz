/*
  CodeCraft GenZ – Patch SQL (2025-11-15)
  Objetivo:
    - Criar tabela de auditoria dbo.app_payments_audit (se não existir)
    - Adicionar colunas analíticas em dbo.app_payments usadas pelo backend
    - Criar índices auxiliares

  Compatível com: Azure SQL / SQL Server
  Observação: comandos são idempotentes e podem ser executados em produção com segurança.
*/

-- ================================
-- Auditoria de pagamentos (Tabela)
-- ================================
IF OBJECT_ID('dbo.app_payments_audit', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.app_payments_audit (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    payment_id       NVARCHAR(64) NULL,
    preference_id    NVARCHAR(64) NULL,
    app_id           INT NOT NULL,
    user_id          INT NULL,
    action           NVARCHAR(50) NOT NULL,  -- 'create_preference','status_update','webhook_update','pid_correction','insert_missing'
    from_status      NVARCHAR(30) NULL,
    to_status        NVARCHAR(30) NULL,
    from_payment_id  NVARCHAR(64) NULL,
    to_payment_id    NVARCHAR(64) NULL,
    amount           DECIMAL(18,2) NULL,
    currency         NVARCHAR(3) NULL,
    payer_email      NVARCHAR(255) NULL,
    created_at       DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_app_pay_audit_app  FOREIGN KEY (app_id)  REFERENCES dbo.apps(id)   ON DELETE CASCADE,
    CONSTRAINT fk_app_pay_audit_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END
GO

-- ================================
-- Auditoria de pagamentos (Índice)
-- ================================
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
   WHERE name = 'IX_app_payments_audit_app_date'
     AND object_id = OBJECT_ID('dbo.app_payments_audit')
)
BEGIN
  CREATE INDEX IX_app_payments_audit_app_date ON dbo.app_payments_audit (app_id, created_at);
END
GO

-- ==============================================
-- Colunas analíticas em dbo.app_payments (DDL)
-- ==============================================
IF COL_LENGTH('dbo.app_payments', 'status_detail') IS NULL
  ALTER TABLE dbo.app_payments ADD status_detail NVARCHAR(64) NULL;

IF COL_LENGTH('dbo.app_payments', 'payment_type_id') IS NULL
  ALTER TABLE dbo.app_payments ADD payment_type_id NVARCHAR(64) NULL;

IF COL_LENGTH('dbo.app_payments', 'issuer_id') IS NULL
  ALTER TABLE dbo.app_payments ADD issuer_id NVARCHAR(64) NULL;

IF COL_LENGTH('dbo.app_payments', 'net_received_amount') IS NULL
  ALTER TABLE dbo.app_payments ADD net_received_amount DECIMAL(18,2) NULL;

IF COL_LENGTH('dbo.app_payments', 'installment_amount') IS NULL
  ALTER TABLE dbo.app_payments ADD installment_amount DECIMAL(18,2) NULL;

IF COL_LENGTH('dbo.app_payments', 'payer_document_type') IS NULL
  ALTER TABLE dbo.app_payments ADD payer_document_type NVARCHAR(16) NULL;

IF COL_LENGTH('dbo.app_payments', 'payer_document_number') IS NULL
  ALTER TABLE dbo.app_payments ADD payer_document_number NVARCHAR(32) NULL;
GO

-- ==========================
-- Índice auxiliar (status)
-- ==========================
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_app_payments_status_updated'
  AND object_id = OBJECT_ID('dbo.app_payments')
)
  CREATE INDEX IX_app_payments_status_updated ON dbo.app_payments(status, updated_at);
GO

-- ==========================
-- Verificações (opcional)
-- ==========================
-- SELECT TOP(1) 1 AS exists_audit FROM dbo.app_payments_audit;
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='app_payments';