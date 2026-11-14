USE canchaya;

-- Migración idempotente: registrar cancelaciones y permitir liberar el mismo turno.
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

SET @tiene_turno_activo = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'reservas' AND COLUMN_NAME = 'turno_activo'
);
SET @sql_turno_activo = IF(
  @tiene_turno_activo = 0,
  'ALTER TABLE reservas ADD COLUMN turno_activo VARCHAR(80) GENERATED ALWAYS AS (CASE WHEN estado = ''confirmada'' THEN CONCAT(complejo, ''|'', DATE_FORMAT(fecha, ''%Y-%m-%d''), ''|'', TIME_FORMAT(horario, ''%H:%i:%s'')) ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE migracion_turno_activo FROM @sql_turno_activo;
EXECUTE migracion_turno_activo;
DEALLOCATE PREPARE migracion_turno_activo;

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
SET @sql_indice_activo = IF(@tiene_indice_activo = 0, 'ALTER TABLE reservas ADD UNIQUE KEY turno_activo_unico (turno_activo)', 'SELECT 1');
PREPARE migracion_indice_activo FROM @sql_indice_activo;
EXECUTE migracion_indice_activo;
DEALLOCATE PREPARE migracion_indice_activo;
