CREATE DATABASE IF NOT EXISTS canchaya CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE canchaya;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Si usuarios ya existía, ampliar la columna para guardar el hash completo.
ALTER TABLE usuarios MODIFY COLUMN password VARCHAR(255) NOT NULL;

CREATE TABLE IF NOT EXISTS reservas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    complejo VARCHAR(40) NOT NULL,
    tipo VARCHAR(2) NOT NULL,
    fecha DATE NOT NULL,
    horario TIME NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    pago VARCHAR(30) NOT NULL,
    servicios_json TEXT NOT NULL,
    cupon VARCHAR(20) DEFAULT NULL,
    total DECIMAL(10,2) NOT NULL,
    sena DECIMAL(10,2) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    UNIQUE KEY turno_unico (complejo, fecha, horario),
    KEY reservas_usuario (usuario_id, fecha)
) ENGINE=InnoDB;

-- Recuperación de contraseña (en instalaciones existentes importar 002_recuperacion.sql).
USE canchaya;

-- Compatible con MySQL y MariaDB: conservar los usuarios existentes.
SET @agregar_version = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'version_sesion') = 0,
    'ALTER TABLE usuarios ADD COLUMN version_sesion INT UNSIGNED NOT NULL DEFAULT 1',
    'SELECT 1'
);
PREPARE migracion_version FROM @agregar_version;
EXECUTE migracion_version;
DEALLOCATE PREPARE migracion_version;

CREATE TABLE IF NOT EXISTS recuperaciones_password (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL UNIQUE,
    expira_en DATETIME DEFAULT NULL,
    solicitado_en DATETIME NOT NULL,
    estado ENUM('pendiente','enviando','enviado','fallido','usado') NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    KEY cola_recuperacion (estado, solicitado_en),
    KEY recuperacion_usuario (usuario_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recuperacion_limites (
    clave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    ventana DATETIME NOT NULL,
    intentos INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;
