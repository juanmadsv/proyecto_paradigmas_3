<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();
$token = texto($datos, 'token');
$pass = isset($datos['password']) && is_string($datos['password']) ? $datos['password'] : '';
$confirmacion = isset($datos['password_confirmation']) && is_string($datos['password_confirmation']) ? $datos['password_confirmation'] : '';
if (strlen($pass) < 8 || strlen($pass) > 72 || strpos($pass, "\0") !== false || $pass !== $confirmacion) {
    responder(422, ['error' => 'Usá una contraseña de 8 a 72 bytes y repetila exactamente igual.']);
}
$invalido = ['error' => 'El enlace no es válido o ya venció. Solicitá uno nuevo.'];
if (!preg_match('/^[a-f0-9]{64}$/D', $token)) responder(400, $invalido);
$hashToken = hash('sha256', $token);
$pdo = db();
$buscar = $pdo->prepare("SELECT usuario_id FROM recuperaciones_password WHERE token_hash = :hash AND estado IN ('enviado','enviando') AND expira_en > UTC_TIMESTAMP()");
$buscar->execute(['hash' => $hashToken]);
$solicitud = $buscar->fetch();
if (!$solicitud) responder(400, $invalido);
// Calcular BCRYPT antes de mantener bloqueada la fila del usuario.
$nuevoHash = password_hash($pass, PASSWORD_BCRYPT);
$pdo->beginTransaction();
$bloquearUsuario = $pdo->prepare('SELECT id FROM usuarios WHERE id = :id FOR UPDATE');
$bloquearUsuario->execute(['id' => $solicitud['usuario_id']]);
if (!$bloquearUsuario->fetch()) {
    $pdo->rollBack();
    responder(400, $invalido);
}
// Volver a validar bajo bloqueo evita usar el enlace dos veces en paralelo.
$validar = $pdo->prepare("SELECT id FROM recuperaciones_password WHERE token_hash = :hash AND estado IN ('enviado','enviando') AND expira_en > UTC_TIMESTAMP() FOR UPDATE");
$validar->execute(['hash' => $hashToken]);
if (!$validar->fetch()) {
    $pdo->rollBack();
    responder(400, $invalido);
}
$cambiar = $pdo->prepare('UPDATE usuarios SET password = :password, version_sesion = version_sesion + 1 WHERE id = :id');
$cambiar->execute(['password' => $nuevoHash, 'id' => $solicitud['usuario_id']]);
$consumir = $pdo->prepare("UPDATE recuperaciones_password SET token_hash = NULL, estado = 'usado' WHERE usuario_id = :id");
$consumir->execute(['id' => $solicitud['usuario_id']]);
$pdo->commit();
// No se inicia sesión automáticamente. Las otras sesiones fallan por versión.
$_SESSION = [];
session_regenerate_id(true);
responder(200, ['mensaje' => 'Contraseña actualizada. Iniciá sesión con la nueva contraseña.', 'csrf_token' => csrfToken()]);
