import { describe, expect, it, beforeEach } from 'vitest'
import {
  GROUP_SNAPSHOT_VERSION,
  clearGroupSnapshot,
  GROUP_STORAGE_KEY,
  loadGroupSnapshot,
  parseGroupSnapshot,
  persistGroupSnapshot,
  emptyGroupSnapshot,
} from './groupStore'
import { seedGroupSnapshot } from '../data/seeds'

describe('groupStore', () => {
  beforeEach(() => clearGroupSnapshot())

  it('round-trips a snapshot through JSON <-> parsed object', () => {
    const snapshot = seedGroupSnapshot()
    const raw = JSON.stringify(snapshot)
    const parsed = parseGroupSnapshot(raw)
    expect(parsed).toEqual({
      version: 1,
      groups: expect.any(Array),
      members: expect.any(Array),
      invitations: expect.any(Array),
      activities: expect.any(Array),
    })
    expect(parsed?.groups).toHaveLength(2)
    expect(parsed?.members).toHaveLength(4)
    expect(parsed?.invitations).toHaveLength(1)
    expect(parsed?.activities).toHaveLength(0)
  })

  it('persists and reloads the same snapshot', () => {
    const snapshot = seedGroupSnapshot()
    persistGroupSnapshot(snapshot)
    const loaded = loadGroupSnapshot()
    expect(loaded).toEqual(snapshot)
  })

  it('round-trips optional per-group settings (HU-0.10)', () => {
    const snapshot = seedGroupSnapshot()
    snapshot.groups[0].settings = { membersCanManageBudgets: false, membersCanManageInvestments: true }
    const parsed = parseGroupSnapshot(JSON.stringify(snapshot))
    expect(parsed?.groups[0].settings).toEqual({
      membersCanManageBudgets: false,
      membersCanManageInvestments: true,
    })
  })

  it('drops non-boolean settings fields and ignores invalid settings blobs', () => {
    const withGarbage = parseGroupSnapshot(
      JSON.stringify({
        version: 1,
        groups: [
          {
            id: 'g1',
            name: 'A',
            description: '',
            icon: 'home',
            color: '#155e75',
            currency: 'EUR',
            createdBy: 'u1',
            createdAt: '2026-08-20',
            settings: { membersCanManageBudgets: 'no', x: 1 },
          },
        ],
        members: [],
        invitations: [],
      }),
    )
    expect(withGarbage?.groups[0].settings).toBeUndefined()

    const nonObject = parseGroupSnapshot(
      JSON.stringify({
        version: 1,
        groups: [
          {
            id: 'g1',
            name: 'A',
            description: '',
            icon: 'home',
            color: '#155e75',
            currency: 'EUR',
            createdBy: 'u1',
            createdAt: '2026-08-20',
            settings: 'nope',
          },
        ],
        members: [],
        invitations: [],
      }),
    )
    expect(nonObject?.groups[0].settings).toBeUndefined()
  })

  it('returns empty snapshot for an empty store', () => {
    expect(loadGroupSnapshot()).toEqual(emptyGroupSnapshot())
  })

  it('returns null for garbage JSON', () => {
    expect(parseGroupSnapshot('{not json')).toBeNull()
  })

  it('returns null for an unknown schema version', () => {
    const blob = { version: 999, groups: [], members: [], invitations: [] }
    expect(parseGroupSnapshot(JSON.stringify(blob))).toBeNull()
  })

  it('drops corrupt rows instead of failing the whole snapshot', () => {
    const blob = {
      version: GROUP_SNAPSHOT_VERSION,
      groups: [
        { id: 'g1', nonsense: true },
        {
          id: 'grp-ok',
          name: 'Bien',
          description: '',
          icon: 'home',
          color: '#155e75',
          currency: 'EUR',
          createdBy: 'u1',
          createdAt: '2026-08-20',
        },
      ],
      members: [{ groupId: 'grp-ok', userId: 'u1', role: 'admin', joinedAt: '2026-08-20' }],
      invitations: [
        {
          id: 'inv',
          groupId: 'grp-ok',
          email: 'a@b.com',
          role: 'member',
          status: 'pending',
          token: 't',
          expiresAt: '2026-09-01',
          createdAt: '2026-08-20',
        },
      ],
    }
    const parsed = parseGroupSnapshot(JSON.stringify(blob))
    expect(parsed?.groups.map((g) => g.id)).toEqual(['grp-ok'])
  })

  it('returns empty snapshot for missing arrays (activities default to [])', () => {
    const blob = { version: GROUP_SNAPSHOT_VERSION }
    const parsed = parseGroupSnapshot(JSON.stringify(blob))
    expect(parsed).toEqual({
      version: 1,
      groups: [],
      members: [],
      invitations: [],
      activities: [],
    })
  })

  it('clears the store on demand', () => {
    persistGroupSnapshot(seedGroupSnapshot())
    clearGroupSnapshot()
    expect(localStorage.getItem(GROUP_STORAGE_KEY)).toBeNull()
  })
})