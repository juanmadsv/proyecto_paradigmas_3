<?php
require __DIR__ . '/bootstrap.php';
$usuario = exigirAdministrador();
$modelo = new AdminModel(db());
$catalogo = new CatalogoModel(null, db());

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        responder(200, $modelo->datosPanel(
            (int) $usuario['id'],
            $catalogo->complejos()
        ));
    }
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        exigirCSRF();
        $datos = cuerpoJSON();
        $modelo->actualizarConfiguracion(
            (int) $usuario['id'],
            $datos,
            (new CatalogoModel())->complejos()
        );
        responder(200, ['mensaje' => 'La configuración del complejo se actualizó.']);
    }
    header('Allow: GET, PUT');
    responder(405, ['error' => 'Método no permitido.']);
} catch (DomainError $error) {
    responderErrorDominio($error);
}
