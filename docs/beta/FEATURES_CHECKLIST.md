# Lista de control de features — beta testers

Usa esta lista para recorrer las cinco áreas de la aplicación y marcar lo que
ya has probado. Cada módulo tiene los flujos esperados que queremos validar.
Cuando encuentres algo raro, envíalo según
[FEEDBACK_GUIDELINES.md](FEEDBACK_GUIDELINES.md).

---

## 1. Dashboard (Módulo 5)

- [ ] Carga el resumen mensual con ingresos, gastos y flujo de caja.
- [ ] Aparecen las transacciones recientes.
- [ ] El desglose de gastos muestra las principales categorías.
- [ ] El estado de presupuestos refleja las barras de progreso.
- [ ] El patrimonio neto suma líquido + inversiones.
- [ ] Se puede cargar datos de demostración (botón) y se reflejan en los widgets.
- [ ] El historial mensual permite cambiar de mes.
- [ ] Exportar: permite descargar CSV o imprimir el resumen.
- [ ] Navegación desde el Dashboard a cada sección funciona correctamente.

## 2. Transacciones (Módulo 1)

- [ ] Registrar un gasto con importe con decimales (p. ej. `12,50`).
- [ ] Registrar un ingreso.
- [ ] Validación: importe obligatorio > 0, concepto obligatorio, fecha válida y
  no futura.
- [ ] Seleccionar categoría desde el selector (con búsqueda si aplica).
- [ ] Editar una transacción existente.
- [ ] Eliminar una transacción → confirmación previa.
- [ ] Después de eliminar, aparece el botón **Deshacer** durante 5–10 s y
  restaura el elemento.
- [ ] Fechas en formato DD/MM/AAAA (es) o MM/DD/AAAA (en).
- [ ] Categorías: crear, editar, renombrar, desactivar y reactivar.
- [ ] Las categorías con transacciones no se pueden borrar (se desactivan).

## 3. Presupuestos (Módulo 3)

- [ ] Crear un presupuesto mensual para una categoría con límite.
- [ ] La barra de progreso se actualiza al añadir gastos.
- [ ] Evita duplicar un presupuesto activo para la misma categoría.
- [ ] Editar y eliminar presupuestos (con confirmación).
- [ ] El estado del presupuesto aparece en el dashboard.

## 4. Transacciones recurrentes (Módulo 2)

- [ ] Crear una recurrencia (tipo, importe, frecuencia, fecha de inicio).
- [ ] Frecuencias configurables: semanal, quincenal, mensual, bimensual,
  trimestral, semestral, anual.
- [ ] La vista previa muestra la próxima ejecución.
- [ ] Genera transacciones automáticamente cuando toca.
- [ ] Pausar y reanudar una recurrencia.
- [ ] Editar la configuración afectando a todas las próximas ejecuciones.
- [ ] Editar una sola ocurrencia (override).
- [ ] Eliminar recurrencia con confirmación y opción de deshacer.

## 5. Inversiones y multidivisa (Módulo 4)

- [ ] Registrar una inversión con tipo de activo.
- [ ] Indicar divisa distinta de EUR (multidivisa).
- [ ] El valor se convierte usando tipo de cambio.
- [ ] El total patrimonial del dashboard incluye las inversiones (con datos de
  tipo de cambio disponibles).
- [ ] Editar y eliminar inversiones (confirmación).
- [ ] Si falta el tipo de cambio, se indica claramente y se excluye del total.

## 5b. Grupos: actividad y borrado (HU-0.11 / HU-0.12)

- [ ] En **Configuración → Grupos** se ven mis grupos con mi rol y nº de miembros.
- [ ] Un gasto/liquidación del grupo se refleja en **Actividad del grupo**
  ("Luis añadió Supermercado 82,00 €", "Ana liquidó 45,00 € a José").
- [ ] La actividad aparece de **más reciente a más antigua**.
- [ ] Se puede filtrar por **miembro** y por **tipo de acción**.
- [ ] El enlace a la actividad existe desde Balances y desde Configuración.
- [ ] Como admin, puedo **borrar un grupo** desde Configuración → Grupos.
- [ ] El diálogo exige **doble confirmación**: elegir archivar/eliminar + aviso
      a los miembros, y luego **teclear el nombre del grupo**.
- [ ] **Archivar** conserva datos y actividad; el grupo aparece como archivado y
      se puede **restaurar**.
- [ ] **Eliminar** borra el grupo y sus datos compartidos de forma definitiva.

---

## 6. Transversal (toda la app)

- [ ] Navegación con menú principal desde todas las pantallas.
- [ ] Breadcrumb / indicador de sección en cada pantalla.
- [ ] Formularios navegables por teclado (Tab / Enter / Escape).
- [ ] Labels visibles en todos los campos de formulario.
- [ ] Contraste de color adecuado (WCAG 2.1 AA).
- [ ] Cambio de idioma (es/en) desde Configuración.
- [ ] Persistencia: al recargar, los datos se mantienen.
- [ ] Pantalla de error amigable aparece ante un fallo (sin perder datos).
- [ ] Botón de "Cargar datos de demostración" y restablecer/no usar datos demo
  según el flujo.

### Registro de prueba (opcional)

- [ ] He anotado el navegador e idioma usado.
- [ ] He probado el formulario de feedback y llega mi reporte.

---

### Después de probar

- [ ] Marqué cada flujo probado con ✔ o ✘ y anoté los fallos.
- [ ] Envié cada fallo por separado con el formulario, indicando
  fecha, sección y pasos.