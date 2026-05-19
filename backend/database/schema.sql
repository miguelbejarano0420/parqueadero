-- =====================================================
-- SISTEMA DE GESTIÓN DE PARQUEADERO
-- Schema de Base de Datos - MySQL 8.x
-- =====================================================
-- DECISIONES DE DISEÑO:
--   utf8mb4: soporta emojis y caracteres especiales (superconjunto de utf3).
--   ENUM en lugar de FK a tabla de tipos: los valores son fijos y pocos,
--   ENUM es más eficiente en consultas y más legible en reportes.
--   TINYINT(1) para booleanos: MySQL no tiene tipo BOOLEAN nativo; 1=true, 0=false.
--   DATETIME en vez de TIMESTAMP: TIMESTAMP tiene límite de 2038, DATETIME no.
-- =====================================================

CREATE DATABASE IF NOT EXISTS parqueadero_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE parqueadero_db;

-- =====================================================
-- TABLA: users
-- Almacena administradores y operarios del parqueadero.
-- password_hash: bcrypt con factor 10 — nunca se guarda la contraseña en texto plano.
-- active: baja lógica (soft delete) para preservar integridad referencial con vehicles/payments.
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt genera hashes de ~60 chars; 255 por margen
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100),
  role          ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
  active        TINYINT(1) NOT NULL DEFAULT 1,  -- 0 = desactivado, no se puede hacer login
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: spaces
-- Representa cada espacio físico del parqueadero.
-- status se actualiza atómicamente en la transacción de entrada/salida del vehículo.
-- floor permite extender el sistema a parqueaderos de múltiples pisos.
-- =====================================================
CREATE TABLE IF NOT EXISTS spaces (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  number   VARCHAR(10) NOT NULL UNIQUE,                      -- ej: C01, M15
  type     ENUM('car', 'motorcycle') NOT NULL,
  status   ENUM('available', 'occupied') NOT NULL DEFAULT 'available',
  floor    TINYINT NOT NULL DEFAULT 1
);

-- =====================================================
-- TABLA: rates
-- Una fila por tipo de vehículo — máximo 2 filas en producción.
-- UNIQUE en vehicle_type garantiza una sola tarifa por tipo.
-- updated_at permite auditar cuándo se modificaron los precios.
-- =====================================================
CREATE TABLE IF NOT EXISTS rates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_type  ENUM('car', 'motorcycle') NOT NULL UNIQUE,
  rate_per_hour DECIMAL(10,2) NOT NULL,   -- DECIMAL evita errores de punto flotante en dinero
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: vehicles
-- Registro de cada visita al parqueadero (entrada + salida).
-- exit_time NULL = vehículo actualmente en el parqueadero.
-- exit_time NOT NULL = ya salió y tiene pago asociado.
-- Los índices en plate, entry_time y exit_time aceleran las consultas más frecuentes:
--   - Buscar vehículo activo por placa (entrada/salida)
--   - Reportes por rango de fechas
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  plate       VARCHAR(10) NOT NULL,
  type        ENUM('car', 'motorcycle') NOT NULL,
  entry_time  DATETIME NOT NULL,
  exit_time   DATETIME,                     -- NULL mientras el vehículo está adentro
  space_id    INT NOT NULL,
  operator_id INT NOT NULL,
  payment_id  INT,
  CONSTRAINT fk_vehicle_space    FOREIGN KEY (space_id)    REFERENCES spaces(id),
  CONSTRAINT fk_vehicle_operator FOREIGN KEY (operator_id) REFERENCES users(id),
  INDEX idx_plate      (plate),
  INDEX idx_entry_time (entry_time),
  INDEX idx_exit_time  (exit_time)
);

-- =====================================================
-- TABLA: payments
-- Registra el cobro al momento de la salida del vehículo.
-- DECIMAL(10,2) almacena montos hasta $99.999.999,99 sin pérdida de precisión.
-- idx_payment_time es el índice más usado: los reportes filtran siempre por fecha.
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
-- Hash generado con bcrypt.hash('admin123', 10) — cambiar en producción.
INSERT INTO users (username, password_hash, name, email, role) VALUES
('admin', '$2a$10$O0.9faga47Gv4hYe1VWdEOepxSB9I.d5.feRxL/5NPiCpAPn99EpK', 'Administrador', 'admin@parqueadero.com', 'admin');

-- Tarifa base: $3.000/hora carros, $1.500/hora motos
INSERT INTO rates (vehicle_type, rate_per_hour) VALUES
('car', 3000.00),
('motorcycle', 1500.00);

-- Espacios para carros: C01-C10 piso 1, C11-C20 piso 2
INSERT INTO spaces (number, type, floor) VALUES
('C01','car',1),('C02','car',1),('C03','car',1),('C04','car',1),('C05','car',1),
('C06','car',1),('C07','car',1),('C08','car',1),('C09','car',1),('C10','car',1),
('C11','car',2),('C12','car',2),('C13','car',2),('C14','car',2),('C15','car',2),
('C16','car',2),('C17','car',2),('C18','car',2),('C19','car',2),('C20','car',2);

-- Espacios para motos: M01-M15 todos en piso 1
INSERT INTO spaces (number, type, floor) VALUES
('M01','motorcycle',1),('M02','motorcycle',1),('M03','motorcycle',1),
('M04','motorcycle',1),('M05','motorcycle',1),('M06','motorcycle',1),
('M07','motorcycle',1),('M08','motorcycle',1),('M09','motorcycle',1),
('M10','motorcycle',1),('M11','motorcycle',1),('M12','motorcycle',1),
('M13','motorcycle',1),('M14','motorcycle',1),('M15','motorcycle',1);
