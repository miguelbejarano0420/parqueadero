-- =====================================================
-- SISTEMA DE GESTIÓN DE PARQUEADERO
-- Schema de Base de Datos - MySQL 8.x
-- =====================================================

CREATE DATABASE IF NOT EXISTS parqueadero_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE parqueadero_db;

-- =====================================================
-- TABLA: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100),
  role          ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: spaces
-- =====================================================
CREATE TABLE IF NOT EXISTS spaces (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  number   VARCHAR(10) NOT NULL UNIQUE,
  type     ENUM('car', 'motorcycle') NOT NULL,
  status   ENUM('available', 'occupied') NOT NULL DEFAULT 'available',
  floor    TINYINT NOT NULL DEFAULT 1
);

-- =====================================================
-- TABLA: rates
-- =====================================================
CREATE TABLE IF NOT EXISTS rates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_type  ENUM('car', 'motorcycle') NOT NULL UNIQUE,
  rate_per_hour DECIMAL(10,2) NOT NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: vehicles
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  plate       VARCHAR(10) NOT NULL,
  type        ENUM('car', 'motorcycle') NOT NULL,
  entry_time  DATETIME NOT NULL,
  exit_time   DATETIME,
  space_id    INT NOT NULL,
  operator_id INT NOT NULL,
  payment_id  INT,
  CONSTRAINT fk_vehicle_space    FOREIGN KEY (space_id)    REFERENCES spaces(id),
  CONSTRAINT fk_vehicle_operator FOREIGN KEY (operator_id) REFERENCES users(id),
  INDEX idx_plate (plate),
  INDEX idx_entry_time (entry_time),
  INDEX idx_exit_time (exit_time)
);

-- =====================================================
-- TABLA: payments
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id     INT NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'card', 'app') NOT NULL,
  payment_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operator_id    INT NOT NULL,
  CONSTRAINT fk_payment_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id),
  CONSTRAINT fk_payment_operator FOREIGN KEY (operator_id) REFERENCES users(id),
  INDEX idx_payment_time (payment_time)
);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Usuario administrador por defecto (password: admin123)
INSERT INTO users (username, password_hash, name, email, role) VALUES
('admin', '$2a$10$O0.9faga47Gv4hYe1VWdEOepxSB9I.d5.feRxL/5NPiCpAPn99EpK', 'Administrador', 'admin@parqueadero.com', 'admin');

-- Tarifa base (por hora)
INSERT INTO rates (vehicle_type, rate_per_hour) VALUES
('car', 3000.00),
('motorcycle', 1500.00);

-- Espacios para carros: C01 - C20
INSERT INTO spaces (number, type, floor) VALUES
('C01','car',1),('C02','car',1),('C03','car',1),('C04','car',1),('C05','car',1),
('C06','car',1),('C07','car',1),('C08','car',1),('C09','car',1),('C10','car',1),
('C11','car',2),('C12','car',2),('C13','car',2),('C14','car',2),('C15','car',2),
('C16','car',2),('C17','car',2),('C18','car',2),('C19','car',2),('C20','car',2);

-- Espacios para motos: M01 - M15
INSERT INTO spaces (number, type, floor) VALUES
('M01','motorcycle',1),('M02','motorcycle',1),('M03','motorcycle',1),
('M04','motorcycle',1),('M05','motorcycle',1),('M06','motorcycle',1),
('M07','motorcycle',1),('M08','motorcycle',1),('M09','motorcycle',1),
('M10','motorcycle',1),('M11','motorcycle',1),('M12','motorcycle',1),
('M13','motorcycle',1),('M14','motorcycle',1),('M15','motorcycle',1);
