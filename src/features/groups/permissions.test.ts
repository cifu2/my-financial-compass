import { describe, expect, it } from 'vitest'
import {
  can,
  canDeleteData,
  canEditData,
  canManageGroupBudgets,
  canManageGroupInvestments,
  DEFAULT_GROUP_SETTINGS,
  meetsRole,
  ROLE_CAPABILITIES,
} from './permissions'

describe('permissions (HU-0.10 role matrix)', () => {
  it('grants admins every capability', () => {
    for (const capability of ROLE_CAPABILITIES.admin) {
      expect(can('admin', capability)).toBe(true)
    }
  })

  it('members can view/edit data but not manage the group', () => {
    expect(can('member', 'data.view')).toBe(true)
    expect(can('member', 'data.edit')).toBe(true)
    expect(can('member', 'group.edit')).toBe(false)
    expect(can('member', 'member.remove')).toBe(false)
    expect(can('member', 'member.invite')).toBe(false)
  })

  it('readonly users can view but never mutate', () => {
    expect(can('readonly', 'data.view')).toBe(true)
    expect(can('readonly', 'data.edit')).toBe(false)
    expect(can('readonly', 'member.view')).toBe(true)
    expect(can('readonly', 'group.delete')).toBe(false)
  })

  it('compares roles by hierarchy', () => {
    expect(meetsRole('admin', 'member')).toBe(true)
    expect(meetsRole('member', 'readonly')).toBe(true)
    expect(meetsRole('readonly', 'admin')).toBe(false)
    expect(meetsRole('member', 'admin')).toBe(false)
  })

  it('exposes budget/investment management to admins and members by default', () => {
    expect(can('admin', 'budget.manage')).toBe(true)
    expect(can('admin', 'investment.manage')).toBe(true)
    expect(can('member', 'budget.manage')).toBe(true)
    expect(can('member', 'investment.manage')).toBe(true)
    expect(can('readonly', 'budget.manage')).toBe(false)
    expect(can('readonly', 'investment.manage')).toBe(false)
  })

  it('honors per-group settings that revoke member management', () => {
    expect(can('member', 'budget.manage', { membersCanManageBudgets: false })).toBe(false)
    expect(can('member', 'investment.manage', { membersCanManageInvestments: false })).toBe(false)
    // The revoke only affects the member tier, admins keep access.
    expect(can('admin', 'budget.manage', { membersCanManageBudgets: false })).toBe(true)
    expect(can('admin', 'investment.manage', { membersCanManageInvestments: false })).toBe(true)
  })
})

describe('ownership-aware data edits (HU-0.10)', () => {
  it('admins may edit any record owner', () => {
    expect(canEditData('admin', 'usr-a', 'usr-b')).toBe(true)
    expect(canEditData('admin', 'usr-a', undefined)).toBe(true)
  })

  it('members may edit only their own records', () => {
    expect(canEditData('member', 'usr-a', 'usr-a')).toBe(true)
    expect(canEditData('member', 'usr-a', 'usr-b')).toBe(false)
    // Legacy rows without an owner behave as the actor's own.
    expect(canEditData('member', 'usr-a', undefined)).toBe(true)
  })

  it('readonly members may never edit data', () => {
    expect(canEditData('readonly', 'usr-a', 'usr-a')).toBe(false)
    expect(canEditData('readonly', 'usr-a', undefined)).toBe(false)
  })

  it('group settings do not unlock edits in read-only restrictions', () => {
    expect(canEditData('readonly', 'usr-a', 'usr-a', { membersCanManageBudgets: true })).toBe(false)
  })

  it('deletion follows the same ownership rules', () => {
    expect(canDeleteData('admin', 'usr-a', 'usr-b')).toBe(true)
    expect(canDeleteData('member', 'usr-a', 'usr-a')).toBe(true)
    expect(canDeleteData('member', 'usr-a', 'usr-b')).toBe(false)
    expect(canDeleteData('readonly', 'usr-a', 'usr-a')).toBe(false)
  })
})

describe('shortcuts', () => {
  it('resolves budget/investment management from settings', () => {
    expect(canManageGroupBudgets('member')).toBe(true)
    expect(canManageGroupBudgets('member', { membersCanManageBudgets: false })).toBe(false)
    expect(canManageGroupBudgets('readonly')).toBe(false)
    expect(canManageGroupInvestments('admin')).toBe(true)
  })

  it('exposes sane defaults for absent settings', () => {
    expect(DEFAULT_GROUP_SETTINGS.membersCanManageBudgets).toBe(true)
    expect(DEFAULT_GROUP_SETTINGS.membersCanManageInvestments).toBe(true)
  })
})