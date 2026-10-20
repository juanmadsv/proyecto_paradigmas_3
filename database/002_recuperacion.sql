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
