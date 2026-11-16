<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();

try {
    $usuario = (new UsuarioModel(db()))->autenticar(
        texto($datos, 'email'),
        isset($datos['password']) && is_string($datos['password']) ? $datos['password'] : ''
    );
} catch (DomainError $error) {
    responderErrorDominio($error);
}

// El controlador coordina el protocolo de sesión y la respuesta HTTP.
session_regenerate_id(true);
$usuario['es_admin'] = (new AdminModel(db()))->esAdministrador((int) $usuario['id']);
$_SESSION = [
    'usuario_id' => (int) $usuario['id'],
    'version_sesion' => (int) $usuario['version_sesion'],
    'ultima_actividad' => time(),
    'csrf_token' => bin2hex(random_bytes(32)),
];
unset($usuario['version_sesion']);
responder(200, ['usuario' => $usuario, 'csrf_token' => csrfToken()]);
