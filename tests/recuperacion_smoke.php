<?php
// Usar una BD DE PRUEBAS, sin el proceso de correo en marcha.
// php tests/recuperacion_smoke.php http://localhost/canchaYaFrontend
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../api/bootstrap.php';
$base = rtrim($argv[1] ?? 'http://127.0.0.1:8088', '/');

function comprobar(bool $ok, string $mensaje): void {
    if (!$ok) throw new RuntimeException($mensaje);
}
function peticionPrueba(string $base, array &$cliente, string $ruta, ?array $datos = null): array {
    $headers = ['Accept: application/json'];
    if ($datos !== null) {
        $headers[] = 'Content-Type: application/json';
        if (isset($cliente['csrf'])) $headers[] = 'X-CSRF-Token: ' . $cliente['csrf'];
    }
    if (isset($cliente['cookie'])) $headers[] = 'Cookie: ' . $cliente['cookie'];
    $contexto = stream_context_create(['http' => [
        'method' => $datos === null ? 'GET' : 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $datos === null ? '' : json_encode($datos, JSON_THROW_ON_ERROR),
        'ignore_errors' => true, 'follow_location' => 0,
    ]]);
    $texto = file_get_contents($base . '/api/' . $ruta, false, $contexto);
    if ($texto === false) throw new RuntimeException('No se pudo contactar con Apache.');
    $cabeceras = $http_response_header ?? [];
    preg_match('/\\s(\\d{3})\\s/', $cabeceras[0] ?? '', $estado);
    foreach ($cabeceras as $cabecera) {
        if (preg_match('/^Set-Cookie:\\s*(CANCHAYA_SESSID=[^;]*)/i', $cabecera, $cookie)) $cliente['cookie'] = $cookie[1];
    }
    $respuesta = json_decode($texto, true, 512, JSON_THROW_ON_ERROR);
    if (isset($respuesta['csrf_token'])) $cliente['csrf'] = $respuesta['csrf_token'];
    return [(int) ($estado[1] ?? 0), $respuesta];
}

try {
    $a = []; $b = [];
    peticionPrueba($base, $a, 'csrf.php');
    peticionPrueba($base, $b, 'csrf.php');
    $email = 'reset-' . bin2hex(random_bytes(8)) . '@example.invalid';
    $vieja = 'PruebaOriginal123!';
    $nueva = 'PruebaNueva456!';
    $registro = ['nombre' => 'Prueba recuperación', 'email' => $email, 'password' => $vieja];
    comprobar(peticionPrueba($base, $a, 'registro.php', $registro)[0] === 201, 'Registro de prueba');
    comprobar(peticionPrueba($base, $a, 'login.php', $registro)[0] === 200, 'Login inicial');
    $leer = db()->prepare('SELECT id, password FROM usuarios WHERE email = :email');
    $leer->execute(['email' => $email]);
    $usuario = $leer->fetch();

    [$estadoExiste, $existe] = peticionPrueba($base, $b, 'recuperar_password.php', ['email' => $email]);
    [$estadoNoExiste, $noExiste] = peticionPrueba($base, $b, 'recuperar_password.php', ['email' => 'no-' . $email]);
    comprobar($estadoExiste === 202 && $estadoNoExiste === 202 && $existe === $noExiste, 'Respuesta genérica para emails');
    comprobar(!isset($existe['token']) && !isset($existe['enlace']), 'No revelar token');
    $pendiente = db()->prepare('SELECT id, token_hash FROM recuperaciones_password WHERE usuario_id = :id');
    $pendiente->execute(['id' => $usuario['id']]);
    $fila = $pendiente->fetch();
    comprobar((bool) $fila && $fila['token_hash'] === null, 'Solicitud en cola sin token crudo');
    // No se manda un correo: crear el hash de un token de prueba directamente.
    $token = bin2hex(random_bytes(32));
    $preparar = db()->prepare("UPDATE recuperaciones_password SET estado = 'enviado', token_hash = :hash, expira_en = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = :id");
    $preparar->execute(['hash' => hash('sha256', $token), 'id' => $fila['id']]);
    $datos = ['token' => $token, 'password' => $nueva, 'password_confirmation' => $nueva];
    comprobar(peticionPrueba($base, $b, 'restablecer_password.php', $datos)[0] === 400, 'Rechazar enlace vencido');
    $activar = db()->prepare('UPDATE recuperaciones_password SET expira_en = UTC_TIMESTAMP() + INTERVAL 15 MINUTE WHERE id = :id');
    $activar->execute(['id' => $fila['id']]);
    comprobar(peticionPrueba($base, $b, 'restablecer_password.php', array_merge($datos, ['password_confirmation' => 'Distinta123!']))[0] === 422, 'Confirmación de contraseña');
    comprobar(peticionPrueba($base, $b, 'restablecer_password.php', $datos)[0] === 200, 'Restablecer contraseña');
    comprobar(peticionPrueba($base, $b, 'restablecer_password.php', $datos)[0] === 400, 'Token de un solo uso');
    comprobar(peticionPrueba($base, $a, 'mis_reservas.php')[0] === 401, 'Invalidar sesión anterior');
    comprobar(peticionPrueba($base, $b, 'login.php', ['email' => $email, 'password' => $vieja])[0] === 401, 'Rechazar clave anterior');
    comprobar(peticionPrueba($base, $b, 'login.php', ['email' => $email, 'password' => $nueva])[0] === 200, 'Aceptar clave nueva');
    $leer->execute(['email' => $email]);
    $actual = $leer->fetch();
    comprobar(strncmp($actual['password'], '$2y$', 4) === 0 && password_verify($nueva, $actual['password']), 'BCRYPT en MySQL');
    echo "PASS: cola, respuesta genérica, vencimiento, confirmación, uso único, BCRYPT y sesiones anteriores.\n";
    echo "Se conserva la cuenta de prueba: " . $email . "\n";
} catch (Throwable $error) {
    fwrite(STDERR, "FAIL: " . $error->getMessage() . "\n");
    exit(1);
}
