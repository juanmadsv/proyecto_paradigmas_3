<?php
require __DIR__ . '/bootstrap.php';
metodo('GET');
responder(200, ['csrf_token' => csrfToken()]);
