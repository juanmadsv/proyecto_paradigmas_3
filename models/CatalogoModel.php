<?php
declare(strict_types=1);

/** Combina los datos descriptivos JSON con la configuración dinámica de MySQL. */
final class CatalogoModel {
    private string $directorio;
    private ?PDO $db;

    public function __construct(?string $directorio = null, ?PDO $db = null) {
        $this->directorio = $directorio ?? __DIR__ . '/../data';
        $this->db = $db;
    }

    public function complejos(): array {
        $complejos = $this->leer('complejos.json');
        foreach ($this->configuraciones() as $codigo => $config) {
            if (!isset($complejos[$codigo])) continue;
            $tipos = preg_split('/\s+/', trim((string) $config['tipos']), -1, PREG_SPLIT_NO_EMPTY);
            $complejos[$codigo]['tipos'] = implode(' ', $tipos);
            $complejos[$codigo]['tipo'] = implode(' · ', array_map(
                static fn(string $tipo): string => 'Fútbol ' . $tipo,
                $tipos
            ));
            $complejos[$codigo]['precio'] = (int) $config['precio'];
        }
        return $complejos;
    }

    public function turnos(): array {
        $turnos = $this->leer('turnos.json');
        foreach ($this->configuraciones() as $codigo => $config) {
            $horarios = json_decode((string) $config['horarios_json'], true, 16, JSON_THROW_ON_ERROR);
            $turnos['turnos'][$codigo] = array_map(
                static fn(string $hora): array => ['hora' => $hora, 'libre' => true],
                $horarios
            );
        }
        return $turnos;
    }

    private function configuraciones(): array {
        if (!$this->db) return [];
        $consulta = $this->db->query('SELECT codigo, tipos, precio, horarios_json FROM configuracion_complejos');
        $configuraciones = [];
        foreach ($consulta->fetchAll() as $config) {
            $configuraciones[$config['codigo']] = $config;
        }
        return $configuraciones;
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
