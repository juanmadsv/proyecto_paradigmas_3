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
    $recuperaciones = new RecuperacionModel(db());
} catch (Throwable $error) {
    fwrite(STDERR, "No se pudo iniciar el envío. Revisá Composer, MySQL y config/mail.local.php.\n");
    exit(1);
}

$continuar = in_array('--watch', $argv, true);
while (true) {
    $solicitud = $recuperaciones->tomarPendiente();
    if (!$solicitud) {
        if ($continuar) {
            sleep(5);
            continue;
        }
        break;
    }

    try {
        enviarRecuperacion($config, $solicitud['email'], $solicitud['token']);
        $recuperaciones->marcarEnviado($solicitud['id']);
        echo "Solicitud " . $solicitud['id'] . ": enviada.\n";
    } catch (Throwable $error) {
        $recuperaciones->marcarFallido($solicitud['id']);
        fwrite(STDERR, "Solicitud " . $solicitud['id'] . ": envío fallido. Revisá Gmail, OpenSSL y la configuración.\n");
    }
    unset($solicitud);
}
