# Cierre de entrega AE4

## Estado actual en la rama

- Código y cambios: rama `ae4-tifas-implementacion`.
- Arquitectura y matriz honesta de implementación: `docs/AE4_trazabilidad_y_matriz_ISO.md`.
- Inventario de endpoints: `docs/API.md`.
- Recorrido y preguntas de defensa: `docs/AE4_guia_defensa.md`.
- Lighthouse: el equipo reporta 100/100 en Accesibilidad para `#inicio`, `#reservar`, `#cuenta`, `#mis-reservas` y `#cotizar`; falta agregar las capturas al informe.
- Teclado, Network y recorrido local: probados parcialmente; conservar capturas de Network y de navegación como evidencia.
- Informe PDF final: requiere agregar carátula con los datos definitivos de la pareja y adjuntar capturas/evidencias reales.
- Entrega Moodle: debe realizarla el equipo desde su cuenta del campus.

## Preparación del informe PDF

Orden propuesto, alineado con la consigna:

1. Carátula oficial: materia, carrera, integrantes, docente y enlace al repositorio.
2. Dominio y trazabilidad: problema, resumen de los casos de uso AE1 y tabla con el estado real de cada caso.
3. Arquitectura: diagrama SPA → API PHP → modelos PDO → MySQL; explicar que catálogo/horarios siguen como JSON de demostración.
4. API REST: incorporar el inventario de `docs/API.md`, ejemplos JSON y códigos HTTP.
5. Seguridad: explicar BCRYPT, PDO preparado, sesión regenerada, control de acceso por sesión, token CSRF y renderizado DOM seguro.
6. Matriz ISO/IEC 25010: usar `docs/AE4_trazabilidad_y_matriz_ISO.md` e indicar estado parcial cuando la evidencia no esté medida.
7. Evidencias: insertar capturas propias de Lighthouse, navegación por teclado y Network; incluir fecha, URL local y resultado observado.
8. Conclusiones y límites: declarar pagos reales, paneles administrativos/propietarios y casos de uso pendientes sin presentarlos como implementados.

## Crear el paquete ZIP

Desde Git Bash, con el repositorio local actualizado en la rama de entrega:

```bash
git switch ae4-tifas-implementacion
git pull
git archive --format=zip --output=../CanchaYa-AE4.zip ae4-tifas-implementacion
```

`git archive` incluye los archivos versionados de la rama y deja afuera archivos locales ignorados, como credenciales. Antes de subirlo, revisar que el ZIP incluya `database/schema.sql`, las migraciones y la documentación requerida. No incluir `config/database.local.php`, contraseñas ni datos personales de prueba.

## Lista de verificación final

- [ ] Actualizar esta rama en la copia local.
- [ ] Crear o actualizar la base local y aplicar la migración 003 si ya existía.
- [ ] Recorrer alta, inicio/cierre de sesión, catálogo, disponibilidad, creación, consulta y cancelación.
- [ ] Ejecutar las comprobaciones existentes contra una base de pruebas aislada.
- [ ] Probar la navegación usando solo Tab y Enter y guardar la captura.
- [x] Ejecutar Lighthouse: el equipo reporta 100/100 en Accesibilidad para las cinco rutas documentadas.
- [ ] Guardar e incorporar las capturas completas de Lighthouse al PDF.
- [ ] Inspeccionar Network y guardar respuestas JSON y códigos HTTP de los flujos principales.
- [ ] Completar datos de carátula, revisar el PDF y exportarlo.
- [ ] Generar el ZIP desde la misma rama documentada y cargar ambos entregables en Moodle.

La lista de verificación registra trabajo pendiente; marcar cada punto únicamente después de realizarlo y conservar evidencia de los resultados.
