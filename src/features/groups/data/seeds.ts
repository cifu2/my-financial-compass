import type { GroupSnapshot } from '../types'

/**
 * Seed data for the groups module (demo + tests).
 *
 * Reuses fictional identities the auth module would register; the groups
 * store itself only stores `userId` references (see ADR-0008). Identity
 * constants are shared with tests via `seedGroupSnapshot()`.
 */

export const SEED_USERS = {
  ana: { id: 'usr-ana', name: 'Ana', email: 'ana@example.com' },
  jose: { id: 'usr-jose', name: 'José', email: 'jose@example.com' },
  lucia: { id: 'usr-lucia', name: 'Lucía', email: 'lucia@example.com' },
} as const

export function seedGroupSnapshot(): GroupSnapshot {
  return {
    version: 1,
    groups: seedGroups(),
    members: seedMembers(),
    invitations: seedInvitations(),
    activities: [],
  }
}

function seedGroups(): GroupSnapshot['groups'] {
  const now = '2026-08-20T09:00:00.000Z'
  return [
    {
      id: 'grp-hogar',
      name: 'Hogar',
      description: 'Gastos comunes de la casa',
      icon: 'home',
      color: '#155e75',
      currency: 'EUR',
      createdBy: SEED_USERS.ana.id,
      createdAt: now,
    },
    {
      id: 'grp-viaje',
      name: 'Viaje a Japón',
      description: 'Ahorro del grupo para el viaje',
      icon: 'piggy',
      color: '#9a3412',
      currency: 'EUR',
      createdBy: SEED_USERS.jose.id,
      createdAt: now,
    },
  ]
}

function seedMembers(): GroupSnapshot['members'] {
  const joined = '2026-07-21T10:00:00.000Z'
  return [
    { groupId: 'grp-hogar', userId: SEED_USERS.ana.id, role: 'admin', joinedAt: joined },
    { groupId: 'grp-hogar', userId: SEED_USERS.jose.id, role: 'member', joinedAt: joined },
    { groupId: 'grp-viaje', userId: SEED_USERS.jose.id, role: 'admin', joinedAt: joined },
    { groupId: 'grp-viaje', userId: SEED_USERS.lucia.id, role: 'member', joinedAt: joined },
  ]
}

function seedInvitations(): GroupSnapshot['invitations'] {
  const created = '2026-08-01T08:00:00.000Z'
  return [
    {
      id: 'inv-1',
      groupId: 'grp-hogar',
      email: SEED_USERS.lucia.email,
      role: 'member',
      status: 'pending',
      token: 'seed-token-hogar-lucia',
      expiresAt: '2026-09-01T08:00:00.000Z',
      createdAt: created,
    },
  ]
}