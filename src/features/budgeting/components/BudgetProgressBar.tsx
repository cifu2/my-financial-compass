import type { BudgetLevel } from '../types/index'

export interface BudgetProgressBarProps {
  percentage: number
  level: BudgetLevel
  label?: string
}

const LEVEL_LABEL: Record<BudgetLevel, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  danger: 'Danger',
  over: 'Over budget',
}

/**
 * Thin accessibility-friendly progress bar colored by spend thresholds:
 * green (0-70%), yellow (71-90%), red (91-100%), dark red (>100%).
 * The fill caps the visual width at the limit while still reading the real
 * percentage to assistive tech.
 */
export function BudgetProgressBar({ percentage, level, label }: BudgetProgressBarProps) {
  const width = Math.max(0, Math.min(100, percentage))
  const levelText = label ?? LEVEL_LABEL[level]

  return (
    <div
      className={`budget-overline budget-level--${level}`}
      data-testid="budget-progress"
    >
      <div className="budget-progress__track">
        <div
          className="budget-progress__fill"
          style={{ width: `${width}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
          aria-valuetext={`${levelText}: ${percentage}% of limit`}
        />
      </div>
    </div>
  )
}