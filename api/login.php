<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();
$email = strtolower(texto($datos, 'email'));
$pass = isset($datos['password']) && is_string($datos['password']) ? $datos['password'] : '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || strlen($pass) < 8 || strlen($pass) > 72 || strpos($pass, "\0") !== false) {
    responder(401, ['error' => 'Email o contraseña incorrectos.']);
}
$consulta = db()->prepare('SELECT id, nombre, email, password, version_sesion FROM usuarios WHERE email = :email');
$consulta->execute(['email' => $email]);
$usuario = $consulta->fetch();
// El hash de respaldo evita omitir por completo BCRYPT cuando no existe el email.
$hash = $usuario['password'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
if (!password_verify($pass, $hash) || !$usuario) {
    responder(401, ['error' => 'Email o contraseña incorrectos.']);
}
session_regenerate_id(true);
$_SESSION = [
    'usuario_id' => (int) $usuario['id'],
    'version_sesion' => (int) $usuario['version_sesion'],
    'ultima_actividad' => time(),
    'csrf_token' => bin2hex(random_bytes(32)),
];
unset($usuario['password'], $usuario['version_sesion']);
$usuario['id'] = (int) $usuario['id'];
responder(200, ['usuario' => $usuario, 'csrf_token' => csrfToken()]);
