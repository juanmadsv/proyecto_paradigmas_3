<?php
require __DIR__ . '/bootstrap.php';
metodo('GET');
$datos = datosDominio('turnos.json');
$reservasOcupadas = (new ReservaModel(db()))->listarOcupadasPorFecha(date('Y-m-d'));
foreach ($reservasOcupadas as $reserva) {
    foreach ($datos['turnos'][$reserva['complejo']] as &$turno) {
        if ($turno['hora'] === $reserva['hora']) $turno['libre'] = false;
    }
    unset($turno);
}
$datos['fecha'] = date('Y-m-d');
responder(200, $datos);
