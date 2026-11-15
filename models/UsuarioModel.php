<?php
declare(strict_types=1);

/**
 * Acceso a datos para cuentas de usuario.
 * Las reglas de HTTP, validación y autenticación quedan en los controladores API.
 */
final class UsuarioModel {
    public function __construct(private PDO $db) {}

    public function crear(string $nombre, string $email, string $hashPassword): void {
        $consulta = $this->db->prepare(
            'INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)'
        );
        $consulta->execute([
            'nombre' => $nombre,
            'email' => $email,
            'password' => $hashPassword,
        ]);
    }

    public function buscarPorEmail(string $email): ?array {
        $consulta = $this->db->prepare(
            'SELECT id, nombre, email, password, version_sesion FROM usuarios WHERE email = :email'
        );
        $consulta->execute(['email' => $email]);
        $usuario = $consulta->fetch();
        return $usuario === false ? null : $usuario;
    }

    public function buscarPorId(int $id): ?array {
        $consulta = $this->db->prepare(
            'SELECT id, nombre, email, version_sesion FROM usuarios WHERE id = :id'
        );
        $consulta->execute(['id' => $id]);
        $usuario = $consulta->fetch();
        return $usuario === false ? null : $usuario;
    }
}
