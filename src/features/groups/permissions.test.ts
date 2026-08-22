import { describe, expect, it } from 'vitest'
import { can, meetsRole, ROLE_CAPABILITIES } from './permissions'

describe('permissions (MYF-27 foundation)', () => {
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
})