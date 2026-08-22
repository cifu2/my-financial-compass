import { describe, expect, it } from 'vitest'
import {
  groupAccessForSnapshot,
  groupSettingsFor,
  roleInGroup,
} from './access'
import { seedGroupSnapshot } from './data/seeds'

const snapshot = seedGroupSnapshot()

describe('groupAccessForSnapshot (HU-0.10)', () => {
  it('returns a fully-granted model for an admin', () => {
    const access = groupAccessForSnapshot(snapshot, 'grp-hogar', 'usr-ana')
    expect(access.role).toBe('admin')
    expect(access.isMember).toBe(true)
    expect(access.isAdmin).toBe(true)
    expect(access.canView).toBe(true)
    expect(access.canEdit).toBe(true)
    expect(access.canManageBudgets).toBe(true)
    expect(access.canManageInvestments).toBe(true)
    expect(access.canManageMembers).toBe(true)
    expect(access.canDeleteGroup).toBe(true)
    expect(access.canEditRecord('usr-jose')).toBe(true)
    expect(access.canDeleteRecord('usr-jose')).toBe(true)
  })

  it('lets members edit their own records only', () => {
    const access = groupAccessForSnapshot(snapshot, 'grp-hogar', 'usr-jose')
    expect(access.role).toBe('member')
    expect(access.canEditRecord('usr-jose')).toBe(true)
    expect(access.canEditRecord('usr-ana')).toBe(false)
    expect(access.canManageMembers).toBe(false)
    expect(access.canDeleteGroup).toBe(false)
    expect(access.canManageBudgets).toBe(true)
  })

  it('grants a restricted model when member management is revoked per group', () => {
    const modified = { ...snapshot, groups: snapshot.groups.map((g) => (g.id === 'grp-hogar' ? { ...g, settings: { membersCanManageBudgets: false } } : g)) }
    const access = groupAccessForSnapshot(modified, 'grp-hogar', 'usr-jose')
    expect(access.canManageBudgets).toBe(false)
    expect(access.canManageInvestments).toBe(true)
    // Admin unaffected by member-level revocations.
    const admin = groupAccessForSnapshot(modified, 'grp-hogar', 'usr-ana')
    expect(admin.canManageBudgets).toBe(true)
  })

  it('denies everything to a non-member', () => {
    const access = groupAccessForSnapshot(snapshot, 'grp-hogar', 'usr-lucia')
    expect(access.role).toBeNull()
    expect(access.isMember).toBe(false)
    expect(access.canView).toBe(false)
    expect(access.canEdit).toBe(false)
    expect(access.canManageMembers).toBe(false)
    expect(access.canEditRecord('usr-lucia')).toBe(false)
  })

  it('roleInGroup and groupSettingsFor are defensive', () => {
    expect(roleInGroup(snapshot, 'grp-hogar', 'usr-ana')).toBe('admin')
    expect(roleInGroup(snapshot, 'grp-hogar', 'usr-lucia')).toBeNull()
    expect(roleInGroup(snapshot, 'grp-hogar', undefined)).toBeNull()
    expect(groupSettingsFor(snapshot, 'grp-hogar')).toEqual({})
    expect(groupSettingsFor(snapshot, 'no-such-group')).toEqual({})
  })
})