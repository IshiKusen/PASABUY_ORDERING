-- =============================================
-- PASABUY ORDERING SYSTEM - Database Schema
-- MariaDB / MySQL
-- =============================================

CREATE DATABASE IF NOT EXISTS pasabuy_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pasabuy_db;

-- =============================================
-- 1. USERS TABLE (Customers & Admins)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE DEFAULT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  lat DECIMAL(10, 8) DEFAULT NULL,
  lng DECIMAL(11, 8) DEFAULT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  avatar_url TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_google_id (google_id),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- =============================================
-- 2. CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed default categories
INSERT INTO categories (name) VALUES 
  ('Skincare'), ('Snacks'), ('Electronics'), ('Fashion')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================
-- 3. PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  price_php DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  price_jpy DECIMAL(10, 0) DEFAULT NULL,
  category_id INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_path VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category_id),
  INDEX idx_active (is_active),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================
-- 4. ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('Pending', 'Confirmed', 'Purchased', 'Transit', 'Delivered') DEFAULT 'Pending',
  delivery_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_order_code (order_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 5. ORDER ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================
-- 6. SYSTEM CONFIG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_key (config_key)
) ENGINE=InnoDB;

-- Seed default config
INSERT INTO system_config (config_key, config_value) VALUES
  ('batch_name', 'Japan Pasabuy - August 2026 Batch'),
  ('cutoff_date', '2026-05-31T23:59:59+08:00'),
  ('eta_start', '2026-08-01T00:00:00+08:00'),
  ('eta_end', '2026-08-07T23:59:59+08:00'),
  ('jpy_to_php_rate', '0.38')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- =============================================
-- 7. Seed a default admin user
-- =============================================
INSERT INTO users (full_name, email, role) VALUES
  ('Angelo Dela Cruz', 'angelodelacruz1315@gmail.com', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';

-- =============================================
-- 8. Seed sample products
-- =============================================
INSERT INTO products (name, description, price_php, price_jpy, category_id, stock, image_path) VALUES
  ('SK-II Facial Treatment Essence', 'Iconic pitera essence for crystal clear skin', 1200.00, 3158, 1, 25, '/uploads/products/default.jpg'),
  ('Tokyo Banana', 'Classic Tokyo souvenir snack, banana custard cake', 450.00, 1184, 2, 100, '/uploads/products/default.jpg'),
  ('Anker PowerBank 10000mAh', 'Compact portable charger from Japan', 1500.00, 3947, 3, 15, '/uploads/products/default.jpg'),
  ('Uniqlo AIRism T-Shirt', 'Ultra-light breathable fabric tee', 800.00, 2105, 4, 50, '/uploads/products/default.jpg')
ON DUPLICATE KEY UPDATE name = VALUES(name);

SELECT 'Database pasabuy_db created successfully!' AS status;
