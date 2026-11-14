<?php
require __DIR__ . '/bootstrap.php';
metodo('GET');

$fecha = isset($_GET['fecha']) && is_string($_GET['fecha']) ? $_GET['fecha'] : date('Y-m-d');
$fechaSolicitada = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
$hoy = new DateTimeImmutable('today');
$maxima = $hoy->modify('+90 days');
if (
    !$fechaSolicitada ||
    $fechaSolicitada->format('Y-m-d') !== $fecha ||
    $fechaSolicitada < $hoy ||
    $fechaSolicitada > $maxima
) {
    responder(400, ['error' => 'Elegí una fecha entre hoy y los próximos 90 días.']);
}

$datos = datosDominio('turnos.json');
$reservasOcupadas = (new ReservaModel(db()))->listarOcupadasPorFecha($fecha);
foreach ($reservasOcupadas as $reserva) {
    foreach ($datos['turnos'][$reserva['complejo']] ?? [] as &$turno) {
        if ($turno['hora'] === $reserva['hora']) $turno['libre'] = false;
    }
    unset($turno);
}
$datos['fecha'] = $fecha;
responder(200, $datos);
