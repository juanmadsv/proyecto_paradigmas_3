<?php
declare(strict_types=1);

/** Reglas de solicitud, consumo y envío de tokens de recuperación. */
final class RecuperacionModel {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function solicitar(string $email, string $ip): void {
        $email = strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
            throw new DomainError('invalid_input', 'Ingresá un email válido.');
        }

        $this->db->beginTransaction();
        try {
            $permitido = true;
            foreach ([['ip', $ip, 10], ['email', $email, 3]] as [$tipo, $valor, $maximo]) {
                $clave = hash('sha256', $tipo . ':' . $valor);
                $insertar = $this->db->prepare('INSERT IGNORE INTO recuperacion_limites (clave, ventana, intentos) VALUES (:clave, UTC_TIMESTAMP(), 0)');
                $insertar->execute(['clave' => $clave]);
                $leer = $this->db->prepare('SELECT intentos, ventana < UTC_TIMESTAMP() - INTERVAL 15 MINUTE AS vencida FROM recuperacion_limites WHERE clave = :clave FOR UPDATE');
                $leer->execute(['clave' => $clave]);
                $limite = $leer->fetch();
                $intentos = (int) $limite['vencida'] ? 0 : (int) $limite['intentos'];
                if ($intentos >= $maximo) $permitido = false;
                $actualizar = $this->db->prepare('UPDATE recuperacion_limites SET intentos = :intentos, ventana = CASE WHEN ventana < UTC_TIMESTAMP() - INTERVAL 15 MINUTE THEN UTC_TIMESTAMP() ELSE ventana END WHERE clave = :clave');
                $actualizar->execute(['intentos' => min($intentos + 1, $maximo), 'clave' => $clave]);
                if (!$permitido) break;
            }

            if ($permitido) {
                $buscar = $this->db->prepare('SELECT id FROM usuarios WHERE email = :email FOR UPDATE');
                $buscar->execute(['email' => $email]);
                $usuario = $buscar->fetch();
                if ($usuario) {
                    $previa = $this->db->prepare('SELECT id FROM recuperaciones_password WHERE usuario_id = :id AND solicitado_en > UTC_TIMESTAMP() - INTERVAL 1 MINUTE LIMIT 1');
                    $previa->execute(['id' => $usuario['id']]);
                    if (!$previa->fetch()) {
                        $crear = $this->db->prepare('INSERT INTO recuperaciones_password (usuario_id, solicitado_en) VALUES (:id, UTC_TIMESTAMP())');
                        $crear->execute(['id' => $usuario['id']]);
                    }
                }
            }
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
        // No se devuelve ni revela si existe una cuenta asociada.
    }

    public function restablecer(string $token, string $password, string $confirmacion): void {
        if (
            strlen($password) < 8 || strlen($password) > 72 ||
            strpos($password, "\0") !== false || $password !== $confirmacion
        ) {
            throw new DomainError('invalid_input', 'Usá una contraseña de 8 a 72 bytes y repetila exactamente igual.');
        }
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) {
            throw new DomainError('bad_request', 'El enlace no es válido o ya venció. Solicitá uno nuevo.');
        }

        $hashToken = hash('sha256', $token);
        $buscar = $this->db->prepare("SELECT usuario_id FROM recuperaciones_password WHERE token_hash = :hash AND estado IN ('enviado','enviando') AND expira_en > UTC_TIMESTAMP()");
        $buscar->execute(['hash' => $hashToken]);
        $solicitud = $buscar->fetch();
        if (!$solicitud) {
            throw new DomainError('bad_request', 'El enlace no es válido o ya venció. Solicitá uno nuevo.');
        }

        // Calcular BCRYPT antes de mantener bloqueada la fila del usuario.
        $nuevoHash = password_hash($password, PASSWORD_BCRYPT);
        $this->db->beginTransaction();
        try {
            $bloquearUsuario = $this->db->prepare('SELECT id FROM usuarios WHERE id = :id FOR UPDATE');
            $bloquearUsuario->execute(['id' => $solicitud['usuario_id']]);
            if (!$bloquearUsuario->fetch()) {
                throw new DomainError('bad_request', 'El enlace no es válido o ya venció. Solicitá uno nuevo.');
            }
            // Revalidar con bloqueo evita consumir dos veces el mismo enlace en paralelo.
            $validar = $this->db->prepare("SELECT id FROM recuperaciones_password WHERE token_hash = :hash AND estado IN ('enviado','enviando') AND expira_en > UTC_TIMESTAMP() FOR UPDATE");
            $validar->execute(['hash' => $hashToken]);
            if (!$validar->fetch()) {
                throw new DomainError('bad_request', 'El enlace no es válido o ya venció. Solicitá uno nuevo.');
            }
            $cambiar = $this->db->prepare('UPDATE usuarios SET password = :password, version_sesion = version_sesion + 1 WHERE id = :id');
            $cambiar->execute(['password' => $nuevoHash, 'id' => $solicitud['usuario_id']]);
            $consumir = $this->db->prepare("UPDATE recuperaciones_password SET token_hash = NULL, estado = 'usado' WHERE usuario_id = :id");
            $consumir->execute(['id' => $solicitud['usuario_id']]);
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    /** Reserva atómicamente el siguiente trabajo y devuelve el token sólo en memoria. */
    public function tomarPendiente(): ?array {
        $this->db->beginTransaction();
        try {
            $leer = $this->db->query("SELECT r.id, u.email FROM recuperaciones_password r JOIN usuarios u ON u.id = r.usuario_id WHERE r.estado = 'pendiente' ORDER BY r.id LIMIT 1 FOR UPDATE");
            $solicitud = $leer->fetch();
            if (!$solicitud) {
                $this->db->commit();
                return null;
            }
            $token = bin2hex(random_bytes(32));
            $preparar = $this->db->prepare("UPDATE recuperaciones_password SET token_hash = :hash, expira_en = UTC_TIMESTAMP() + INTERVAL 15 MINUTE, estado = 'enviando' WHERE id = :id");
            $preparar->execute(['hash' => hash('sha256', $token), 'id' => $solicitud['id']]);
            $this->db->commit();
            return ['id' => (int) $solicitud['id'], 'email' => $solicitud['email'], 'token' => $token];
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function marcarEnviado(int $id): void {
        $marcar = $this->db->prepare("UPDATE recuperaciones_password SET estado = 'enviado' WHERE id = :id AND estado = 'enviando'");
        $marcar->execute(['id' => $id]);
    }

    public function marcarFallido(int $id): void {
        $fallar = $this->db->prepare("UPDATE recuperaciones_password SET token_hash = NULL, estado = 'fallido' WHERE id = :id AND estado = 'enviando'");
        $fallar->execute(['id' => $id]);
    }
}
