<?php
require __DIR__ . '/bootstrap.php';
metodo('POST');
exigirCSRF();
$datos = cuerpoJSON();
$nombre = texto($datos, 'nombre');
$email = strtolower(texto($datos, 'email'));
$pass = isset($datos['password']) && is_string($datos['password']) ? $datos['password'] : '';
// BCRYPT admite como máximo 72 bytes: se rechazan entradas mayores, sin truncarlas.
if ($nombre === '' || strlen($nombre) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || strlen($pass) < 8 || strlen($pass) > 72 || strpos($pass, "\0") !== false) {
    responder(422, ['error' => 'Ingresá un nombre (hasta 100 bytes), un email válido y una contraseña de 8 a 72 bytes.']);
}
$hash = password_hash($pass, PASSWORD_BCRYPT);
try {
    $consulta = db()->prepare('INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)');
    $consulta->execute(['nombre' => $nombre, 'email' => $email, 'password' => $hash]);
} catch (PDOException $error) {
    if (($error->errorInfo[1] ?? 0) === 1062) {
        responder(409, ['error' => 'Ese email ya tiene una cuenta.']);
    }
    throw $error;
}
responder(201, ['mensaje' => 'Cuenta creada. Ya podés iniciar sesión.']);
