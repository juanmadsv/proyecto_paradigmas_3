<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
cuerpoJSON();
$_SESSION = [];
$params = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires' => time() - 42000, 'path' => $params['path'],
    'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Lax',
]);
session_destroy();
responder(200, ['mensaje' => 'Sesión cerrada.']);
