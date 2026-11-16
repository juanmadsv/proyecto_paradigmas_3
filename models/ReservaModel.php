<?php
declare(strict_types=1);

/** Reglas del dominio y persistencia de disponibilidad y reservas. */
final class ReservaModel {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function listarPorUsuario(int $usuarioId): array {
        $consulta = $this->db->prepare(
            "SELECT id, complejo, tipo, fecha, TIME_FORMAT(horario, '%H:%i') AS horario, total, sena, estado
             FROM reservas
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, horario DESC"
        );
        $consulta->execute(['usuario_id' => $usuarioId]);
        return $consulta->fetchAll();
    }

    /** Combina la plantilla de turnos, las reservas persistidas y la hora actual. */
    public function consultarDisponibilidad(string $fecha, array $plantilla): array {
        $fechaSolicitada = $this->validarFecha($fecha);
        $turnos = $plantilla['turnos'] ?? null;
        if (!is_array($turnos)) {
            throw new RuntimeException('La plantilla de turnos tiene un formato inválido.');
        }

        foreach ($this->listarOcupadasPorFecha($fecha) as $reserva) {
            $complejo = $reserva['complejo'];
            if (!isset($turnos[$complejo])) continue;
            foreach ($turnos[$complejo] as $indice => $turno) {
                if (($turno['hora'] ?? null) === $reserva['hora']) {
                    $turnos[$complejo][$indice]['libre'] = false;
                }
            }
        }

        $ahora = new DateTimeImmutable('now');
        foreach ($turnos as $complejo => $horarios) {
            foreach ($horarios as $indice => $turno) {
                $hora = is_array($turno) ? ($turno['hora'] ?? '') : '';
                $inicio = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $fecha . ' ' . $hora);
                if (!$inicio || $inicio <= $ahora) {
                    $turnos[$complejo][$indice]['libre'] = false;
                }
            }
        }

        $plantilla['turnos'] = $turnos;
        $plantilla['fecha'] = $fechaSolicitada->format('Y-m-d');
        return $plantilla;
    }

    /** Valida la solicitud, calcula el precio del lado servidor y persiste la reserva. */
    public function crearDesdeSolicitud(int $usuarioId, array $datos, array $catalogo, array $plantillaTurnos): array {
        $complejo = $this->texto($datos, 'complejo');
        $tipo = $this->texto($datos, 'tipo');
        $hora = $this->texto($datos, 'horario');
        $telefono = $this->texto($datos, 'telefono');
        $pago = $this->texto($datos, 'pago');
        $cupon = strtoupper($this->texto($datos, 'cupon'));
        $fecha = $this->texto($datos, 'fecha');
        $c = $catalogo[$complejo] ?? null;

        if (
            !is_array($c) ||
            !in_array($tipo, explode(' ', (string) ($c['tipos'] ?? '')), true) ||
            !preg_match('/^[0-9+() -]{6,30}$/D', $telefono) ||
            !preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D', $hora) ||
            !in_array($pago, ['debito', 'credito', 'mercadopago', 'personalpay', 'naranjax', 'uala'], true)
        ) {
            throw new DomainError('bad_request', 'Revisá el complejo, tipo de cancha, teléfono y forma de pago.');
        }

        $fechaSolicitada = $this->validarFecha($fecha);
        $servicios = $datos['servicios'] ?? [];
        if (!is_array($servicios) || count($servicios) > 4) {
            throw new DomainError('bad_request', 'Servicios inválidos.');
        }
        foreach ($servicios as $servicio) {
            if (!is_string($servicio) || !in_array($servicio, $c['servicios'] ?? [], true)) {
                throw new DomainError('bad_request', 'El complejo no ofrece uno de los servicios seleccionados.');
            }
        }
        $servicios = array_values(array_unique($servicios));

        $disponibles = $plantillaTurnos['turnos'][$complejo] ?? [];
        $libre = false;
        foreach ($disponibles as $turno) {
            if (($turno['hora'] ?? null) === $hora && ($turno['libre'] ?? false) === true) {
                $libre = true;
                break;
            }
        }
        if (!$libre) {
            throw new DomainError('conflict', 'Ese horario no está disponible.');
        }

        $inicioTurno = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $fechaSolicitada->format('Y-m-d') . ' ' . $hora);
        if (!$inicioTurno || $inicioTurno <= new DateTimeImmutable('now')) {
            throw new DomainError('conflict', 'No se pueden reservar horarios que ya comenzaron.');
        }
        if ($cupon !== '' && $cupon !== 'UCP10') {
            throw new DomainError('bad_request', 'El cupón no es válido.');
        }

        $preciosServicios = ['parrilla' => 3000, 'quincho' => 8000, 'vestuarios' => 0, 'estacionamiento' => 0];
        $subtotal = (int) ($c['precio'] ?? 0);
        foreach ($servicios as $servicio) {
            $subtotal += $preciosServicios[$servicio] ?? 0;
        }
        $total = $subtotal - ($cupon === 'UCP10' ? (int) round($subtotal * 0.10) : 0);
        $sena = (int) round($total * 0.20);
        $fecha = $fechaSolicitada->format('Y-m-d');

        try {
            $id = $this->crear([
                'usuario_id' => $usuarioId,
                'complejo' => $complejo,
                'tipo' => $tipo,
                'fecha' => $fecha,
                'horario' => $hora,
                'telefono' => $telefono,
                'pago' => $pago,
                'servicios' => json_encode($servicios, JSON_THROW_ON_ERROR),
                'cupon' => $cupon === '' ? null : $cupon,
                'total' => $total,
                'sena' => $sena,
                'turno_activo' => $complejo . '|' . $fecha . '|' . $hora . ':00',
            ]);
        } catch (PDOException $error) {
            if (($error->errorInfo[1] ?? 0) === 1062) {
                throw new DomainError('conflict', 'Otro usuario acaba de reservar ese horario. Elegí otro.');
            }
            throw $error;
        }

        return [
            'id' => $id, 'complejo' => $complejo, 'tipo' => $tipo,
            'fecha' => $fecha, 'horario' => $hora, 'total' => $total, 'sena' => $sena,
        ];
    }

    /** Aplica la política de cancelación del dominio; los detalles HTTP quedan en el controlador. */
    public function cancelar(int $reservaId, int $usuarioId): void {
        $limite = (new DateTimeImmutable('now', new DateTimeZone('America/Argentina/Buenos_Aires')))
            ->modify('+24 hours')
            ->format('Y-m-d H:i:s');
        $consulta = $this->db->prepare(
            "UPDATE reservas
             SET estado = 'cancelada', turno_activo = NULL
             WHERE id = :id
               AND usuario_id = :usuario_id
               AND estado = 'confirmada'
               AND CONCAT(fecha, ' ', horario) >= :limite"
        );
        $consulta->execute([
            'id' => $reservaId,
            'usuario_id' => $usuarioId,
            'limite' => $limite,
        ]);
        if ($consulta->rowCount() !== 1) {
            throw new DomainError('conflict', 'La reserva no existe, no te pertenece o faltan menos de 24 horas para el turno.');
        }
    }

    private function validarFecha(string $fecha): DateTimeImmutable {
        $solicitada = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        $hoy = new DateTimeImmutable('today');
        $maxima = $hoy->modify('+90 days');
        if (
            !$solicitada || $solicitada->format('Y-m-d') !== $fecha ||
            $solicitada < $hoy || $solicitada > $maxima
        ) {
            throw new DomainError('bad_request', 'Elegí una fecha entre hoy y los próximos 90 días.');
        }
        return $solicitada;
    }

    private function texto(array $datos, string $campo): string {
        return isset($datos[$campo]) && is_string($datos[$campo]) ? trim($datos[$campo]) : '';
    }

    private function listarOcupadasPorFecha(string $fecha): array {
        $consulta = $this->db->prepare(
            "SELECT complejo, TIME_FORMAT(horario, '%H:%i') AS hora
             FROM reservas
             WHERE fecha = :fecha AND estado = 'confirmada'"
        );
        $consulta->execute(['fecha' => $fecha]);
        return $consulta->fetchAll();
    }

    private function crear(array $datos): int {
        $consulta = $this->db->prepare(
            'INSERT INTO reservas
             (usuario_id, complejo, tipo, fecha, horario, telefono, pago, servicios_json, cupon, total, sena, turno_activo)
             VALUES
             (:usuario_id, :complejo, :tipo, :fecha, :horario, :telefono, :pago, :servicios, :cupon, :total, :sena, :turno_activo)'
        );
        $consulta->execute($datos);
        return (int) $this->db->lastInsertId();
    }
}
