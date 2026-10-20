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
