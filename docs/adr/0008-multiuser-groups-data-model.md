# ADR: Modelo de datos multiusuario y grupos (MYF-21)

**Estado:** Aceptado
**Fecha:** 2026-08-22
**Decodificador:** Founding Engineer

## Contexto

My Financial Compass arranca como app monousuario con persistencia en
`localStorage` (ADR-0003). El siguiente salto del producto es el soporte
**multiusuario**: varios usuarios comparten un espacio (grupo) para llevar
cuentas conjuntas. Este ADR sienta las bases de *identidad y pertenencia*:
quiénes pueden ver y tocar qué dentro de un grupo, sin acoplar la decisión a
la UI ni a la capa de datos final (localStorage hoy, base de datos relacional
mañana).

Entidades requeridas, según MYF-19:

- **User**: id, email, name, avatar, mainCurrency, createdAt
- **Group**: id, name, description, icon, color, currency, createdBy, createdAt
- **GroupMember**: groupId, userId, role (`admin`/`member`/`readonly`), joinedAt
- **Invitation**: id, groupId, email, role, status
  (`pending`/`accepted`/`rejected`/`expired`), link, expiresAt

## Decisión

Persistir el modelo en su propia `localStorage` key, con snapshot versionado y
parseo defensivo (patrón idéntico al `authStore` de MYF-20 y al
`storageService` de ADR-0003):

- **Key propia**: `my-financial-compass:groups:v1` con `version: 1` dentro del
  payload. Independiente del store financiero y del de auth.
- **Entidades**: `groups`, `members` (join table) e `invitations` se
  serializan como tres arrays del mismo snapshot. `User` no se persiste aquí:
  la identidad vive en el store de auth (`UserProfile`) y los grupos solo
  referencian `userId`s, igual que haría una FK.
- **CRUD completo** en `features/groups/services/groupService.ts`, con API
  async que carga→muta→persiste el snapshot, como un REST local, de forma que
  la migración a backend solo reimplementa ese módulo.
- **Integridad (invariante de admin)**: un grupo **siempre** tiene al menos un
  `admin`. El service rechaza: demover al último admin, que el último admin
  abandone el grupo, y borrar el grupo con más de un miembro. Necesitamos
  borrar un grupo solo cuando está vacío (o transferir propiedad primero).
- **Permisos por rol**: `ROLE_CAPABILITIES` declarativo
  (`features/groups/permissions.ts`) — la semilla del sistema de permisos
  MYF-27. El service lo aplica; el UI solo lo consulta.
- **Seeds**: `features/groups/data/seeds.ts` (2 grupos, 3 usuarios, 4
  membresías, 1 invitación pendiente).

## Alternativas consideradas

- **Estructurar usuarios dentro del snapshot de grupos**: duplicaría la
  identidad con el store de auth; rechazado por mantener una única fuente.
- **IndexedDB**: mismo razonamiento que ADR-0003; volumen pequeño.
- **Tight-coupling UI→service**: la validación y las guardas de rol viven en
  el service (no en componentes), por lo que el frontend no puede violar el
  invariante accidentalmente.

## Consecuencias

- `localStorage` sobrevive a refrescos; schema `v1` versionado con bump
  invalidante.
- Pruebas: 41 unitarias nuevas (service + store + permissions) en verde.
- El contrato de datos `GroupSnapshot` es **la migración doc**: se documenta
  abajo el mapeo a SQL para cuando exista backend.

### Migración futura a base de datos relacional

El snapshot es una foto 1:1 de un esquema relacional:

```sql
CREATE TABLE users (
  id           TEXT PRIMARY KEY,        -- igual que auth.users.id
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  avatar       TEXT NOT NULL DEFAULT '',
  main_currency TEXT NOT NULL DEFAULT 'EUR',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'EUR',
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id  TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('admin','member','readonly')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE invitations (
  id        TEXT PRIMARY KEY,
  group_id  TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('admin','member','readonly')),
  status    TEXT NOT NULL CHECK (status IN ('pending','accepted','rejected','expired')),
  token     TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

El invariante "≥1 admin por grupo" se aplica en la capa de aplicación (no como
`CHECK` en SQL, que no puede expresar agregados sin triggers). Un trigger o
una transacción de update pueden reforzarlo en producción.

## Archivos

- `src/features/groups/types/index.ts` — modelo + paletas + invariantes de rol
- `src/features/groups/services/groupStore.ts` — persistencia (parseo estricto)
- `src/features/groups/services/groupService.ts` — CRUD + integridad + authz
- `src/features/groups/permissions.ts` — mapa de capacidades por rol (MYF-27)
- `src/features/groups/data/seeds.ts` — datos de prueba
- Tests: `groupService.test.ts`, `groupStore.test.ts`, `permissions.test.ts`