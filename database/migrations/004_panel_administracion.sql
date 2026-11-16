USE canchaya;

-- La asignación por complejo es el permiso del rol administrador.
-- Las cuentas de jugadores no reciben permisos por defecto.
CREATE TABLE IF NOT EXISTS administradores_complejo (
    usuario_id INT UNSIGNED NOT NULL,
    complejo_codigo VARCHAR(40) NOT NULL,
    asignado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, complejo_codigo),
    KEY administradores_complejo_codigo (complejo_codigo),
    CONSTRAINT fk_admin_complejo_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Los datos base siguen en el catálogo de demostración. Esta tabla guarda
-- únicamente los valores que el administrador cambia desde el panel.
CREATE TABLE IF NOT EXISTS configuracion_complejos (
    codigo VARCHAR(40) PRIMARY KEY,
    tipos VARCHAR(20) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    horarios_json TEXT NOT NULL,
    actualizado_por INT UNSIGNED NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_config_complejo_usuario FOREIGN KEY (actualizado_por)
        REFERENCES usuarios(id)
) ENGINE=InnoDB;
