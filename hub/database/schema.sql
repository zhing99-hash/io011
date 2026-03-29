-- AICart Hub Database Schema
-- Version: 2.2.1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    endpoint TEXT NOT NULL,
    public_key TEXT,
    tags JSONB NOT NULL DEFAULT '{}',
    api_key VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    reputation JSONB DEFAULT '{"score": 0, "total_transactions": 0}',
    last_seen TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_tags ON merchants USING GIN(tags);
CREATE INDEX idx_merchants_last_seen ON merchants(last_seen);

-- Categories reference table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES categories(id),
    tag VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, tag, description) VALUES
('茶具', '茶具', '各类茶具产品'),
('陶瓷', '陶瓷', '陶瓷制品'),
('手工', '手工', '手工制作产品'),
('数码', '数码', '数码电子产品'),
('家居', '家居', '家居用品'),
('服饰', '服饰', '服装配饰')
ON CONFLICT (tag) DO NOTHING;

-- API request logs (for analytics)
CREATE TABLE IF NOT EXISTS api_logs (
    id BIGSERIAL PRIMARY KEY,
    merchant_id VARCHAR(32) REFERENCES merchants(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_logs_merchant ON api_logs(merchant_id);
CREATE INDEX idx_api_logs_created ON api_logs(created_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
