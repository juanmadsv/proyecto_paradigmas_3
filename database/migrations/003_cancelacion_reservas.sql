USE canchaya;

-- Migración idempotente: agrega cancelación y una clave nullable para los turnos activos.
-- La clave es una columna normal para que funcione en MySQL/MariaDB de XAMPP.
SET @schema_actual = DATABASE();

SET @tiene_estado = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'reservas' AND COLUMN_NAME = 'estado'
);
SET @sql_estado = IF(
  @tiene_estado = 0,
  'ALTER TABLE reservas ADD COLUMN estado ENUM(''confirmada'',''cancelada'') NOT NULL DEFAULT ''confirmada'' AFTER sena',
  'SELECT 1'
);
PREPARE migracion_estado FROM @sql_estado;
EXECUTE migracion_estado;
DEALLOCATE PREPARE migracion_estado;

-- Retirar índices previos antes de reemplazar una eventual columna generada.
SET @tiene_indice_anterior = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'reservas' AND INDEX_NAME = 'turno_unico'
);
SET @sql_indice_anterior = IF(@tiene_indice_anterior > 0, 'ALTER TABLE reservas DROP INDEX turno_unico', 'SELECT 1');
PREPARE migracion_indice_anterior FROM @sql_indice_anterior;
EXECUTE migracion_indice_anterior;
DEALLOCATE PREPARE migracion_indice_anterior;

SET @tiene_indice_activo = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'reservas' AND INDEX_NAME = 'turno_activo_unico'
);
SET @sql_indice_activo = IF(@tiene_indice_activo > 0, 'ALTER TABLE reservas DROP INDEX turno_activo_unico', 'SELECT 1');
PREPARE migracion_indice_activo FROM @sql_indice_activo;
EXECUTE migracion_indice_activo;
DEALLOCATE PREPARE migracion_indice_activo;

-- Si se había intentado con el esquema anterior, quitar la columna generada.
SET @columna_generada = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'reservas'
    AND COLUMN_NAME = 'turno_activo' AND EXTRA LIKE '%GENERATED%'
);
SET @sql_columna_generada = IF(@columna_generada > 0, 'ALTER TABLE reservas DROP COLUMN turno_activo', 'SELECT 1');
PREPARE migracion_columna_generada FROM @sql_columna_generada;
EXECUTE migracion_columna_generada;
DEALLOCATE PREPARE migracion_columna_generada;

SET @tiene_turno_activo = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'reservas' AND COLUMN_NAME = 'turno_activo'
);
SET @sql_turno_activo = IF(
  @tiene_turno_activo = 0,
  'ALTER TABLE reservas ADD COLUMN turno_activo VARCHAR(80) DEFAULT NULL AFTER estado',
  'SELECT 1'
);
PREPARE migracion_turno_activo FROM @sql_turno_activo;
EXECUTE migracion_turno_activo;
DEALLOCATE PREPARE migracion_turno_activo;

-- Reconstruir los turnos vigentes y dejar NULL los ya cancelados.
UPDATE reservas
SET turno_activo = CASE
  WHEN estado = 'confirmada' THEN CONCAT(complejo, '|', fecha, '|', horario)
  ELSE NULL
END;

SET @sql_indice_unico = 'ALTER TABLE reservas ADD UNIQUE KEY turno_activo_unico (turno_activo)';
PREPARE migracion_indice_unico FROM @sql_indice_unico;
EXECUTE migracion_indice_unico;
DEALLOCATE PREPARE migracion_indice_unico;
