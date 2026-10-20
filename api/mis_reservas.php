<?php
require __DIR__ . '/bootstrap.php';
$usuario = exigirUsuario(); // Sin sesión: 401 inmediato, incluso enviando un usuario_id falso.

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $consulta = db()->prepare('SELECT id, complejo, tipo, fecha, TIME_FORMAT(horario, "%H:%i") AS horario, total, sena FROM reservas WHERE usuario_id = :usuario_id ORDER BY fecha DESC, horario DESC');
    $consulta->execute(['usuario_id' => $usuario['id']]);
    responder(200, ['usuario' => $usuario, 'reservas' => $consulta->fetchAll(), 'csrf_token' => csrfToken()]);
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
$servicios = $datos['servicios'] ?? [];
$c = $catalogo[$complejo] ?? null;
if (!$c || !in_array($tipo, explode(' ', $c['tipos']), true) || !preg_match('/^[0-9+() -]{6,30}$/D', $telefono) || !in_array($pago, ['debito', 'credito', 'mercadopago', 'personalpay', 'naranjax', 'uala'], true)) {
    responder(422, ['error' => 'Revisá el complejo, tipo de cancha, teléfono y forma de pago.']);
}
if (!is_array($servicios) || count($servicios) > 4) {
    responder(422, ['error' => 'Servicios inválidos.']);
}
foreach ($servicios as $servicio) {
    if (!is_string($servicio) || !in_array($servicio, $c['servicios'], true)) {
        responder(422, ['error' => 'El complejo no ofrece uno de los servicios seleccionados.']);
    }
}
$servicios = array_values(array_unique($servicios));
$libre = false;
foreach ($turnos['turnos'][$complejo] ?? [] as $turno) {
    if ($turno['hora'] === $hora && $turno['libre'] === true) $libre = true;
}
if (!$libre) responder(409, ['error' => 'Ese horario no está disponible.']);
if ($cupon !== '' && $cupon !== 'UCP10') responder(422, ['error' => 'El cupón no es válido.']);
// El importe se calcula en el servidor: nunca se acepta un total del navegador.
$precios = ['parrilla' => 3000, 'quincho' => 8000, 'vestuarios' => 0, 'estacionamiento' => 0];
$subtotal = (int) $c['precio'];
foreach ($servicios as $servicio) $subtotal += $precios[$servicio];
$total = $subtotal - ($cupon === 'UCP10' ? (int) round($subtotal * 0.10) : 0);
$sena = (int) round($total * 0.5);
$fecha = date('Y-m-d');
try {
    $consulta = db()->prepare('INSERT INTO reservas (usuario_id, complejo, tipo, fecha, horario, telefono, pago, servicios_json, cupon, total, sena) VALUES (:usuario_id, :complejo, :tipo, :fecha, :horario, :telefono, :pago, :servicios, :cupon, :total, :sena)');
    $consulta->execute([
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
    'id' => (int) db()->lastInsertId(), 'complejo' => $complejo, 'tipo' => $tipo,
    'fecha' => $fecha, 'horario' => $hora, 'total' => $total, 'sena' => $sena,
]]);
