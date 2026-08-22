# Pautas de feedback para beta testers

Gracias por probar **My Financial Compass**. Tu feedback es la principal fuente
de mejora en esta fase. Con estas pautas conseguirás que tus reportes lleguen
claros y sean accionables.

## Cómo enviar feedback

1. Usa el **formulario** en `https://<host>/feedback.html` (también enlazado
   desde **Configuración → Enviar feedback**). El formulario valida los campos
   y prepara un reporte estructurado.
2. Antes de enviar, revisa que has cubierto los puntos de la sección
   "Qué incluir".
3. Da el contexto suficiente para que podamos reproducir el caso sin datos
   adicionales.

## Tabla de prioridades

| Prioridad | Cuándo usarla                                                       | Ejemplo                                               |
| --------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| **Bloqueante** | La app no funciona o impide continuar el flujo principal.      | La app no carga en Chrome.                            |
| **Alta** | Funcionalidad principal rota o comportamiento incorrecto persistente. | Un gasto no suma en el desglose mensual. |
| **Media** | Fallo en flujos secundarios, datos incoherentes o experiencia confusa. | El día de ejecución de una recurrencia no se guarda con claridad. |
| **Baja** | Mejora o error estético menor.                                   | Texto de ayuda poco claro, alineación.                |

## Qué incluir (la clave de un buen reporte)

Seguir esta plantilla acelera el diagnóstico:

1. **Título descriptivo.** Qué ocurre y dónde (p. ej. "El desglose de gastos
   no incluye los gastos de hoy").
2. **Pasos para reproducirlo.** Lista numerada desde un estado limpio.
3. **Resultado esperado** frente a lo que **realmente ha ocurrido**.
4. **Contexto del entorno**: dispositivo, navegador y versión, idioma de la
   app (es/en), tamaño de ventana (móvil/escritorio).
5. **Datos concretos** cuando aplique: categoría, importe, fecha y tipo
   (ingreso/gasto) que producen el error.
6. **Captura de pantalla o vídeo breve** si el problema es visual (opcional,
   pero muy útil).

## Privacidad: reporte limpio

- No compartas **datos bancarios reales** ni información financiera
  identificable. Usa datos de ejemplo o cantidades ficticias.
- No incluyas números de cuenta, tarjetas ni cualquier campo sensible en los
  reportes.
- Los datos de la beta se guardan solo en tu navegador y no salen del
  dispositivo salvo en el reporte que tú elijas enviar.

## Qué NO es feedback útil

- "No funciona", sin indicar pantalla, pasos ni resultado esperado.
- Reportes duplicados ya comentados sin añadir contexto nuevo.
- Sugerencias de producto que no correspondan al estado actual de la beta
  (las recogemos igualmente, pero las separamos del tracker de errores).

## Ciclo de vida del feedback

1. **Registro**: envías el reporte con el formulario (recibes una confirmación
   con un código de seguimiento).
2. **Triage**: se consolida, se prioriza y se asigna al ingeniero fundador.
3. **Resolución**: si se acepta, se corrige, se prueba y se incluye en las
   notas de versión.

## Canales

| Canal | Para qué            |
| ----- | ------------------- |
| Formulario web (`/feedback.html`) | El canal preferido para errores y mejoras. |
| Notas de versión (`docs/`) | Para ver qué es nuevo o corregido. |
| Guía de uso (`docs/beta/GUIA_DE_USO.md`) | Dudas de uso. |

## Lista rápida antes de enviar

- [ ] Tengo pasos para reproducir y resultado esperado/real.
- [ ] Indico navegador, idioma y dispositivo.
- [ ] Uso datos de ejemplo, sin datos personales ni bancarios.
- [ ] Importes con decimales escritos en formato local (p. ej. `12,50` en es).
- [ ] No es un duplicado conocido.