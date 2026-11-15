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
    $complejo = $reserva['complejo'];
    if (!isset($datos['turnos'][$complejo])) continue;
    foreach ($datos['turnos'][$complejo] as $indice => $turno) {
        if ($turno['hora'] === $reserva['hora']) {
            $datos['turnos'][$complejo][$indice]['libre'] = false;
        }
    }
}

$ahora = new DateTimeImmutable('now');
foreach ($datos['turnos'] as $complejo => $turnos) {
    foreach ($turnos as $indice => $turno) {
        $inicioTurno = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $fecha . ' ' . $turno['hora']);
        if (!$inicioTurno || $inicioTurno <= $ahora) {
            $datos['turnos'][$complejo][$indice]['libre'] = false;
        }
    }
}
$datos['fecha'] = $fecha;
responder(200, $datos);
