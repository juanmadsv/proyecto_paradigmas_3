<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
date_default_timezone_set('America/Argentina/Buenos_Aires');

function responder(int $estado, array $datos): void {
    http_response_code($estado);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    // El detalle queda en el registro del servidor, nunca en el JSON del cliente.
    error_log('CanchaYa: ' . get_class($error) . ' (' . $error->getCode() . ')');
    responder(500, ['error' => 'No se pudo completar la operación. Revisá la configuración del servidor.']);
});

if (PHP_SAPI !== 'cli') {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    session_name('CANCHAYA_SESSID');
    $seguro = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $ruta = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME']))), '/') . '/';
    session_set_cookie_params([
        'lifetime' => 0, 'path' => $ruta,
        'secure' => $seguro, 'httponly' => true, 'samesite' => 'Lax',
    ]);
    session_cache_limiter(''); // Conservar el encabezado no-store definido arriba.
    session_start();

    // Una sesión autenticada vence luego de 30 minutos sin actividad.
    if (isset($_SESSION['usuario_id'], $_SESSION['ultima_actividad']) && time() - $_SESSION['ultima_actividad'] > 1800) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    if (isset($_SESSION['usuario_id'])) {
        $_SESSION['ultima_actividad'] = time();
    }

}

function metodo(string $esperado): void {
    if ($_SERVER['REQUEST_METHOD'] !== $esperado) {
        header('Allow: ' . $esperado);
        responder(405, ['error' => 'Método no permitido.']);
    }
}

function cuerpoJSON(): array {
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        responder(415, ['error' => 'Enviá los datos como application/json.']);
    }
    $cuerpo = file_get_contents('php://input', false, null, 0, 16385);
    if ($cuerpo === false || strlen($cuerpo) > 16384) {
        responder(413, ['error' => 'La solicitud es demasiado grande.']);
    }
    try {
        $datos = json_decode($cuerpo, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        responder(400, ['error' => 'JSON inválido.']);
    }
    if (!is_array($datos) || substr(ltrim($cuerpo), 0, 1) !== '{') {
        responder(400, ['error' => 'Se esperaba un objeto JSON.']);
    }
    return $datos;
}

function texto(array $datos, string $campo): string {
    return isset($datos[$campo]) && is_string($datos[$campo]) ? trim($datos[$campo]) : '';
}

function csrfToken(): string {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function exigirCSRF(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        responder(403, ['error' => 'La solicitud no es válida. Recargá la página e intentá de nuevo.']);
    }
}

function db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $archivo = __DIR__ . '/../config/database.local.php';
    $config = is_file($archivo) ? require $archivo : [];
    $host = getenv('DB_HOST') ?: ($config['host'] ?? '127.0.0.1');
    $port = getenv('DB_PORT') ?: ($config['port'] ?? '3306');
    $base = getenv('DB_NAME') ?: ($config['database'] ?? 'canchaya');
    $usuario = getenv('DB_USER') ?: ($config['username'] ?? 'root');
    $pass = getenv('DB_PASSWORD');
    if ($pass === false) $pass = $config['password'] ?? '';
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$base;charset=utf8mb4", $usuario, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function exigirUsuario(): array {
    // Este guardián corre ANTES de consultar MySQL o procesar una reserva.
    if (!isset($_SESSION['usuario_id'])) {
        responder(401, ['error' => 'Iniciá sesión para continuar.']);
    }
    $consulta = db()->prepare('SELECT id, nombre, email, version_sesion FROM usuarios WHERE id = :id');
    $consulta->execute(['id' => $_SESSION['usuario_id']]);
    $usuario = $consulta->fetch();
    if (!$usuario || (int) ($usuario['version_sesion'] ?? 0) !== (int) ($_SESSION['version_sesion'] ?? 0)) {
        $_SESSION = [];
        session_regenerate_id(true);
        responder(401, ['error' => 'La sesión ya no es válida.']);
    }
    unset($usuario['version_sesion']);
    $usuario['id'] = (int) $usuario['id'];
    return $usuario;
}

function datosDominio(string $archivo): array {
    return json_decode(file_get_contents(__DIR__ . '/../data/' . $archivo), true, 512, JSON_THROW_ON_ERROR);
}
