import { describe, expect, it, beforeEach } from 'vitest'
import {
  activityMembers,
  groupActivityContext,
  listGroupActivity,
  recordGroupActivity,
  type ActivityEntry,
} from './groupActivity'
import { clearGroupSnapshot, loadGroupSnapshot, persistGroupSnapshot } from './groupStore'
import { seedGroupSnapshot, SEED_USERS } from '../data/seeds'
import { AUTH_STORAGE_KEY } from '../../auth/services/authStore'

/**
 * Group activity trail (HU-0.11): recording is append-only per group, listing
 * is strictly chronological descending and filterable by member and action.
 */
function seedAuth() {
  const snapshot = {
    version: 2,
    users: [
      {
        id: SEED_USERS.ana.id,
        email: SEED_USERS.ana.email,
        name: SEED_USERS.ana.name,
        avatar: '#155e75',
        currency: 'EUR',
        createdAt: '2026-08-01T00:00:00.000Z',
        password: { salt: '', digest: '' },
      },
      {
        id: SEED_USERS.jose.id,
        email: SEED_USERS.jose.email,
        name: SEED_USERS.jose.name,
        avatar: '#4338ca',
        currency: 'EUR',
        createdAt: '2026-08-01T00:00:00.000Z',
        password: { salt: '', digest: '' },
      },
    ],
    session: { userId: SEED_USERS.ana.id },
    resets: [],
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot))
}

function seed() {
  clearGroupSnapshot()
  persistGroupSnapshot(seedGroupSnapshot())
  seedAuth()
}

/** Records an entry at a fixed, increasing instant so ordering is deterministic. */
function recordAt(instantMinute: number, entry: ActivityEntry): void {
  recordGroupActivity(entry)
  const snapshot = loadGroupSnapshot()
  const row = snapshot.activities[snapshot.activities.length - 1]
  row.timestamp = new Date(Date.UTC(2026, 7, 20, 10, instantMinute)).toISOString()
  persistGroupSnapshot(snapshot)
}

describe('groupActivity (HU-0.11)', () => {
  beforeEach(seed)

  it('records, sorts and lists the activity newest-first', () => {
    recordAt(1, {
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'transaction_added',
      details: { concept: 'Compra 1', amount: 11 },
    })
    recordAt(2, {
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'transaction_added',
      details: { concept: 'Compra 2', amount: 22 },
    })
    const list = listGroupActivity('grp-hogar')
    expect(list).toHaveLength(2)
    expect(list[0].details.concept).toBe('Compra 2')
    expect(list[1].details.concept).toBe('Compra 1')
  })

  it('filters by member and by action type', () => {
    recordAt(1, {
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'settlement_added',
      details: { amount: 12.5 },
    })
    recordAt(2, {
      groupId: 'grp-hogar',
      userId: SEED_USERS.jose.id,
      action: 'transaction_added',
      details: { concept: 'Mercado', amount: 34 },
    })

    const byMember = listGroupActivity('grp-hogar', { memberId: SEED_USERS.jose.id })
    expect(byMember).toHaveLength(1)
    expect(byMember[0].action).toBe('transaction_added')

    const byAction = listGroupActivity('grp-hogar', { action: 'settlement_added' })
    expect(byAction).toHaveLength(1)
    expect(byAction[0].userId).toBe(SEED_USERS.ana.id)
  })

  it('isolates activity per group', () => {
    recordAt(1, {
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'transaction_added',
      details: { concept: 'Hogar', amount: 1 },
    })
    expect(listGroupActivity('grp-viaje')).toHaveLength(0)
  })

  it('lists distinct members present in the trail', () => {
    expect(activityMembers('grp-hogar')).toEqual([])
    recordAt(1, {
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'member_added',
      details: { targetUserId: SEED_USERS.jose.id },
    })
    expect(activityMembers('grp-hogar')).toEqual([SEED_USERS.ana.id])
  })

  it('builds a group context with resolved member names', () => {
    const ctx = groupActivityContext('grp-hogar')
    expect(ctx).not.toBeNull()
    expect(ctx!.names.get(SEED_USERS.ana.id)).toBe('Ana')
    expect(ctx!.currency).toBe('EUR')
    expect(ctx!.archived).toBe(false)
    expect(groupActivityContext('unknown')).toBeNull()
  })
})