import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from './useUndo'

const strings = {
  title: 'Confirm deletion?',
  message: 'Are you sure? This cannot be undone.',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
}

function ConfirmHarness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      <ConfirmDialog
        open={open}
        strings={strings}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

describe('ConfirmDialog (MYF-8)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders the destructive prompt with confirm and cancel actions', () => {
    render(
      <ConfirmDialog open strings={strings} onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(
      screen.getByRole('alertdialog', { name: 'Confirm deletion?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it('is not rendered when closed', () => {
    render(
      <ConfirmDialog open={false} strings={strings} onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('focuses the delete button on open', () => {
    render(<ConfirmHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
  })

  it('closes via Escape', () => {
    render(<ConfirmHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    fireEvent.keyDown(document, {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('UndoToast (MYF-8)', () => {
  it('renders the deleted label with an undo button', () => {
    render(
      <UndoToast
        entry={{ id: 't1', item: { id: 't1' }, label: 'Groceries', expiresAt: 0 }}
        index={0}
        title="Deleted"
        actionLabel="Undo"
        dismissLabel="Close"
        onUndo={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByText(/Groceries/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('calls undo for the matching snapshot index', () => {
    const onUndo = vi.fn()
    render(
      <UndoToast
        entry={{ id: 't1', item: { id: 't1' }, label: 'Groceries', expiresAt: 0 }}
        index={3}
        title="Deleted"
        actionLabel="Undo"
        dismissLabel="Close"
        onUndo={onUndo}
        onDismiss={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledWith(3)
  })
})

describe('useUndo (MYF-8)', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps a deleted item available and clears it on restore', () => {
    function Harness() {
      const undo = useUndo<{ id: string }>(8000)
      return (
        <div>
          <span data-testid="count">{undo.snapshots.length}</span>
          <button
            onClick={() => undo.push({ id: 'a' }, 'A')}
          >
            add
          </button>
          <button onClick={() => undo.pop()}>pop</button>
        </div>
      )
    }
    render(<Harness />)
    expect(screen.getByTestId('count').textContent).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    expect(screen.getByTestId('count').textContent).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: 'pop' }))
    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})