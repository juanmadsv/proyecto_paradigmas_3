<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();

try {
    (new RecuperacionModel(db()))->restablecer(
        texto($datos, 'token'),
        isset($datos['password']) && is_string($datos['password']) ? $datos['password'] : '',
        isset($datos['password_confirmation']) && is_string($datos['password_confirmation']) ? $datos['password_confirmation'] : ''
    );
} catch (DomainError $error) {
    responderErrorDominio($error);
}

// La capa web invalida la sesión actual; el modelo ya incrementó version_sesion.
$_SESSION = [];
session_regenerate_id(true);
responder(200, ['mensaje' => 'Contraseña actualizada. Iniciá sesión con la nueva contraseña.', 'csrf_token' => csrfToken()]);
