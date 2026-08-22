# ADR-0013: Actividad del grupo y borrado con doble confirmación

- Estado: Aceptado
- Fecha: 2026-08-22
- Alcance: HU-0.11 / HU-0.12 / MYF-29

## Contexto

Las HU-0.7..0.10 (MYF-27..28) añadieron a los grupos muchas acciones con
efecto visible: reparto de gastos, liquidaciones, inversiones compartidas,
presupuestos, roles y permisos. Dos vacíos quedaron:

- **Transparencia (HU-0.11):** un miembro no tiene forma de saber *quién*
  cambió *qué* y *cuándo* — "Luis añadió Supermercado 82 €", "Ana liquidó
  45 €". Sin registro, la confianza en un ledger compartido no tiene base.
- **Ciclo de vida (HU-0.12):** un grupo no se puede acabar formalmente. Solo
  se podía borrar un grupo *vacío* (un único miembro), y no existía opción
  conservadora para "dar por cerrado" un grupo sin destruir su historial.

## Decisión

### 1. Auditoría `GroupActivity`

Modelo persistido en el snapshot de grupos (`GroupSnapshot.activities`), no en
el snapshot financiero: la actividad es propiedad del grupo, y de la churrita
se encarga el mirror de grupos en `features/groups`.

- Columnas objetivo de tabla en producción: `(groupId, userId, action,
  details, timestamp)`. `details` guarda solo scalars JSON (concept, amount,
  recipientId…) listos para grepear.
- **Registro centralizado** en `groupActivity.ts`: `recordGroupActivity`
  (append-only, hace trim a `MAX_ACTIVITY_PER_GROUP` para acotar el tamaño en
  localStorage) + `listGroupActivity` (descendente, filtrable por `memberId` y
  `action`).
- **Los puntos de escritura son los servicios de dominio**, nunca la UI:
  - `groupService`: crear/editar/archivar/borrar el grupo, alta/baja de
    miembros, cambio de rol, invitaciones.
  - `AppState`: transacciones de grupo (alta y bajo delete/undo), reparto,
    liquidaciones, inversiones, presupuestos, recurrentes del grupo.
- **Render**: `activityMessages.ts` produce frases i18n con el nombre del
  actor/objetivo (resuelto del auth store) y dinero formateado con la divisa
  del grupo; por eso la frase sale como en la aceptación de la HU y no como
  un JSON tecnico.
- Aplicar el lenguaje es **retrocompatible**: `version:1` sigue en vigor; las
  filas con `action` desconocida o payload no-escalar se descartan por fila al
  leer (mismo criterio que el resto de stores).

### 2. Ciclo de vida del grupo: archivar vs. eliminar

- **`archiveGroup`** (`archivedAt` en `Group`): conserva el grupo, sus datos
  compartidos y su auditoría, pero lo oculta de las listas activas
  (`listUserGroups` lo filtra). Un admin puede `restoreGroup`. Es la opción
  conservadora por defecto.
- **`deleteGroup`** (HU-0.12): elimina el grupo, sus membresías, invitaciones
  y actividad, y el fronted hace `removeGroupData(groupId)` para purgar las
  filas financieras del grupo (transacciones, repartos, liquidaciones,
  inversiones, presupuestos, recurrentes). El "grupo debe estar vacío" previo
  deja de aplicarse: el flujo de doble confirmación es ahora la barrera.
- **Aviso a los miembros**: antes de archivar o borrar, el servicio persiste
  un `group_delete_notice` por destinatario. En un MVP local-first eso es *el
  aviso* (queda en el historial del grupo); con un backend real se convertiría
  en fan-out de emails/notificación. La UI lo deja **activado por defecto**.

### 3. UI

- **`/grupos/:id/actividad`**: pantalla de actividad con filtros por miembro
  y tipo de acción, orden descendente, estados vacíos y `aria-live`.
  Enlazada desde **Balances** (cuando hay grupo) y desde **Settings → Grupos**.
- **Settings → Grupos** (`GroupAdminPanel`): lista activa/archivada con rol,
  enlace a actividad, restaurar y el diálogo de borrado.
- **`DeleteGroupDialog`** (doble confirmación explícita):
  1. Paso 1: explica el destino de los datos y elige **archivar** (destructivo
     cero) frente a **eliminar** (con lista clara de lo que se borra), con el
     aviso a los miembros activado por defecto.
  2. Paso 2: hay que **teclear el nombre del grupo** para habilitar el botón
     destructivo (clásico "type-to-confirm").
- Accesibilidad: `role="alertdialog"`, `aria-modal`, foco inicial,
  atrapado de Tab y cierre con `Escape`.

## Consecuencias

- La actividad se trunca (500 último eventos) para acotar la clave de
  localStorage; en producción sería una tabla apenase (corta por fecha).
- `deleteGroup` cambia su contrato previo ("último admin") — el test
  `refuses to delete a group that still has other members` se actualiza
  (HU-0.12).
- Los grupos archivados siguen leyéndose por servicios que leen el snapshot
  directamente las ayudas (budget/investment context) — pendiente de
  ampliar el filtrado `archivedAt` a estos selectores en una iteración
  posterior (se nota en README).
- El backend real de actividad (tabla `group_activity`) recibe las mismas
  columnas decididas aquí; ninguna UI cambia.