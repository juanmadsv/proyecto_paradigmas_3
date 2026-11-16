<?php
declare(strict_types=1);

/** Reglas y persistencia del panel del administrador de complejo. */
final class AdminModel {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function esAdministrador(int $usuarioId): bool {
        $consulta = $this->db->prepare(
            'SELECT 1 FROM administradores_complejo WHERE usuario_id = :usuario_id LIMIT 1'
        );
        $consulta->execute(['usuario_id' => $usuarioId]);
        return $consulta->fetchColumn() !== false;
    }

    /** Devuelve sólo complejos asignados al administrador autenticado. */
    public function datosPanel(int $usuarioId, array $catalogo, array $plantillaTurnos): array {
        $consulta = $this->db->prepare(
            'SELECT complejo_codigo FROM administradores_complejo WHERE usuario_id = :usuario_id ORDER BY complejo_codigo'
        );
        $consulta->execute(['usuario_id' => $usuarioId]);
        $codigos = array_column($consulta->fetchAll(), 'complejo_codigo');
        $complejos = [];
        foreach ($codigos as $codigo) {
            if (!isset($catalogo[$codigo])) continue;
            $complejos[] = [
                'codigo' => $codigo,
                'nombre' => $catalogo[$codigo]['nombre'],
                'tipos' => preg_split('/\s+/', trim((string) $catalogo[$codigo]['tipos']), -1, PREG_SPLIT_NO_EMPTY),
                'precio' => (int) $catalogo[$codigo]['precio'],
                'horarios' => array_values(array_map(
                    static fn(array $turno): string => (string) $turno['hora'],
                    array_filter($plantillaTurnos['turnos'][$codigo] ?? [], static fn(array $turno): bool => ($turno['libre'] ?? false) === true)
                )),
            ];
        }

        $reservas = [];
        if ($codigos) {
            $placeholders = [];
            $parametros = [];
            foreach ($codigos as $indice => $codigo) {
                $parametro = ':complejo_' . $indice;
                $placeholders[] = $parametro;
                $parametros[$parametro] = $codigo;
            }
            $sql = "SELECT r.id, r.complejo, r.tipo, r.fecha,
                           TIME_FORMAT(r.horario, '%H:%i') AS horario,
                           r.telefono, r.total, r.sena, r.estado, u.nombre AS cliente
                    FROM reservas r
                    INNER JOIN usuarios u ON u.id = r.usuario_id
                    WHERE r.complejo IN (" . implode(', ', $placeholders) . ")
                    ORDER BY r.fecha DESC, r.horario DESC, r.id DESC";
            $consulta = $this->db->prepare($sql);
            $consulta->execute($parametros);
            $reservas = $consulta->fetchAll();
        }

        return ['complejos' => $complejos, 'reservas' => $reservas];
    }

    /** Actualiza los tipos de cancha, el precio y la plantilla horaria asignados. */
    public function actualizarConfiguracion(int $usuarioId, array $datos, array $catalogo): void {
        $codigo = isset($datos['complejo']) && is_string($datos['complejo']) ? trim($datos['complejo']) : '';
        $complejo = $catalogo[$codigo] ?? null;
        if (!is_array($complejo)) {
            throw new DomainError('bad_request', 'Seleccioná un complejo válido.');
        }
        $this->exigirAsignacion($usuarioId, $codigo);

        $tipos = $datos['tipos'] ?? null;
        $permitidos = ['5', '7', '11'];
        if (!is_array($tipos) || count($tipos) < 1 || count($tipos) > 3) {
            throw new DomainError('bad_request', 'Seleccioná al menos un tipo de cancha.');
        }
        foreach ($tipos as $tipo) {
            if (!is_string($tipo) || !in_array($tipo, $permitidos, true)) {
                throw new DomainError('bad_request', 'Hay un tipo de cancha inválido.');
            }
        }
        $tipos = array_values(array_unique($tipos));
        sort($tipos, SORT_NUMERIC);

        $precio = $datos['precio'] ?? null;
        if (!is_string($precio) && !is_int($precio) && !is_float($precio)) {
            throw new DomainError('bad_request', 'Ingresá un precio por hora válido.');
        }
        $precio = (string) $precio;
        if (!preg_match('/^[0-9]{1,8}(?:\.[0-9]{1,2})?$/D', $precio) || (float) $precio < 1 || (float) $precio > 10000000) {
            throw new DomainError('bad_request', 'El precio debe estar entre $1 y $10.000.000.');
        }

        $horarios = $datos['horarios'] ?? null;
        if (!is_array($horarios) || count($horarios) > 24) {
            throw new DomainError('bad_request', 'La lista de horarios no es válida.');
        }
        foreach ($horarios as $hora) {
            if (!is_string($hora) || !preg_match('/^(?:[01][0-9]|2[0-3]):(?:00|30)$/D', $hora)) {
                throw new DomainError('bad_request', 'Usá horarios en intervalos de 30 minutos.');
            }
        }
        $horarios = array_values(array_unique($horarios));
        sort($horarios, SORT_STRING);

        $consulta = $this->db->prepare(
            'INSERT INTO configuracion_complejos (codigo, tipos, precio, horarios_json, actualizado_por)
             VALUES (:codigo, :tipos, :precio, :horarios_json, :actualizado_por)
             ON DUPLICATE KEY UPDATE tipos = VALUES(tipos), precio = VALUES(precio),
                 horarios_json = VALUES(horarios_json), actualizado_por = VALUES(actualizado_por), actualizado_en = CURRENT_TIMESTAMP'
        );
        $consulta->execute([
            'codigo' => $codigo,
            'tipos' => implode(' ', $tipos),
            'precio' => number_format((float) $precio, 2, '.', ''),
            'horarios_json' => json_encode($horarios, JSON_THROW_ON_ERROR),
            'actualizado_por' => $usuarioId,
        ]);
    }

    private function exigirAsignacion(int $usuarioId, string $codigo): void {
        $consulta = $this->db->prepare(
            'SELECT 1 FROM administradores_complejo WHERE usuario_id = :usuario_id AND complejo_codigo = :codigo'
        );
        $consulta->execute(['usuario_id' => $usuarioId, 'codigo' => $codigo]);
        if ($consulta->fetchColumn() === false) {
            throw new DomainError('forbidden', 'No tenés permisos para administrar este complejo.');
        }
    }
}
