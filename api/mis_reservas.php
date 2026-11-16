<?php
require __DIR__ . '/bootstrap.php';
$usuario = exigirUsuario();

try {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $reservas = (new ReservaModel(db()))->listarPorUsuario((int) $usuario['id']);
        responder(200, ['usuario' => $usuario, 'reservas' => $reservas, 'csrf_token' => csrfToken()]);
    }

    if ($metodo === 'DELETE') {
        exigirCSRF();
        $datos = cuerpoJSON();
        $reservaId = filter_var($datos['reserva_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$reservaId || $reservaId < 1) {
            responder(400, ['error' => 'Indicá una reserva válida para cancelar.']);
        }
        (new ReservaModel(db()))->cancelar((int) $reservaId, (int) $usuario['id']);
        responder(200, ['mensaje' => 'Reserva cancelada. No se procesó ningún reintegro porque no hay pasarela de pago integrada.']);
    }

    if ($metodo !== 'POST') {
        header('Allow: GET, POST, DELETE');
        responder(405, ['error' => 'Método no permitido.']);
    }

    exigirCSRF();
    $datos = cuerpoJSON();
    $reserva = (new ReservaModel(db()))->crearDesdeSolicitud(
        (int) $usuario['id'],
        $datos,
        datosDominio('complejos.json'),
        datosDominio('turnos.json')
    );
    responder(201, ['mensaje' => 'Reserva guardada.', 'reserva' => $reserva]);
} catch (DomainError $error) {
    responderErrorDominio($error);
}
