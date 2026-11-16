<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();

try {
    (new UsuarioModel(db()))->registrar(
        texto($datos, 'nombre'),
        texto($datos, 'email'),
        isset($datos['password']) && is_string($datos['password']) ? $datos['password'] : ''
    );
} catch (DomainError $error) {
    responderErrorDominio($error);
}
responder(201, ['mensaje' => 'Cuenta creada. Ya podés iniciar sesión.']);
