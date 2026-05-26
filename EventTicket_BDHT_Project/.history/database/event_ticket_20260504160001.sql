-- Event Ticket BDHT Database Schema
-- Create database first: CREATE DATABASE Event_Ticket_BDHT;

USE Event_Ticket_BDHT;

-- TODO: Add 12 tables here (Users, Events, Bookings, etc.)
-- Sample table for now:
CREATE TABLE users (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(255),
    phone NVARCHAR(20),
    role NVARCHAR(50) DEFAULT 'USER',
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Insert sample admin user (password: admin123 hashed later)
INSERT INTO users (email, password_hash, full_name, role) VALUES 
('admin@example.com', '$2a$10$demo_hash', 'Admin User', 'ADMIN');

