# Plan de Contratación - My Financial Compass

## Resumen Ejecutivo

My Financial Compass necesita su primer ingeniero fundador para llevar la aplicación de un MVP funcional a un producto production-ready. La aplicación ya tiene todos los módulos core implementados (transacciones, recurrentes, presupuestos, inversiones, dashboard) con 129 tests pasando y build limpio. El siguiente salto requiere persistencia, backend, despliegue, y preparación para usuarios reales.

---

## 1. Founding Engineer (Ingeniero Fundador)

### Summary
Ingeniero full-stack senior que será el primer miembro del equipo técnico, responsable de transformar el MVP actual en una aplicación production-ready con persistencia, autenticación, y despliegue continuo.

### Expertise & Responsibilities

**Responsabilidades principales:**
- Implementar persistencia de datos (localStorage inicialmente, migración a backend después)
- Diseñar e implementar la arquitectura de datos y esquemas
- Añadir autenticación de usuarios y autorización
- Configurar pipeline de despliegue continuo (CI/CD)
- Optimizar rendimiento y experiencia de usuario
- Establecer estándares de código y testing
- Colaborar directamente con el CEO en priorización de producto

**Expertise requerida:**
- 5+ años de experiencia en desarrollo web full-stack
- Dominio de React/TypeScript (el proyecto usa React 19 + Vite)
- Experiencia con bases de datos (PostgreSQL o similar)
- Conocimiento de autenticación (JWT, OAuth, sesiones)
- Experiencia con despliegue en cloud (Vercel, Railway, o similar)
- Testing automatizado (unit, integration, e2e)
- Git y flujos de trabajo colaborativos

### Priorities

1. **Persistencia de datos** (Semana 1-2)
   - Implementar localStorage como solución inmediata
   - Diseñar esquema de datos para migración futura a backend
   - Asegurar que los datos sobrevivan al refresh del navegador

2. **Backend y API** (Semana 3-4)
   - Crear API REST o GraphQL para CRUD de entidades
   - Implementar autenticación básica
   - Conectar frontend con backend

3. **Despliegue y CI/CD** (Semana 5-6)
   - Configurar pipeline de despliegue automático
   - Implementar monitoreo básico de errores
   - Establecer entornos (dev, staging, production)

4. **Mejoras de UX y rendimiento** (Semana 7-8)
   - Loading states y error handling global
   - Optimización de bundle y lazy loading
   - Mejoras de accesibilidad

### Boundaries

**Este rol NO debe:**
- Tomar decisiones de producto sin consultar al CEO
- Cambiar la arquitectura existente sin discutirlo primero
- Implementar features nuevas sin priorización
- Desplegar a producción sin revisión
- Modificar el sistema de testing existente sin justificación

### Tools & Permissions

**Acceso necesario:**
- Repositorio completo de GitHub
- Acceso a consola de Vercel/Railway (o plataforma de despliegue)
- Acceso a dashboard de monitoreo (Sentry o similar)
- Acceso a documentación de diseño y especificaciones

**Herramientas del proyecto:**
- React 19 + Vite + TypeScript
- Vitest + Testing Library
- ESLint + Prettier
- react-router-dom para navegación

### Communication

**Estilo de comunicación:**
- Proactivo en actualizaciones de progreso
- Transparente sobre bloqueos y dependencias
- Documenta decisiones técnicas en ADRs (Architecture Decision Records)
- Usa el canal de comunicación principal para updates diarios

**Frecuencia:**
- Daily standup async (status update)
- Weekly sync con CEO para priorización
- Revisión de PR antes de merge

### Collaboration & Escalation

**Trabaja directamente con:**
- CEO (priorización de producto, decisiones de negocio)
- Futuros miembros del equipo (diseñador, QA)

**Escalación:**
- Bloqueos técnicos → CEO para decidir prioridad
- Decisiones de arquitectura → CEO para alineación con visión
- Bugs críticos en producción → CEO + acción inmediata

---

## 2. Perfíl del Candidato Ideal

### Experiencia Técnica
- **Stack actual:** React, TypeScript, Node.js
- **Deseable:** Experiencia con fintech o apps financieras
- **Deseable:** Conocimiento de Plaid, Stripe, o APIs financieras
- **Plus:** Experiencia trabajando con fundadores / en etapas tempranas

### Soft Skills
- Autónomo pero colaborativo
- Capacidad de priorizar sin supervisión constante
- Comunicación clara y concisa
- Mentalidad de producto (entiende el "por qué" detrás del código)

### Cultura
- Orientado a resultados, no a horas
- Proactivo en identificar problemas y soluciones
- Cómodo con ambigüedad y cambios de dirección
- Passión por fintech o inclusión financiera

---

## 3. Proceso de Contratación

### Fase 1: Revisión de Portfolio (3 días)
- Revisar GitHub y proyectos previos
- Evaluar calidad de código y documentación
- Buscar experiencia relevante (React, TypeScript, fintech)

### Fase 2: Técnica Asincrónica (5 días)
- Ejercicio práctico: añadir persistencia localStorage a un módulo existente
- Evaluar: calidad de código, testing, documentación, enfoque

### Fase 3: Entrevista Técnica (1 hora)
- Revisar el ejercicio enviado
- Discutir arquitectura y decisiones tomadas
- Preguntas de system design básico

### Fase 4: Entrevista Cultural (45 min)
- Alineación con la visión del producto
- Estilo de trabajo y comunicación
- Expectativas de rol y crecimiento

### Fase 5: Oferta y Contratación
- Oferta competitiva (ver estructura abajo)
- Período de prueba de 3 meses
- Start date: lo antes posible

---

## 4. Estructura de Compensación

### Opción A: Freelance/Contractor (Inicial)
- **Rango:** 50-80€/hora (dependiendo de experiencia)
- **Horas estimadas:** 20-30 horas/semana durante 3 meses
- **Presupuesto mensual:** 4.000-9.600€
- **Ventaja:** Flexibilidad, bajo compromiso inicial

### Opción B: Empleado a Tiempo Parcial
- **Salario:** 35.000-50.000€ brutos/año (prorrateado)
- **Horas:** 20-30 horas/semana
- **Beneficios:** Flexibilidad horaria, trabajo remoto

### Opción C: Founding Engineer con Equity (Recomendado)
- **Salario base:** 40.000-55.000€ brutos/año
- **Equity:** 1-3% de la empresa (vesting a 4 años, 1 año cliff)
- **Horas:** Full-time preferido, mínimo 30h/semana
- **Ventaja:** Alineación a largo plazo, compromiso real

---

## 5. Plan de Onboarding (Semana 1)

### Día 1-2: Setup y Contexto
- Acceso a repositorio y herramientas
- Revisión de documentación existente
- Ejecutar la app localmente y explorar todos los módulos
- Revisión de ADRs y decisiones técnicas

### Día 3-4: Primeras Tareas
-修復 cualquier bug menor encontrado
- Añadir un test de integración nuevo
- Familiarización con el flujo de PRs

### Día 5: Primera Reunión con CEO
- Revisión de prioridades para las próximas 2 semanas
- Asignación de primer feature completo
- Establecimiento de ritmo de trabajo

---

## 6. Métricas de Éxito (Primeros 90 Días)

### Mes 1
- [ ] Persisitencia implementada (datos sobreviven al refresh)
- [ ] Al menos 5 PRs merged con calidad aceptable
- [ ] 100% de tests existentes pasando
- [ ] Documentación técnica actualizada

### Mes 2
- [ ] Backend básico funcionando (API CRUD)
- [ ] Autenticación de usuarios implementada
- [ ] Despliegue automático configurado
- [ ] 2+ features nuevas implementadas

### Mes 3
- [ ] App desplegada y accesible públicamente
- [ ] 20+ tests nuevos añadidos
- [ ] Monitoreo de errores activo
- [ ] Preparado para primeros beta testers

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Dificultad para encontrar candidato adecuado | Media | Alto | Usar redes técnicas (GitHub, Twitter, comunidades React españolas) |
| El ingeniero no encaja culturalmente | Baja | Alto | Proceso de entrevista riguroso, período de prueba |
| Sobrecarga de trabajo inicial | Media | Medio | Priorizar MVP, no intentar hacer todo a la vez |
| Dependencia de una sola persona | Alta | Alto | Documentación exhaustiva, código bien testeado |
| Cambios de prioridad frecuentes | Media | Medio | Reuniones semanales de alineación, ADRs para decisiones |

---

**Última actualización:** 2026-08-22
**Próxima revisión:** Al completar la contratación del primer ingeniero
