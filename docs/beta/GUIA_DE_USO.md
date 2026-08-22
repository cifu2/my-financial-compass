# Guía rápida de uso — My Financial Compass

Bienvenido/a al programa de beta. Esta guía te explica en 10 minutos cómo
empezar a usar la aplicación y qué vas a encontrar en cada pantalla.

> Todos tus datos se guardan **solo en tu navegador** (localStorage). Nada se
> sube a ningún servidor, así que puedes experimentar con total libertad.
> Los datos de demostración son ficticios y puedes borrarlos cuando quieras.

## 1. Acceso a la aplicación

- Abre la URL que el equipo ha compartido contigo (normalmente
  `https://my-financial-compass.vercel.app/` o `http://localhost:3000` si la
  ejecutas localmente).
- La app arranca en la pantalla **Dashboard**. No necesitas registro ni
  credenciales.

## 2. Navegación

En la parte superior está el menú principal, visible desde todas las pantallas,
con estas secciones:

| Sección | Qué encontrarás |
| ------- | --------------- |
| **Dashboard** | Vista consolidada: resumen del mes, desglose de gastos, transacciones recientes, estado de presupuestos y patrimonio neto. |
| **Transacciones** | Registro y gestión manual de ingresos y gastos con categorías. |
| **Recurrentes** | Automatización de transacciones periódicas con frecuencias configurables. |
| **Presupuestos** | Límites mensuales por categoría con barras de progreso. |
| **Inversiones** | Cartera de inversiones con soporte multidivisa. |
| **Configuración** | Preferencias (idioma) y acceso al formulario de feedback. |

En cada pantalla verás el **breadcrumb** (indicador de la sección actual).

## 3. Primeros pasos recomendados

Para que el Dashboard tenga contenido real, prueba este orden:

1. **Transacciones** → añade 3–4 ingresos y gastos.
2. **Categorías** → dentro de Transacciones, crea o desactiva categorías.
3. **Presupuestos** → define un límite mensual para 1–2 categorías.
4. **Recurrentes** → crea 1 transacción recurrente (p. ej. nómina mensual).
5. **Inversiones** → registra 1–2 inversiones en distinta divisa.
6. **Dashboard** → revisa cómo se refleja todo, incluido el patrimonio neto.
7. (Opcional) Botón **"Cargar datos de demostración"** en el Dashboard para ver
   datos de ejemplo al instante.

## 4. Formularios y validación

- Todos los importes aceptan **decimales con un mínimo de 2 cifras** (p. ej.
  `12,50`).
- Las fechas se escriben en formato **DD/MM/AAAA** (español) o **MM/DD/AAAA**
  (inglés), según el idioma elegido en Configuración.
- Si un campo es incorrecto verás un **mensaje de error claro y contextualizado**
  justo debajo; corrígelo y guarda de nuevo.
- Todos los formularios son navegables por **teclado** (Tabulador, Enter,
  Escape) y todas las etiquetas son visibles.

## 5. Acciones destructivas: confirmación y "Deshacer"

- Cualquier **eliminación pide confirmación explícita** en un diálogo.
- Tras eliminar verás un aviso con el botón **Deshacer** durante 5–10 segundos.
- Las categorías con transacciones asociadas **no se pueden eliminar**; en su
  lugar se desactivan para ocultarlas de los formularios.

## 6. Datos y privacidad

- Persistencia local únicamente: al recargar la página tus datos siguen ahí.
- Si algo falla, aparece una pantalla de error amigable con opciones de
  **Reintentar** y **Reiniciar**; puedes copiar un informe técnico anónimo.
- **No introduzcas datos bancarios reales sensibles** durante la beta: usa
  cantidades de ejemplo.

## 7. Cómo reportar problemas

Lee [FEEDBACK_GUIDELINES.md](FEEDBACK_GUIDELINES.md) y usa el formulario que
encontrarás:

- Desde **Configuración → Enviar feedback**, o
- Directamente en `/feedback.html` (p. ej.
  `https://localhost:3000/feedback.html`).

También tienes una lista orientativa de qué probar en
[FEATURES_CHECKLIST.md](FEATURES_CHECKLIST.md).