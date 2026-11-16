<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();

try {
    (new RecuperacionModel(db()))->solicitar(
        texto($datos, 'email'),
        $_SERVER['REMOTE_ADDR'] ?? 'local'
    );
} catch (DomainError $error) {
    responderErrorDominio($error);
}

// Mismo mensaje y estado para cuentas existentes, inexistentes o límites alcanzados.
responder(202, ['mensaje' => 'Si el email está registrado, recibirás un enlace para cambiar la contraseña. Puede tardar unos minutos.']);
