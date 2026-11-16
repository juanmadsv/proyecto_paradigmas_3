<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../api/bootstrap.php';

$email = strtolower(trim((string) ($argv[1] ?? '')));
$codigo = trim((string) ($argv[2] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $codigo === '') {
    fwrite(STDERR, "Uso: php tools/asignar_administrador.php correo@ejemplo.com codigo_complejo\n");
    exit(2);
}

$catalogo = (new CatalogoModel())->complejos();
if (!isset($catalogo[$codigo])) {
    fwrite(STDERR, "El código de complejo no existe en el catálogo.\n");
    exit(2);
}

$consulta = db()->prepare('SELECT id FROM usuarios WHERE email = :email');
$consulta->execute(['email' => $email]);
$usuarioId = $consulta->fetchColumn();
if ($usuarioId === false) {
    fwrite(STDERR, "No existe una cuenta con ese email. Creala primero desde el sitio.\n");
    exit(1);
}

$asignar = db()->prepare(
    'INSERT INTO administradores_complejo (usuario_id, complejo_codigo)
     VALUES (:usuario_id, :codigo)
     ON DUPLICATE KEY UPDATE complejo_codigo = VALUES(complejo_codigo)'
);
$asignar->execute(['usuario_id' => (int) $usuarioId, 'codigo' => $codigo]);
fwrite(STDOUT, "Permiso de administración asignado para {$codigo}. Cerrá la sesión y volvé a ingresar.\n");
