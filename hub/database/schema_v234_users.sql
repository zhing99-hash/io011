-- AICart Hub Database Schema - Users
-- Version: 2.3.4

-- Users table for user login
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    phone VARCHAR(11) NOT NULL UNIQUE,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- User verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(11) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'login',
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_verification_codes_phone ON verification_codes(phone);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);

-- Insert demo user
INSERT INTO users (id, phone, nickname, status, created_at)
VALUES ('user-demo-001', '18600186000', '演示用户', 'active', NOW())
ON CONFLICT (phone) DO NOTHING;

-- Insert demo verification code (1234)
INSERT INTO verification_codes (phone, code, purpose, expires_at, created_at)
VALUES ('18600186000', '1234', 'login', NOW() + INTERVAL '7 days', NOW())
ON CONFLICT DO NOTHING;