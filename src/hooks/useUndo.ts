import { useCallback, useEffect, useRef, useState } from 'react'

export interface UndoSnapshot<T> {
  id: string
  item: T
  label: string
  expiresAt: number
}

export interface UndoEntry<T> {
  id: string
  item: T
  label: string
  expiresAt: number
}

export interface UseUndo<T> {
  snapshots: UndoSnapshot<T>[]
  push: (item: T, label: string) => void
  pop: () => T | null
  clear: (id: string) => void
}

/**
 * Time-limited undo stack. Entries stay restorable for `durationMs`,
 * clamped to the 5–10 second window required for deletion undo.
 */
export function useUndo<T extends { id: string }>(
  durationMs = 8000,
  maxEntries = 5,
): UseUndo<T> {
  const [snapshots, setSnapshots] = useState<UndoSnapshot<T>[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const drop = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setSnapshots((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const duration = Math.min(Math.max(durationMs, 5000), 10000)

  const push = useCallback(
    (item: T, label: string) => {
      drop(item.id)
      setSnapshots((prev) => [
        ...prev.slice(-(maxEntries - 1)),
        { id: item.id, item, label, expiresAt: Date.now() + duration },
      ])
      const timer = setTimeout(() => drop(item.id), duration)
      timers.current.set(item.id, timer)
    },
    [duration, maxEntries, drop],
  )

  const pop = useCallback((): T | null => {
    const last = snapshots[snapshots.length - 1]
    if (!last) return null
    drop(last.id)
    return last.item
  }, [snapshots, drop])

  useEffect(() => {
    const active = timers.current
    return () => {
      active.forEach((t) => clearTimeout(t))
      active.clear()
    }
  }, [])

  return { snapshots, push, pop, clear: drop }
}
