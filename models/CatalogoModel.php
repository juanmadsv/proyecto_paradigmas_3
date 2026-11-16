<?php
declare(strict_types=1);

/** Combina datos descriptivos JSON con ofertas y horarios persistidos en MySQL. */
final class CatalogoModel {
    private string $directorio;
    private ?PDO $db;

    public function __construct(?string $directorio = null, ?PDO $db = null) {
        $this->directorio = $directorio ?? __DIR__ . '/../data';
        $this->db = $db;
    }

    public function complejos(): array {
        $complejos = $this->leer('complejos.json');
        $horariosBase = $this->leer('turnos.json')['turnos'] ?? [];
        $configuraciones = $this->configuraciones();

        foreach ($complejos as $codigo => &$complejo) {
            $tiposBase = preg_split('/\s+/', trim((string) ($complejo['tipos'] ?? '')), -1, PREG_SPLIT_NO_EMPTY);
            $horariosIniciales = array_values(array_map(
                static fn(array $turno): string => (string) $turno['hora'],
                array_filter($horariosBase[$codigo] ?? [], static fn(array $turno): bool => ($turno['libre'] ?? false) === true)
            ));
            $ofertas = [];
            foreach ($tiposBase as $tipo) {
                $ofertas[$tipo] = [
                    'precio' => (int) ($complejo['precio'] ?? 0),
                    'horarios' => $horariosIniciales,
                ];
            }

            $config = $configuraciones[$codigo] ?? null;
            if ($config) {
                if (!empty($config['ofertas_json'])) {
                    $ofertasGuardadas = json_decode((string) $config['ofertas_json'], true, 32, JSON_THROW_ON_ERROR);
                    if (is_array($ofertasGuardadas)) $ofertas = $ofertasGuardadas;
                } else {
                    // Conserva la configuración guardada con la primera versión del panel.
                    $tipos = preg_split('/\s+/', trim((string) $config['tipos']), -1, PREG_SPLIT_NO_EMPTY);
                    $horarios = json_decode((string) $config['horarios_json'], true, 16, JSON_THROW_ON_ERROR);
                    $ofertas = [];
                    foreach ($tipos as $tipo) {
                        $ofertas[$tipo] = ['precio' => (int) $config['precio'], 'horarios' => $horarios];
                    }
                }
            }

            $tipos = array_map('strval', array_keys($ofertas));
            sort($tipos, SORT_NUMERIC);
            $complejo['tipos'] = implode(' ', $tipos);
            $complejo['tipo'] = implode(' · ', array_map(
                static fn(string $tipo): string => 'Fútbol ' . $tipo,
                $tipos
            ));
            $precios = array_map(static fn(array $oferta): int => (int) $oferta['precio'], $ofertas);
            $complejo['precio'] = $precios ? min($precios) : 0;
            $complejo['ofertas'] = $ofertas;
        }
        unset($complejo);

        return $complejos;
    }

    /** Devuelve horarios disponibles por complejo y tipo de cancha. */
    public function turnos(): array {
        $base = $this->leer('turnos.json');
        $turnos = [];
        foreach ($this->complejos() as $codigo => $complejo) {
            foreach ($complejo['ofertas'] as $tipo => $oferta) {
                $turnos[$codigo][(string) $tipo] = array_map(
                    static fn(string $hora): array => ['hora' => $hora, 'libre' => true],
                    $oferta['horarios']
                );
            }
        }
        return ['fecha' => $base['fecha'] ?? 'hoy', 'turnos' => $turnos];
    }

    private function configuraciones(): array {
        if (!$this->db) return [];
        $consulta = $this->db->query('SELECT codigo, tipos, precio, horarios_json, ofertas_json FROM configuracion_complejos');
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
