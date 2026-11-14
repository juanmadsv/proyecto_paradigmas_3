<?php
require __DIR__ . '/bootstrap.php';
$usuario = exigirUsuario(); // Sin sesión: 401 inmediato, incluso enviando un usuario_id falso.

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $reservas = (new ReservaModel(db()))->listarPorUsuario((int) $usuario['id']);
    responder(200, ['usuario' => $usuario, 'reservas' => $reservas, 'csrf_token' => csrfToken()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    exigirCSRF();
    $datos = cuerpoJSON();
    $reservaId = filter_var($datos['reserva_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$reservaId || $reservaId < 1) {
        responder(400, ['error' => 'Indicá una reserva válida para cancelar.']);
    }
    $cancelada = (new ReservaModel(db()))->cancelar((int) $reservaId, (int) $usuario['id']);
    if (!$cancelada) {
        responder(409, ['error' => 'La reserva no existe, no te pertenece o faltan menos de 24 horas para el turno.']);
    }
    responder(200, ['mensaje' => 'Reserva cancelada. No se procesó ningún reintegro porque no hay pasarela de pago integrada.']);
}

metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();
$catalogo = datosDominio('complejos.json');
$turnos = datosDominio('turnos.json');
$complejo = texto($datos, 'complejo');
$tipo = texto($datos, 'tipo');
$hora = texto($datos, 'horario');
$telefono = texto($datos, 'telefono');
$pago = texto($datos, 'pago');
$cupon = strtoupper(texto($datos, 'cupon'));
$fecha = texto($datos, 'fecha');
$c = $catalogo[$complejo] ?? null;
$fechaSolicitada = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
$hoy = new DateTimeImmutable('today');
$maxima = $hoy->modify('+90 days');

if (
    !$c ||
    !in_array($tipo, explode(' ', $c['tipos']), true) ||
    !preg_match('/^[0-9+() -]{6,30}$/D', $telefono) ||
    !preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D', $hora) ||
    !in_array($pago, ['debito', 'credito', 'mercadopago', 'personalpay', 'naranjax', 'uala'], true)
) {
    responder(400, ['error' => 'Revisá el complejo, tipo de cancha, teléfono y forma de pago.']);
}
if (
    !$fechaSolicitada ||
    $fechaSolicitada->format('Y-m-d') !== $fecha ||
    $fechaSolicitada < $hoy ||
    $fechaSolicitada > $maxima
) {
    responder(400, ['error' => 'Elegí una fecha entre hoy y los próximos 90 días.']);
}

$servicios = $datos['servicios'] ?? [];
if (!is_array($servicios) || count($servicios) > 4) {
    responder(400, ['error' => 'Servicios inválidos.']);
}
foreach ($servicios as $servicio) {
    if (!is_string($servicio) || !in_array($servicio, $c['servicios'], true)) {
        responder(400, ['error' => 'El complejo no ofrece uno de los servicios seleccionados.']);
    }
}
$servicios = array_values(array_unique($servicios));
$libre = false;
foreach ($turnos['turnos'][$complejo] ?? [] as $turno) {
    if ($turno['hora'] === $hora && $turno['libre'] === true) $libre = true;
}
if (!$libre) responder(409, ['error' => 'Ese horario no está disponible.']);
$inicioTurno = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $fecha . ' ' . $hora);
if (!$inicioTurno || $inicioTurno <= new DateTimeImmutable('now')) {
    responder(409, ['error' => 'No se pueden reservar horarios que ya comenzaron.']);
}
if ($cupon !== '' && $cupon !== 'UCP10') responder(400, ['error' => 'El cupón no es válido.']);

// El importe se calcula en el servidor: nunca se acepta un total del navegador.
$precios = ['parrilla' => 3000, 'quincho' => 8000, 'vestuarios' => 0, 'estacionamiento' => 0];
$subtotal = (int) $c['precio'];
foreach ($servicios as $servicio) $subtotal += $precios[$servicio];
$total = $subtotal - ($cupon === 'UCP10' ? (int) round($subtotal * 0.10) : 0);
$sena = (int) round($total * 0.20);

try {
    $idReserva = (new ReservaModel(db()))->crear([
        'usuario_id' => $usuario['id'], 'complejo' => $complejo, 'tipo' => $tipo,
        'fecha' => $fecha, 'horario' => $hora, 'telefono' => $telefono, 'pago' => $pago,
        'servicios' => json_encode($servicios, JSON_THROW_ON_ERROR),
        'cupon' => $cupon === '' ? null : $cupon, 'total' => $total, 'sena' => $sena,
    ]);
} catch (PDOException $error) {
    if (($error->errorInfo[1] ?? 0) === 1062) responder(409, ['error' => 'Otro usuario acaba de reservar ese horario. Elegí otro.']);
    throw $error;
}
responder(201, ['mensaje' => 'Reserva guardada.', 'reserva' => [
    'id' => $idReserva, 'complejo' => $complejo, 'tipo' => $tipo,
    'fecha' => $fecha, 'horario' => $hora, 'total' => $total, 'sena' => $sena,
]]);
