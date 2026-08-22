function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

interface AvatarProps {
  name: string
  color: string
  /** Sizes: sm (header), md (profile), lg (profile preview). */
  size?: 'sm' | 'md' | 'lg'
}

/** Accessible initials avatar (role="img" with the person's name). */
export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const label = name.trim() || 'Usuario'
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ backgroundColor: color }}
      role="img"
      aria-label={label}
    >
      {initialsOf(label)}
    </span>
  )
}