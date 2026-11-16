<?php
require __DIR__ . '/bootstrap.php';
metodo('GET');

$catalogo = new CatalogoModel(null, db());
responder(200, ['complejos' => $catalogo->complejos()]);
