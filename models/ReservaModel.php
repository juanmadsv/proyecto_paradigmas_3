<?php
declare(strict_types=1);

/**
 * Acceso a datos para las reservas.
 * Las reglas de negocio y la respuesta HTTP permanecen en los controladores API.
 */
final class ReservaModel {
    public function __construct(private PDO $db) {}

    public function listarPorUsuario(int $usuarioId): array {
        $consulta = $this->db->prepare(
            'SELECT id, complejo, tipo, fecha, TIME_FORMAT(horario, "%H:%i") AS horario, total, sena
             FROM reservas
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, horario DESC'
        );
        $consulta->execute(['usuario_id' => $usuarioId]);
        return $consulta->fetchAll();
    }

    public function listarOcupadasPorFecha(string $fecha): array {
        $consulta = $this->db->prepare(
            'SELECT complejo, TIME_FORMAT(horario, "%H:%i") AS hora
             FROM reservas
             WHERE fecha = :fecha'
        );
        $consulta->execute(['fecha' => $fecha]);
        return $consulta->fetchAll();
    }

    public function crear(array $datos): int {
        $consulta = $this->db->prepare(
            'INSERT INTO reservas
             (usuario_id, complejo, tipo, fecha, horario, telefono, pago, servicios_json, cupon, total, sena)
             VALUES
             (:usuario_id, :complejo, :tipo, :fecha, :horario, :telefono, :pago, :servicios, :cupon, :total, :sena)'
        );
        $consulta->execute($datos);
        return (int) $this->db->lastInsertId();
    }
}
