# CanchaYa · Fundamentación con SOHDM

**Tarjeta:** Opción 10 — Selector de Horarios, Turnos o Funciones
**Módulo enriquecido:** página *Reservar* (`comprar.html` + `app.js`)
**Metodología:** SOHDM — escenario de reserva paso a paso

---

## 1. ¿Qué es SOHDM y por qué la usamos?

SOHDM (*Scenario-based Object-oriented Hypermedia Design Methodology*) diseña un
sitio **a partir de escenarios**: situaciones concretas en las que un usuario
quiere lograr algo. De cada escenario se sacan:

1. los **objetos** del dominio (qué datos se manejan),
2. las **vistas** / nodos (qué se muestra en cada pantalla),
3. el **mapa navegacional** (cómo se pasa de una pantalla a otra).

Nos sirve porque la tarea principal de CanchaYa es justamente un escenario:
**"quiero reservar una cancha para hoy"**. Si el diseño parte de ese recorrido,
cada pantalla y cada evento de JavaScript tiene un motivo.

---

## 2. Análisis del dominio: el escenario

| | |
|---|---|
| **Nombre** | Reservar una cancha paso a paso |
| **Actor** | Jugador (visitante del sitio, no necesita cuenta) |
| **Objetivo** | Dejar reservado un horario libre en un complejo |
| **Precondición** | El complejo tiene al menos un horario libre hoy |
| **Resultado** | La reserva queda confirmada y ese horario pasa a *ocupado* |

### Flujo principal

| Paso | Qué hace el jugador | Dónde | Qué hace el sistema (JS) |
|---|---|---|---|
| 1 | Entra y busca complejos por zona y tipo de cancha | `index.html` | `submit` del buscador → filtra las tarjetas |
| 2 | Toca **Reservar cancha** en un complejo | `index.html` / `detalle.html` | Link a `comprar.html?c=terraza` |
| 3 | Llega a *Reservar* con el complejo ya elegido | `comprar.html` | Lee `?c=` de la URL y selecciona el complejo |
| 4 | (Opcional) cambia de complejo | `comprar.html` | `change` en el select → **`fetch` a `data/turnos.json`** → arma el select de horarios |
| 5 | Elige un horario libre | `comprar.html` | `change` en el select de horario → actualiza el título |
| 6 | Completa nombre y teléfono, elige servicios y pago | `comprar.html` | `change` en servicios → recalcula total y seña |
| 7 | Toca **Confirmar reserva** | `comprar.html` | `submit` → valida con `.trim()` → **`fetch` a `data/reserva-respuesta.json`** |
| 8 | Ve la confirmación con su código | `comprar.html` | Muestra el resumen en el DOM y marca el horario como ocupado |

### Escenarios alternativos

| Situación | Qué pasa |
|---|---|
| **A1.** El complejo no tiene horarios libres | El select de horario se bloquea y aparece *"Sin horarios libres hoy. Probá con otro complejo."* → vuelve al paso 4 |
| **A2.** Faltan datos al confirmar | Aparece *"Para reservar falta completar: …"* → vuelve al paso 5 o 6 |
| **A3.** No se pueden cargar los horarios | Se avisa en pantalla (error de `fetch`) y no se puede reservar |
| **A4.** Falla la confirmación | Aparece *"No pudimos confirmar la reserva"* y el horario sigue libre |

### Diagrama de actividad del escenario

```
 [Inicio]
    │
    ▼
 Buscar complejo (index)
    │
    ▼
 Elegir complejo ──────────────────────────────┐
    │                                          │
    ▼                                          │
 fetch turnos.json                             │
    │                                          │
    ▼                                          │
 ¿Hay horarios libres? ──── no ──▶ (A1) avisar ┘
    │ sí
    ▼
 Elegir horario
    │
    ▼
 Completar datos y pago ◀──────────────┐
    │                                  │
    ▼                                  │
 Confirmar reserva                     │
    │                                  │
    ▼                                  │
 ¿Datos completos? ──── no ──▶ (A2) avisar qué falta
    │ sí
    ▼
 fetch reserva-respuesta.json
    │
    ▼
 Mostrar confirmación + horario pasa a ocupado
    │
    ▼
  [Fin]
```

---

## 3. Modelo de objetos

Del escenario salen estos objetos del dominio:

| Objeto | Atributos | Comportamiento |
|---|---|---|
| **Complejo** | nombre, dirección, tipos de cancha, precio por hora, servicios | ofrecer horarios |
| **Turno** | hora, libre (sí/no) | pasar a ocupado cuando se reserva |
| **Reserva** | código, complejo, cancha, turno, cliente, total, seña | confirmarse |
| **Cliente** | nombre, teléfono, e-mail, forma de pago | hacer una reserva |

Relaciones: un **Complejo** tiene muchos **Turnos**. Una **Reserva** une un
**Cliente** con un **Turno** de un **Complejo**.

### Cómo se ve en el código

Para pedir los datos usamos clases con **herencia** en `app.js`:

```
ServicioJSON                (clase madre: hace el fetch de un .json)
 ├── ServicioTurnos         (horarios de cada Complejo → objetos Turno)
 └── ServicioReservas       (confirma la Reserva)
```

- `ServicioTurnos.horariosDe(complejo)` devuelve los **Turnos** de un **Complejo**.
- `ServicioTurnos.marcarOcupado(complejo, hora)` es el comportamiento del **Turno**.
- `ServicioReservas.confirmar()` es el comportamiento de la **Reserva**.

---

## 4. Diseño de vistas (nodos)

Cada página del sitio es un **nodo** que muestra una parte de los objetos:

| Nodo | Página | Qué objetos muestra |
|---|---|---|
| Inicio + buscador | `index.html` | Complejos (resumen) y cantidad de horarios libres |
| Índice en tabla | `listado_tabla.html` | Todos los Complejos |
| Índice en tarjetas | `listado_box.html` | Todos los Complejos |
| Ficha de complejo | `detalle.html` | Un Complejo completo |
| **Reservar** | `comprar.html` | Complejo elegido + sus **Turnos** + Cliente + **Reserva** |

---

## 5. Mapa navegacional

Las **estructuras de acceso** que usa SOHDM aparecen así en CanchaYa:

- **Índice:** `listado_tabla.html` y `listado_box.html` listan todos los complejos
  y cada uno lleva a su ficha.
- **Menú:** el header (menú de 3 rayitas) conecta las 5 páginas entre sí.
- **Recorrido guiado:** dentro de *Reservar*, el formulario obliga a seguir un
  orden: complejo → horario → datos → confirmar.

```
                    ┌──────────────────────────┐
                    │   MENÚ (en todas las     │
                    │   páginas): conecta las 5│
                    └──────────────────────────┘

   ┌────────────────┐   buscar    ┌──────────────────────┐
   │   index.html   │────────────▶│ resultados (mismas   │
   │ Inicio+buscador│             │ tarjetas filtradas)  │
   └────────────────┘             └──────────┬───────────┘
                                             │ "Reservar cancha"
                                             │ (?c=complejo)
   ┌────────────────┐                        │
   │listado_tabla   │──┐                     │
   │  (índice)      │  │ ver ficha           │
   └────────────────┘  │   ┌──────────────┐  │
                       ├──▶│ detalle.html│  │
   ┌────────────────┐  │   │    (ficha)   │  │
   │listado_box     │──┘   └──────┬───────┘  │
   │  (índice)      │             │ Reservar │
   └────────────────┘             │(?c=...)  │
                                  ▼          ▼
            ┌───────────────────────────────────────────────┐
            │ comprar.html · RESERVAR (recorrido guiado)    │
            │                                               │
            │  1. Complejo ─▶ 2. Horario ─▶ 3. Datos ─▶ 4. Confirmar
            │       │            ▲                              │
            │       └─ fetch ────┘                        fetch │
            │        turnos.json                reserva-respuesta.json
            │                                                   ▼
            │                                   5. Confirmación (código)
            └───────────────────────────────────────────────┘
```

---

## 6. Conclusión

SOHDM nos permitió partir de lo que el jugador quiere hacer (**reservar un
turno**) y de ahí sacar las pantallas, los datos y los eventos. Cada paso del
escenario se corresponde con un evento en `app.js`:

- elegir complejo → `change` + `fetch` de los horarios,
- elegir horario → `change`,
- confirmar → `submit` + validación + `fetch` de la respuesta.

Los escenarios alternativos (sin horarios, datos incompletos, error de carga)
también están resueltos en el código, así que el diseño y la implementación
coinciden.


## Integración con las opciones 3 y 5

La versión integrada mantiene `main.js` para el menú, el catálogo compartido y el cupón. `app.js` contiene el buscador, la calculadora y los servicios de horarios. `main.js` inicia el módulo de horarios luego de cargar el catálogo; así se evita consultar un complejo antes de disponer de sus datos. El resumen usa el mismo cálculo de total y seña que la reserva, incluido UCP10. Los turnos se ocupan en memoria hasta recargar la página. La confirmación JSON es simulada: no se realiza POST, no se persisten reservas ni se envían correos.
