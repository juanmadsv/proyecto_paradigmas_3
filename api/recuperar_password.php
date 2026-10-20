<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();
$email = strtolower(texto($datos, 'email'));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    responder(422, ['error' => 'Ingresá un email válido.']);
}

// El correo se envía en una cola: la respuesta HTTP nunca espera a Gmail.
$pdo = db();
$pdo->beginTransaction();
$permitido = true;
foreach ([['ip', $_SERVER['REMOTE_ADDR'] ?? 'local', 10], ['email', $email, 3]] as [$tipo, $valor, $maximo]) {
    $clave = hash('sha256', $tipo . ':' . $valor);
    $insertar = $pdo->prepare('INSERT IGNORE INTO recuperacion_limites (clave, ventana, intentos) VALUES (:clave, UTC_TIMESTAMP(), 0)');
    $insertar->execute(['clave' => $clave]);
    $leer = $pdo->prepare('SELECT intentos, ventana < UTC_TIMESTAMP() - INTERVAL 15 MINUTE AS vencida FROM recuperacion_limites WHERE clave = :clave FOR UPDATE');
    $leer->execute(['clave' => $clave]);
    $limite = $leer->fetch();
    $intentos = (int) $limite['vencida'] ? 0 : (int) $limite['intentos'];
    if ($intentos >= $maximo) $permitido = false;
    $actualizar = $pdo->prepare('UPDATE recuperacion_limites SET intentos = :intentos, ventana = CASE WHEN ventana < UTC_TIMESTAMP() - INTERVAL 15 MINUTE THEN UTC_TIMESTAMP() ELSE ventana END WHERE clave = :clave');
    $actualizar->execute(['intentos' => min($intentos + 1, $maximo), 'clave' => $clave]);
    if (!$permitido) break;
}
if ($permitido) {
    $buscar = $pdo->prepare('SELECT id FROM usuarios WHERE email = :email FOR UPDATE');
    $buscar->execute(['email' => $email]);
    $usuario = $buscar->fetch();
    if ($usuario) {
        // Una sola solicitud por minuto por cuenta; no se invalidan enlaces vigentes.
        $previa = $pdo->prepare('SELECT id FROM recuperaciones_password WHERE usuario_id = :id AND solicitado_en > UTC_TIMESTAMP() - INTERVAL 1 MINUTE LIMIT 1');
        $previa->execute(['id' => $usuario['id']]);
        if (!$previa->fetch()) {
            $crear = $pdo->prepare('INSERT INTO recuperaciones_password (usuario_id, solicitado_en) VALUES (:id, UTC_TIMESTAMP())');
            $crear->execute(['id' => $usuario['id']]);
        }
    }
}
$pdo->commit();
// Mismo mensaje y estado para email existente, inexistente o límite alcanzado.
// Ningún token, enlace ni contraseña se devuelve al navegador.
responder(202, ['mensaje' => 'Si el email está registrado, recibirás un enlace para cambiar la contraseña. Puede tardar unos minutos.']);
