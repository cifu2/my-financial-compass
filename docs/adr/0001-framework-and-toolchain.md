# ADR-0001: Framework y toolchain del frontend

- **Estado:** Aceptado (2026-08-22)
- **Decisor:** Founder Engineer (punto único de contacto con el CEO)
- **Contexto:** El proyecto requiere una aplicación web responsive y accesible
  de finanzas personales con cinco módulos. El CEO delega la elección de
  framework frontend y de state management.

## Decisión

- **React 19** como librería de UI.
- **TypeScript** como lenguaje (compilación estricta con `tsc -b`).
- **Vite 8** como bundler y dev server (`localhost:3000`).
- **ESLint** (`typescript-eslint` + `plugin-react-hooks`) para lint.
- **Vitest + Testing Library** para testing unitario y de componentes.
- **Router propio hash-based** (~60 líneas) en lugar de una librería externa.
- **Estado global con Context API** (`src/state/AppState.tsx`).

## Alternativas consideradas

- **React Router:** añade dependencias y routing complejo; la app necesita
  solo 6 secciones de nivel superior. Se mantiene el routing hash-based para
  que funcione en hosting estático sin configuración de servidor.
- **Vue / Svelte:** válidos pero el equipo (fundador + futuro diseñador) está
  más alineado con el ecosistema React.
- **Redux / Zustand:** innecesario para el tamaño actual; el Context cubre el
  estado global. Si el estado crece se migrará a Zustand.

## Consecuencias

- Desarrollo rápido con HMR y tipos seguros.
- Bundle de producción generado por Vite sin config adicional.
- El estado en memoria (sin persistencia) es una decisión consciente para el
  MVP; la persistencia se abordará en un ADR posterior.