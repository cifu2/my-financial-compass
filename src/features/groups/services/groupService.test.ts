import { describe, expect, it, beforeEach } from 'vitest'
import {
  acceptInvitation,
  addMember,
  changeMemberRole,
  createGroup,
  createInvitation,
  deleteGroup,
  getGroup,
  groupErrorMessage,
  isEmailLike,
  listInvitations,
  listMembers,
  listUserGroups,
  promoteToAdmin,
  removeMember,
  revokeInvitation,
  updateGroup,
} from './groupService'
import type { GroupSnapshot } from '../types'
import { clearGroupSnapshot, GROUP_STORAGE_KEY } from './groupStore'
import { seedGroupSnapshot, SEED_USERS } from '../data/seeds'

/** Baseline fixture mirroring the seed so reads start from a known state. */
function seed(): GroupSnapshot {
  const snapshot = seedGroupSnapshot()
  localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(snapshot))
  return snapshot
}

describe('createGroup', () => {
  beforeEach(() => clearGroupSnapshot())

  it('creates the group with the author as its first admin', async () => {
    const result = await createGroup('usr-ana', { name: 'Casa' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.name).toBe('Casa')
    expect(result.data.createdBy).toBe('usr-ana')
    expect(result.data.currency).toBe('EUR')
    const groups = await listUserGroups('usr-ana')
    expect(groups).toHaveLength(1)
    expect(groups[0].role).toBe('admin')
    expect(groups[0].memberCount).toBe(1)
  })

  it('rejects an empty or whitespace name', async () => {
    const result = await createGroup('usr-ana', { name: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('name-required')
  })

  it('rejects duplicate names owned by the same user', async () => {
    await createGroup('usr-ana', { name: 'Hogar' })
    const second = await createGroup('usr-ana', { name: 'hogar ' })
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('group-name-taken')
  })

  it('allows the same name across different owners', async () => {
    await createGroup('usr-ana', { name: 'Viaje' })
    const other = await createGroup('usr-jose', { name: 'Viaje' })
    expect(other.ok).toBe(true)
  })

  it('rejects unknown currencies and out-of-palette icons/colors', async () => {
    const badCurrency = await createGroup('usr-ana', { name: 'X', currency: 'XXX' })
    expect(badCurrency.ok).toBe(false)
    if (!badCurrency.ok) expect(badCurrency.error.code).toBe('invalid-currency')
    const badIcon = await createGroup('usr-ana', { name: 'Y', icon: 'rocket' })
    expect(badIcon.ok).toBe(false)
    if (!badIcon.ok) expect(badIcon.error.code).toBe('invalid-icon')
    const badColor = await createGroup('usr-ana', { name: 'Z', color: '#ff0000' })
    expect(badColor.ok).toBe(false)
    if (!badColor.ok) expect(badColor.error.code).toBe('invalid-color')
  })
})

describe('group CRUD', () => {
  beforeEach(() => seed())

  it('reads a group by id and lists only groups the user belongs to', async () => {
    const g = await getGroup('grp-hogar')
    expect(g.ok).toBe(true)
    if (g.ok) expect(g.data.name).toBe('Hogar')

    const ana = await listUserGroups(SEED_USERS.ana.id)
    expect(ana.map((x) => x.id)).toEqual(['grp-hogar'])
    const lucia = await listUserGroups(SEED_USERS.lucia.id)
    // lucia is a member of grp-viaje only; the pending hogar invite (seed)
    // does not grant membership until accepted.
    expect(lucia.map((x) => x.id)).toEqual(['grp-viaje'])
  })

  it('updates editable fields when the caller is admin', async () => {
    const edited = await updateGroup('grp-hogar', SEED_USERS.ana.id, {
      name: 'Hogar Dulce Hogar',
      currency: 'USD',
      description: 'Nueva descripción',
    })
    expect(edited.ok).toBe(true)
    if (edited.ok) {
      expect(edited.data.name).toBe('Hogar Dulce Hogar')
      expect(edited.data.currency).toBe('USD')
    }
  })

  it('rejects updates from non-admins', async () => {
    const edited = await updateGroup('grp-hogar', SEED_USERS.jose.id, {
      name: 'Hackeado',
    })
    expect(edited.ok).toBe(false)
    if (!edited.ok) expect(edited.error.code).toBe('not-admin')
  })

  it('deletes an empty group (single member) and cascades rows', async () => {
    await createGroup(SEED_USERS.ana.id, { name: 'Solo yo' })
    const solo = (await listUserGroups(SEED_USERS.ana.id)).find((g) => g.name === 'Solo yo')
    if (!solo) throw new Error('setup failed')
    const deleted = await deleteGroup(solo.id, SEED_USERS.ana.id)
    expect(deleted.ok).toBe(true)
    const remains = await getGroup(solo.id)
    expect(remains.ok).toBe(false)
    expect((await listUserGroups(SEED_USERS.ana.id)).find((g) => g.name === 'Solo yo')).toBeUndefined()
  })

  it('refuses to delete a group that still has other members', async () => {
    const deleted = await deleteGroup('grp-hogar', SEED_USERS.ana.id)
    expect(deleted.ok).toBe(false)
    if (!deleted.ok) expect(deleted.error.code).toBe('group-not-empty')
  })
})

describe('membership integrity', () => {
  beforeEach(() => seed())

  it('adds a member as admin and defaults new members to "member"', async () => {
    const added = await addMember('grp-hogar', SEED_USERS.ana.id, 'usr-lucia')
    expect(added.ok).toBe(true)
    if (added.ok) expect(added.data.role).toBe('member')
    const members = await listMembers('grp-hogar')
    expect(members.ok && members.data).toHaveLength(3)
  })

  it('rejects duplicate memberships', async () => {
    const duplicate = await addMember('grp-hogar', SEED_USERS.ana.id, SEED_USERS.jose.id)
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.error.code).toBe('already-member')
  })

  it('rejects member ops from non-admins', async () => {
    const byMember = await addMember('grp-hogar', SEED_USERS.jose.id, 'usr-lucia')
    expect(byMember.ok).toBe(false)
    if (!byMember.ok) expect(byMember.error.code).toBe('not-admin')
  })

  it('prevents demoting the last admin', async () => {
    const demote = await changeMemberRole('grp-hogar', SEED_USERS.ana.id, SEED_USERS.ana.id, 'member')
    expect(demote.ok).toBe(false)
    if (!demote.ok) expect(demote.error.code).toBe('last-admin')
  })

  it('prevents leaving the group as its last admin', async () => {
    const leave = await removeMember('grp-hogar', SEED_USERS.ana.id, SEED_USERS.ana.id)
    expect(leave.ok).toBe(false)
    if (!leave.ok) expect(leave.error.code).toBe('last-admin')
  })

  it('allows demoting a last admin once another admin exists', async () => {
    await addMember('grp-hogar', SEED_USERS.ana.id, 'usr-lucia', 'admin')
    const demote = await changeMemberRole('grp-hogar', SEED_USERS.ana.id, SEED_USERS.ana.id, 'member')
    expect(demote.ok).toBe(true)
  })

  it('allows leaving when another admin remains', async () => {
    await promoteToAdmin('grp-viaje', SEED_USERS.jose.id, SEED_USERS.lucia.id)
    const leave = await removeMember('grp-viaje', SEED_USERS.jose.id, SEED_USERS.jose.id)
    expect(leave.ok).toBe(true)
    const members = await listMembers('grp-viaje')
    expect(!members.ok ? false : members.data.some((m) => m.userId === SEED_USERS.jose.id)).toBe(false)
  })

  it('rejects removing another member as a non-admin', async () => {
    const removal = await removeMember('grp-hogar', SEED_USERS.jose.id, SEED_USERS.ana.id)
    expect(removal.ok).toBe(false)
    if (!removal.ok) expect(removal.error.code).toBe('not-admin')
  })
})

describe('invitations', () => {
  beforeEach(() => seed())

  it('creates a pending invitation with a token and TTL', async () => {
    const invite = await createInvitation('grp-hogar', SEED_USERS.ana.id, {
      email: 'nuevo@example.com',
      role: 'member',
      ttlDays: 7,
    })
    expect(invite.ok).toBe(true)
    if (invite.ok) {
      expect(invite.data.status).toBe('pending')
      expect(invite.data.token).toBeTruthy()
      expect(invite.data.expiresAt).toBeTruthy()
    }
  })

  it('rejects duplicate pending invitations for the same (group, email)', async () => {
    await createInvitation('grp-hogar', SEED_USERS.ana.id, { email: SEED_USERS.lucia.email })
    const dup = await createInvitation('grp-hogar', SEED_USERS.ana.id, {
      email: SEED_USERS.lucia.email,
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.error.code).toBe('invitation-exists')
  })

  it('rejects invitations from a non-admin', async () => {
    const invite = await createInvitation('grp-hogar', SEED_USERS.jose.id, {
      email: 'x@example.com',
    })
    expect(invite.ok).toBe(false)
    if (!invite.ok) expect(invite.error.code).toBe('not-admin')
  })

  it('accepting a pending invitation creates a membership with the invited role', async () => {
    // seed snapshot carries a pending invite for lucia in grp-hogar
    const accepted = await acceptInvitation('seed-token-hogar-lucia', SEED_USERS.lucia.id)
    expect(accepted.ok).toBe(true)
    if (accepted.ok) {
      expect(accepted.data.role).toBe('member')
      expect(accepted.data.groupId).toBe('grp-hogar')
    }
    const members = await listMembers('grp-hogar')
    expect(members.ok && members.data.some((m) => m.userId === SEED_USERS.lucia.id)).toBe(true)
  })

  it('rejects a second accept of the same invitation', async () => {
    await acceptInvitation('seed-token-hogar-lucia', SEED_USERS.lucia.id)
    const again = await acceptInvitation('seed-token-hogar-lucia', SEED_USERS.ana.id)
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.error.code).toBe('invitation-not-pending')
  })

  it('rejects expired invitations by token', async () => {
    const invite = await createInvitation('grp-hogar', SEED_USERS.ana.id, {
      email: 'tarde@example.com',
      ttlDays: -1,
    })
    if (!invite.ok) throw new Error('setup failed')
    const accepted = await acceptInvitation(invite.data.token, 'usr-lucia')
    expect(accepted.ok).toBe(false)
    if (!accepted.ok) expect(accepted.error.code).toBe('invitation-not-pending')
  })

  it('lists invitations only for admins, newest first', async () => {
    await createInvitation('grp-hogar', SEED_USERS.ana.id, { email: 'a@example.com', ttlDays: 1 })
    await createInvitation('grp-hogar', SEED_USERS.ana.id, { email: 'b@example.com', ttlDays: 1 })
    const list = await listInvitations('grp-hogar', SEED_USERS.ana.id)
    expect(list.ok && list.data).toHaveLength(3) // seed pending + two new
  })

  it('revokes a pending invitation (admin only)', async () => {
    const invite = await createInvitation('grp-hogar', SEED_USERS.ana.id, {
      email: 'rev@example.com',
    })
    if (!invite.ok) throw new Error('setup failed')
    const revoked = await revokeInvitation('grp-hogar', SEED_USERS.ana.id, invite.data.token)
    expect(revoked.ok).toBe(true)
    const again = await acceptInvitation(invite.data.token, 'usr-lucia')
    expect(again.ok).toBe(false)
  })

  it('rejects an invitation with an invalid email', async () => {
    const invite = await createInvitation('grp-hogar', SEED_USERS.ana.id, {
      email: 'not-an-email',
    })
    expect(invite.ok).toBe(false)
    if (!invite.ok) expect(invite.error.code).toBe('email-invalid')
  })
})

describe('groupErrorMessage', () => {
  it('returns a Spanish message for each documented code', () => {
    expect(groupErrorMessage('last-admin')).toContain('administrador')
    expect(groupErrorMessage('name-required')).toContain('nombre')
  })
})

describe('isEmailLike', () => {
  it('accepts common email shapes and rejects junk', () => {
    expect(isEmailLike('a@b.com')).toBe(true)
    expect(isEmailLike(' nombre@ejemplo.es ')).toBe(true)
    expect(isEmailLike('nope')).toBe(false)
    expect(isEmailLike('a@b')).toBe(false)
  })
})