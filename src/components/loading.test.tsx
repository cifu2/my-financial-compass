import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { LoadingSpinner } from './LoadingSpinner'
import { Skeleton, SkeletonText, SkeletonTable } from './Skeleton'
import { DashboardSkeleton } from './DashboardSkeleton'
import { seedAuthSession } from '../test/authSeed'
import App from '../App'

describe('LoadingSpinner', () => {
  it('announces the pending operation via a status live region', () => {
    render(<LoadingSpinner label="Cargando finanzas…" />)
    const region = screen.getByRole('status')
    expect(region).toHaveTextContent('Cargando finanzas…')
    expect(region).toHaveAttribute('class', expect.stringContaining('loading-spinner'))
  })

  it('hides the decorative ring from assistive technology', () => {
    const { container } = render(<LoadingSpinner label="Cargando…" />)
    const ring = container.querySelector('.loading-spinner__ring')
    expect(ring).toHaveAttribute('aria-hidden', 'true')
  })

  it('maps size variants to modifier classes', () => {
    const { container } = render(<LoadingSpinner size="sm" label="Cargando…" />)
    const icon = container.querySelector('.loading-spinner')
    expect(icon).toHaveClass('loading-spinner--sm')
  })
})

describe('Skeleton primitives', () => {
  it('renders a decorative blocked-off shape', () => {
    const { container } = render(<Skeleton className="my-skel" width={40} height={8} />)
    const el = container.querySelector('.my-skel')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveClass('skeleton', 'skeleton--text')
    expect(el).toHaveStyle({ width: '40px', height: '8px' })
  })

  it('renders the requested line count with a shorter last line', () => {
    const { container } = render(<SkeletonText lines={3} />)
    expect(container.querySelectorAll('.skeleton-text__line')).toHaveLength(3)
    const lines = container.querySelectorAll('.skeleton-text__line')
    expect(lines[2]).toHaveStyle({ width: '60%' })
    expect(lines[0]).toHaveStyle({ width: '100%' })
  })

  it('renders a table grid with a header row plus body rows', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />)
    expect(container.querySelectorAll('.skeleton-table__row')).toHaveLength(4)
    expect(
      container.querySelector('.skeleton-table__row--head'),
    ).toBeInTheDocument()
  })
})

describe('DashboardSkeleton', () => {
  it('is a live region that announces the pending dashboard load', () => {
    render(<DashboardSkeleton label="Cargando el panel de control…" />)
    const region = screen.getByRole('status', {
      name: 'Cargando el panel de control…',
    })
    expect(region).toBeInTheDocument()
  })

  it('mirrors the dashboard layout with several placeholder shapes', () => {
    const { container } = render(<DashboardSkeleton />)
    const shapes = container.querySelectorAll('.skeleton')
    // Toolbar + KPIs + panels (4 headings, breakdown/recent/net-worth/budget
    // tables and bars) + history add up to well over a dozen placeholders.
    expect(shapes.length).toBeGreaterThan(15)
  })
})

describe('App boot skeleton (MYF-17)', () => {
  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('shows a skeleton while the store hydrates, then the dashboard', () => {
    vi.useFakeTimers()
    seedAuthSession()
    window.location.hash = '#/'
    render(<App />)

    const skeleton = screen.getByRole('status', {
      name: 'Cargando el panel de control…',
    })
    expect(skeleton).toBeInTheDocument()

    // Once hydration resolves the skeleton disappears and the dashboard
    // renders its content.
    act(() => vi.advanceTimersByTime(1000))
    expect(
      screen.queryByRole('status', { name: 'Cargando el panel de control…' }),
    ).toBeNull()
    expect(screen.getByText('My Financial Compass')).toBeInTheDocument()
    expect(screen.getAllByText(/Aún no hay datos/).length).toBeGreaterThan(0)
  })
})