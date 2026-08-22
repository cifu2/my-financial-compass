# Roadmap 30 Días - My Financial Compass

## Resumen

Este roadmap define las tareas concretas para los próximos 30 días, enfocadas en transformar el MVP actual en una aplicación production-ready. Las tareas están priorizadas y asignadas al primer ingeniero fundador que se contrate.

**Estado actual:** MVP funcional con 5 módulos completos, 129 tests, build limpio.

**Objetivo a 30 días:** Persistencia de datos + despliegue básico + primeros usuarios de prueba.

---

## Semana 1: Persistencia de Datos (Días 1-7)

### Objetivo
Los datos del usuario sobreviven al refresh del navegador y al cierre de la aplicación.

### Tareas

#### MYF-11: Implementar persistencia con localStorage
**Prioridad:** Alta
**Estimación:** 3-4 días
**Descripción:**
- Crear servicio de persistencia (`storageService.ts`)
- Implementar save/load para todas las entidades:
  - Transacciones
  - Categorías personalizadas
  - Configuración de recurrentes
  - Presupuestos
  - Inversiones
  - Configuración de usuario (divisa principal)
- Integrar con AppState existente
- Añadir serialización/deserialización segura
- Manejar errores de storage (cuota llena, datos corruptos)

**Criterios de aceptación:**
- [ ] Los datos persisten al refresh del navegador
- [ ] La app funciona correctamente con localStorage vacío
- [ ] Los tests existentes siguen pasando
- [ ] Nuevo test unitario para storageService

#### MYF-12: Añadir indicador de guardado automático
**Prioridad:** Media
**Estimación:** 1 día
**Descripción:**
- Mostrar feedback visual cuando se guardan datos (pequeño toast o indicador)
- Indicador discreto, no intrusivo

**Criterios de aceptación:**
- [ ] El usuario ve confirmación de que sus datos se han guardado
- [ ] El indicador desaparece automáticamente

#### MYF-13: Manejo de errores de storage
**Prioridad:** Media
**Estimación:** 1-2 días
**Descripción:**
- Detectar cuando localStorage está lleno
- Mostrar mensaje de error claro al usuario
- Ofrecer opciones: exportar datos, borrar datos antiguos
- Manejar datos corruptos (resetear a datos por defecto con confirmación)

**Criterios de aceptación:**
- [ ] Error de storage se muestra al usuario
- [ ] El usuario puede exportar sus datos
- [ ] La app no se rompe con datos corruptos

---

## Semana 2: Testing y Calidad (Días 8-14)

### Objetivo
Aumentar cobertura de tests, especialmente integración entre módulos.

### Tareas

#### MYF-14: Tests de integración módulo a módulo
**Prioridad:** Alta
**Estimación:** 3 días
**Descripción:**
- Testear flujo completo: crear transacción → aparece en dashboard → afecta presupuesto
- Testear flujo de recurrentes: configurar → generación automática → aparece en transacciones
- Testear flujo de inversiones: crear inversión → afecta patrimonio neto
- Usar Testing Library para tests de componente completo

**Criterios de aceptación:**
- [ ] Al menos 5 tests de integración nuevos
- [ ] Cobertura de flujos principales del usuario
- [ ] Tests ejecutables con `npm run test:run`

#### MYF-15: Test de persistencia
**Prioridad:** Alta
**Estimación:** 1 día
**Descripción:**
- Testear que los datos se guardan y cargan correctamente
- Testear manejo de errores de storage
- Testear que la app funciona con datos previamente guardados

**Criterios de aceptación:**
- [ ] Tests de persistencia implementados
- [ ] Cobertura de casos edge (storage lleno, datos corruptos)

#### MYF-16: Revisión y mejora de tests existentes
**Prioridad:** Media
**Estimación:** 2 días
**Descripción:**
- Revisar tests existentes para identificar gaps
- Añadir assertions faltantes
- Eliminar tests redundantes
- Mejorar nombres de tests para claridad

**Criterios de aceptación:**
- [ ] Todos los tests existentes revisados
- [ ] Cobertura general > 80%

---

## Semana 3: UX y Accesibilidad (Días 15-21)

### Objetivo
Mejorar la experiencia de usuario con loading states, error handling global, y accesibilidad básica.

### Tareas

#### MYF-17: Loading states y skeleton screens
**Prioridad:** Alta
**Estimación:** 2 días
**Descripción:**
- Añadir loading spinners para operaciones asíncronas
- Implementar skeleton screens para carga inicial del dashboard
- Componente reutilizable `<LoadingSpinner />` y `<Skeleton />`

**Criterios de aceptación:**
- [ ] El usuario ve feedback durante cargas
- [ ] La app no se siente "muerta" durante operaciones

#### MYF-18: Error boundary global
**Prioridad:** Alta
**Estimación:** 1 día
**Descripción:**
- Implementar React Error Boundary global
- Mostrar pantalla de error amigable
- Opción de reportar error + reiniciar app
- Logging de errores (futuro: integrar con Sentry)

**Criterios de aceptación:**
- [ ] Los errores no rompen la app completamente
- [ ] El usuario puede recuperarse de errores

#### MYF-19: Revisión de accesibilidad (a11y)
**Prioridad:** Media
**Estimación:** 2 días
**Descripción:**
- Revisar contraste de colores
- Añadir aria-labels donde falten
- Testear navegación por teclado
- Corregir issues críticos de a11y

**Criterios de aceptación:**
- [ ] Navegación completa por teclado
- [ ] Contraste WCAG AA para texto
- [ ] Labels visibles en todos los campos

#### MYF-20: Mensajes de error contextualizados
**Prioridad:** Media
**Estimación:** 1 día
**Descripción:**
- Revisar todos los mensajes de error existentes
- Asegurar que son claros y accionables
- Añadir mensajes donde falten (formularios, operaciones)

**Criterios de aceptación:**
- [ ] Todos los errores muestran mensajes claros
- [ ] El usuario sabe qué hacer para resolver el error

---

## Semana 4: Despliegue y Preparación Beta (Días 22-30)

### Objetivo
App desplegada y lista para primeros usuarios de prueba.

### Tareas

#### MYF-21: Configurar despliegue en Vercel
**Prioridad:** Alta
**Estimación:** 1 día
**Descripción:**
- Conectar repositorio con Vercel
- Configurar build automático
- Configurar dominio personalizado (si aplica)
- Verificar que la app funciona en producción

**Criterios de aceptación:**
- [ ] App accesible en URL pública
- [ ] Build automático en cada push a main
- [ ] HTTPS habilitado

#### MYF-22: Configurar entorno de staging
**Prioridad:** Media
**Estimación:** 1 día
**Descripción:**
- Crear rama `staging` para pruebas
- Configurar despliegue automático para staging
- Entorno separado para pruebas antes de producción

**Criterios de aceptación:**
- [ ] Staging accesible en URL separada
- [ ] Cambios en staging no afectan producción

#### MYF-23: Optimización de bundle y performance
**Prioridad:** Media
**Estimación:** 2 días
**Descripción:**
- Analizar bundle size con `vite-bundle-analyzer`
- Implementar lazy loading para rutas
- Optimizar imports (tree shaking)
- Añadir meta tags para SEO básico

**Criterios de aceptación:**
- [ ] Bundle size < 500KB gzipped
- [ ] Lazy loading implementado para páginas principales
- [ ] Lighthouse score > 90 en performance

#### MYF-24: Documentación para beta testers
**Prioridad:** Media
**Estimación:** 2 días
**Descripción:**
- Crear guía rápida de uso (README mejorado)
- Documentar feedback guidelines
- Preparar formulario de feedback
- Crear lista de control de features para probar

**Criterios de aceptación:**
- [ ] Guía de uso clara y completa
- [ ] Formulario de feedback configurado
- [ ] Checklist de features para testers

#### MYF-25: Revisión final y polish
**Prioridad:** Alta
**Estimación:** 2 días
**Descripción:**
- Revisión general de UX
- Corrección de bugs menores
- Mejora de microinteracciones
- Preparación de demo para stakeholders

**Criterios de aceptación:**
- [ ] App sin bugs críticos
- [ ] UX pulida y consistente
- [ ] Lista para demo

---

## Tareas Adicionales (Si queda tiempo)

#### MYF-26: Exportación de datos a CSV/Excel
**Prioridad:** Baja
**Estimación:** 2 días
**Descripción:**
- Permitir exportar transacciones a CSV
- Permitir exportar resumen mensual
- Formato compatible con Excel

#### MYF-27: Notificaciones de presupuesto
**Prioridad:** Baja
**Estimación:** 1 día
**Descripción:**
- Notificación cuando se supera el 80% del presupuesto
- Notificación cuando se supera el 100%
- Configurable por el usuario

#### MYF-28: Modo oscuro
**Prioridad:** Baja
**Estimación:** 2 días
**Descripción:**
- Detectar preferencia del sistema
- Toggle manual en configuración
- Persistir preferencia del usuario

---

## Resumen de Asignación

| Semana | Tareas | Estimación Total | Prioridad |
|--------|--------|------------------|-----------|
| Semana 1 | MYF-11, MYF-12, MYF-13 | 5-7 días | Alta |
| Semana 2 | MYF-14, MYF-15, MYF-16 | 6 días | Alta |
| Semana 3 | MYF-17, MYF-18, MYF-19, MYF-20 | 6 días | Media-Alta |
| Semana 4 | MYF-21, MYF-22, MYF-23, MYF-24, MYF-25 | 8 días | Alta |

**Total estimado:** 25-27 días de trabajo (con margen para imprevistos)

---

## Dependencias

- **MYF-11** es prerequisito para MYF-12 y MYF-13
- **MYF-14** depende de MYF-11 (tests de integración con persistencia)
- **MYF-21** es prerequisito para MYF-22
- **MYF-23** puede hacerse en paralelo con otras tareas
- **MYF-24** puede empezar en semana 3

---

## Métricas de Seguimiento

### Semana 1
- [ ] Datos persisten correctamente
- [ ] Tests de storage pasando
- [ ] Sin regressions en tests existentes

### Semana 2
- [ ] 5+ tests de integración nuevos
- [ ] Cobertura > 80%
- [ ] Todos los tests pasando

### Semana 3
- [ ] Loading states implementados
- [ ] Error boundary funcional
- [ ] a11y básico revisado

### Semana 4
- [ ] App desplegada y accesible
- [ ] Performance score > 90
- [ ] Documentación completa

---

**Creado:** 2026-08-22
**Última actualización:** 2026-08-22
**Próxima revisión:** Al completar Semana 1
