<?php
// Ejecutar desde Git Bash: php tools/enviar_recuperaciones.php --watch
// Sin --watch procesa la cola una vez. Jamás se ejecuta por HTTP.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/../api/bootstrap.php';
require __DIR__ . '/../api/correo.php';

try {
    $config = configuracionCorreo();
    $pdo = db();
} catch (Throwable $error) {
    fwrite(STDERR, "No se pudo iniciar el envío. Revisá Composer, MySQL y config/mail.local.php.\n");
    exit(1);
}
$continuar = in_array('--watch', $argv, true);
do {
    $pdo->beginTransaction();
    $leer = $pdo->query("SELECT r.id, u.email FROM recuperaciones_password r JOIN usuarios u ON u.id = r.usuario_id WHERE r.estado = 'pendiente' ORDER BY r.id LIMIT 1 FOR UPDATE");
    $solicitud = $leer->fetch();
    if (!$solicitud) {
        $pdo->commit();
        if ($continuar) sleep(5);
        continue;
    }
    $token = bin2hex(random_bytes(32));
    // Sólo el hash se guarda en MySQL; el token crudo vive en memoria y el email.
    $preparar = $pdo->prepare("UPDATE recuperaciones_password SET token_hash = :hash, expira_en = UTC_TIMESTAMP() + INTERVAL 15 MINUTE, estado = 'enviando' WHERE id = :id");
    $preparar->execute(['hash' => hash('sha256', $token), 'id' => $solicitud['id']]);
    $pdo->commit();
    try {
        enviarRecuperacion($config, $solicitud['email'], $token);
        // No revivir un enlace consumido mientras Gmail terminaba de responder.
        $marcar = $pdo->prepare("UPDATE recuperaciones_password SET estado = 'enviado' WHERE id = :id AND estado = 'enviando'");
        $marcar->execute(['id' => $solicitud['id']]);
        echo "Solicitud " . $solicitud['id'] . ": enviada.\n";
    } catch (Throwable $error) {
        $fallar = $pdo->prepare("UPDATE recuperaciones_password SET token_hash = NULL, estado = 'fallido' WHERE id = :id AND estado = 'enviando'");
        $fallar->execute(['id' => $solicitud['id']]);
        // No imprimir el mensaje SMTP: puede contener direcciones o el enlace.
        fwrite(STDERR, "Solicitud " . $solicitud['id'] . ": envío fallido. Revisá Gmail, OpenSSL y la configuración.\n");
    }
    unset($token);
} while ($continuar || $solicitud);
