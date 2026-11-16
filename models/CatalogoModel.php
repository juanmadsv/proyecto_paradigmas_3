<?php
declare(strict_types=1);

/** Acceso al catálogo de demostración mantenido como archivos JSON. */
final class CatalogoModel {
    private string $directorio;

    public function __construct(?string $directorio = null) {
        $this->directorio = $directorio ?? __DIR__ . '/../data';
    }

    public function complejos(): array {
        return $this->leer('complejos.json');
    }

    public function turnos(): array {
        return $this->leer('turnos.json');
    }

    private function leer(string $archivo): array {
        $ruta = $this->directorio . '/' . $archivo;
        $contenido = file_get_contents($ruta);
        if ($contenido === false) {
            throw new RuntimeException('No se pudo leer el catálogo de demostración.');
        }
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($datos)) {
            throw new RuntimeException('El catálogo de demostración tiene un formato inválido.');
        }
        return $datos;
    }
}
