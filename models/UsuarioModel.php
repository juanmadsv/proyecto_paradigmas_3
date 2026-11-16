<?php
declare(strict_types=1);

/** Modelo de usuarios: reglas de registro/autenticación y persistencia PDO. */
final class UsuarioModel {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function registrar(string $nombre, string $email, string $password): void {
        $nombre = trim($nombre);
        $email = strtolower(trim($email));
        if (
            $nombre === '' || strlen($nombre) > 100 ||
            !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 ||
            strlen($password) < 8 || strlen($password) > 72 || strpos($password, "\0") !== false
        ) {
            throw new DomainError('bad_request', 'Ingresá un nombre (hasta 100 bytes), un email válido y una contraseña de 8 a 72 bytes.');
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        try {
            $this->crear($nombre, $email, $hash);
        } catch (PDOException $error) {
            if (($error->errorInfo[1] ?? 0) === 1062) {
                throw new DomainError('conflict', 'Ese email ya tiene una cuenta.');
            }
            throw $error;
        }
    }

    /** Devuelve datos de sesión sólo tras validar las credenciales. */
    public function autenticar(string $email, string $password): array {
        $email = strtolower(trim($email));
        $credencialesInvalidas = static function (): DomainError {
            return new DomainError('unauthorized', 'Email o contraseña incorrectos.');
        };
        if (
            !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 ||
            strlen($password) < 8 || strlen($password) > 72 || strpos($password, "\0") !== false
        ) {
            throw $credencialesInvalidas();
        }

        $usuario = $this->buscarPorEmail($email);
        // El hash de respaldo evita omitir BCRYPT cuando el email no existe.
        $hash = $usuario['password'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if (!password_verify($password, $hash) || !$usuario) {
            throw $credencialesInvalidas();
        }
        unset($usuario['password']);
        $usuario['id'] = (int) $usuario['id'];
        return $usuario;
    }

    private function crear(string $nombre, string $email, string $hashPassword): void {
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
