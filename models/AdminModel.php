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
    public function datosPanel(int $usuarioId, array $catalogo): array {
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
                'ofertas' => $catalogo[$codigo]['ofertas'],
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

    /** Actualiza precios y horarios independientes para cada tipo de cancha habilitado. */
    public function actualizarConfiguracion(int $usuarioId, array $datos, array $catalogo): void {
        $codigo = isset($datos['complejo']) && is_string($datos['complejo']) ? trim($datos['complejo']) : '';
        $complejo = $catalogo[$codigo] ?? null;
        if (!is_array($complejo)) {
            throw new DomainError('bad_request', 'Seleccioná un complejo válido.');
        }
        $this->exigirAsignacion($usuarioId, $codigo);

        $permitidos = ['5', '7', '11'];
        $ofertas = $datos['ofertas'] ?? null;
        if (!is_array($ofertas) || count($ofertas) < 1 || count($ofertas) > 3) {
            throw new DomainError('bad_request', 'Seleccioná al menos un tipo de cancha.');
        }
        $normalizadas = [];
        foreach ($ofertas as $tipo => $oferta) {
            $tipo = (string) $tipo;
            if (!in_array($tipo, $permitidos, true) || !is_array($oferta)) {
                throw new DomainError('bad_request', 'Hay un tipo de cancha inválido.');
            }

            $precio = $oferta['precio'] ?? null;
            if (!is_string($precio) && !is_int($precio)) {
                throw new DomainError('bad_request', 'Ingresá un precio por hora válido para cada tipo.');
            }
            $precio = (string) $precio;
            if (!preg_match('/^[0-9]{1,8}$/D', $precio) || (int) $precio < 1 || (int) $precio > 10000000) {
                throw new DomainError('bad_request', 'Cada precio debe ser un importe entero entre $1 y $10.000.000.');
            }

            $horarios = $oferta['horarios'] ?? null;
            if (!is_array($horarios) || count($horarios) > 48) {
                throw new DomainError('bad_request', 'La lista de horarios no es válida.');
            }
            foreach ($horarios as $hora) {
                if (!is_string($hora) || !preg_match('/^(?:[01][0-9]|2[0-3]):(?:00|30)$/D', $hora)) {
                    throw new DomainError('bad_request', 'Usá horarios en intervalos de 30 minutos.');
                }
            }
            $horarios = array_values(array_unique($horarios));
            sort($horarios, SORT_STRING);
            $normalizadas[(int) $tipo] = ['precio' => (int) $precio, 'horarios' => $horarios];
        }

        ksort($normalizadas, SORT_NUMERIC);
        $tipos = array_map('strval', array_keys($normalizadas));
        $primeraOferta = reset($normalizadas);

        $consulta = $this->db->prepare(
            'INSERT INTO configuracion_complejos (codigo, tipos, precio, horarios_json, ofertas_json, actualizado_por)
             VALUES (:codigo, :tipos, :precio, :horarios_json, :ofertas_json, :actualizado_por)
             ON DUPLICATE KEY UPDATE tipos = VALUES(tipos), precio = VALUES(precio),
                 horarios_json = VALUES(horarios_json), ofertas_json = VALUES(ofertas_json),
                 actualizado_por = VALUES(actualizado_por), actualizado_en = CURRENT_TIMESTAMP'
        );
        $consulta->execute([
            'codigo' => $codigo,
            'tipos' => implode(' ', $tipos),
            'precio' => number_format($primeraOferta['precio'], 2, '.', ''),
            'horarios_json' => json_encode($primeraOferta['horarios'], JSON_THROW_ON_ERROR),
            'ofertas_json' => json_encode($normalizadas, JSON_THROW_ON_ERROR),
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
