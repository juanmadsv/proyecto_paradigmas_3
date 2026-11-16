USE canchaya;

-- Añade ofertas independientes por tipo sin eliminar la configuración anterior.
SET @schema_actual = DATABASE();
SET @tiene_ofertas_json = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_actual AND TABLE_NAME = 'configuracion_complejos'
    AND COLUMN_NAME = 'ofertas_json'
);
SET @sql_ofertas_json = IF(
  @tiene_ofertas_json = 0,
  'ALTER TABLE configuracion_complejos ADD COLUMN ofertas_json TEXT DEFAULT NULL AFTER horarios_json',
  'SELECT 1'
);
PREPARE migracion_ofertas_json FROM @sql_ofertas_json;
EXECUTE migracion_ofertas_json;
DEALLOCATE PREPARE migracion_ofertas_json;

-- La ocupación pasa a ser independiente por tipo. Repetir la migración conserva
-- la misma clave; las reservas canceladas siguen sin bloquear horarios.
UPDATE reservas
SET turno_activo = CASE
  WHEN estado = 'confirmada' THEN CONCAT(complejo, '|', tipo, '|', fecha, '|', horario)
  ELSE NULL
END;
