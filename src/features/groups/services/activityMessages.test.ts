import { describe, expect, it } from 'vitest'
import { activitySentence, activityKindLabel } from './activityMessages'
import type { GroupActivity } from '../types'

/**
 * Human sentences of the activity trail (HU-0.11 acceptance examples:
 * "Luis añadió Supermercado 82 €", "Ana liquidó 45 €").
 */
function entry(
  action: GroupActivity['action'],
  details: GroupActivity['details'],
  userId = 'usr-ana',
): GroupActivity {
  return {
    id: 'act-1',
    groupId: 'grp-hogar',
    userId,
    action,
    details,
    timestamp: '2026-08-20T10:00:00.000Z',
  }
}

const names = new Map([
  ['usr-ana', 'Ana'],
  ['usr-luis', 'Luis'],
])

describe('activityMessages (HU-0.11)', () => {
  it('renders "Luis añadió Supermercado 82 €"', () => {
    const sentence = activitySentence(
      entry('transaction_added', { concept: 'Supermercado', amount: 82 }, 'usr-luis'),
      { names, currency: 'EUR' },
      'es',
    )
    expect(sentence).toBe('Luis añadió Supermercado 82,00 €')
  })

  it('renders "Ana liquidó 45 € a José" with the recipient name', () => {
    const sentence = activitySentence(
      entry('settlement_added', { amount: 45, recipientId: 'usr-luis' }),
      { names, currency: 'EUR' },
      'es',
    )
    expect(sentence).toBe('Ana liquidó 45,00 € a Luis')
  })

  it('renders member/role and archive events', () => {
    expect(
      activitySentence(
        entry('member_added', { targetUserId: 'usr-luis' }),
        { names, currency: 'EUR' },
        'es',
      ),
    ).toBe('Ana añadió a Luis')
    expect(
      activitySentence(
        entry('role_changed', { targetUserId: 'usr-luis', role: 'admin' }),
        { names, currency: 'EUR' },
        'es',
      ),
    ).toBe('Ana cambió el rol de Luis a admin')
    expect(
      activitySentence(entry('group_archived', {}), { names, currency: 'EUR' }, 'es'),
    ).toBe('Ana archivó el grupo')
  })

  it('offers an i18n label for each action kind', () => {
    expect(activityKindLabel('settlement_added', 'es')).toBe('Liquidación registrada')
    expect(activityKindLabel('transaction_added', 'en')).toBe('Transaction added')
  })
})