<?php
// Copiar como mail.local.php. Nunca subir ese archivo ni la clave de aplicación.
return [
    'host' => 'smtp.gmail.com',
    'port' => 587,
    'username' => 'tu-cuenta@gmail.com',
    'password' => 'CONTRASENA_DE_APLICACION',
    'from_email' => 'tu-cuenta@gmail.com',
    'from_name' => 'CanchaYa',
    // URL fija; nunca se toma del encabezado Host del visitante.
    'base_url' => 'http://localhost/canchaYaFrontend',
];
