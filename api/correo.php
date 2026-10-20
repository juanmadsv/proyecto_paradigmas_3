<?php
// Este archivo define funciones; no envía nada al abrirlo por HTTP.
function configuracionCorreo(): array {
    $archivo = __DIR__ . '/../config/mail.local.php';
    $autoload = __DIR__ . '/../vendor/autoload.php';
    if (!is_file($archivo) || !is_file($autoload)) {
        throw new RuntimeException('Falta config/mail.local.php o ejecutar composer install.');
    }
    require_once $autoload;
    $config = require $archivo;
    foreach (['host', 'port', 'username', 'password', 'from_email', 'base_url'] as $campo) {
        if (empty($config[$campo])) throw new RuntimeException('Configuración de correo incompleta.');
    }
    if (!filter_var($config['from_email'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Remitente inválido.');
    }
    $url = parse_url($config['base_url']);
    $local = in_array($url['host'] ?? '', ['localhost', '127.0.0.1', '::1'], true);
    if (!$url || !isset($url['host']) || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment']) ||
        !in_array($url['scheme'] ?? '', $local ? ['http', 'https'] : ['https'], true)) {
        throw new RuntimeException('base_url debe ser una URL HTTPS fija (HTTP sólo para localhost).');
    }
    return $config;
}

function enviarRecuperacion(array $config, string $email, string $token): void {
    $correo = new PHPMailer\PHPMailer\PHPMailer(true);
    $correo->isSMTP();
    $correo->Host = $config['host'];
    $correo->Port = (int) $config['port'];
    $correo->SMTPAuth = true;
    $correo->Username = $config['username'];
    $correo->Password = $config['password'];
    $correo->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $correo->SMTPDebug = 0;
    $correo->Timeout = 15;
    $correo->CharSet = 'UTF-8';
    $correo->setFrom($config['from_email'], $config['from_name'] ?? 'CanchaYa');
    $correo->addAddress($email);
    $correo->isHTML(false);
    $correo->Subject = 'Cambiar tu contraseña de CanchaYa';
    // El fragmento no viaja al servidor HTTP ni como Referer.
    $enlace = rtrim($config['base_url'], '/') . '/recuperar.html#token=' . $token;
    $correo->Body = "Recibimos una solicitud para cambiar tu contraseña de CanchaYa.\n\n"
        . "Abrí este enlace (vence en 15 minutos y se puede usar una sola vez):\n" . $enlace
        . "\n\nSi no lo solicitaste, ignorá este mensaje. Tu contraseña no cambió.";
    $correo->send();
}
