<?php
require __DIR__ . '/bootstrap.php';
metodo('GET');
$fecha = isset($_GET['fecha']) && is_string($_GET['fecha']) ? $_GET['fecha'] : date('Y-m-d');

try {
    $disponibilidad = (new ReservaModel(db()))->consultarDisponibilidad(
        $fecha,
        (new CatalogoModel())->turnos()
    );
} catch (DomainError $error) {
    responderErrorDominio($error);
}
responder(200, $disponibilidad);
