<?php
require __DIR__ . '/bootstrap.php';
metodo('GET');
$datos = datosDominio('turnos.json');
$consulta = db()->prepare('SELECT complejo, TIME_FORMAT(horario, "%H:%i") AS hora FROM reservas WHERE fecha = :fecha');
$consulta->execute(['fecha' => date('Y-m-d')]);
foreach ($consulta->fetchAll() as $reserva) {
    foreach ($datos['turnos'][$reserva['complejo']] as &$turno) {
        if ($turno['hora'] === $reserva['hora']) $turno['libre'] = false;
    }
    unset($turno);
}
$datos['fecha'] = date('Y-m-d');
responder(200, $datos);
