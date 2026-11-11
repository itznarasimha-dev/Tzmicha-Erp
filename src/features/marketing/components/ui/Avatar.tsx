import type { CSSProperties, ReactNode } from 'react'
import { initialsOf } from '../../utils/format'

const tones = ['indigo', 'teal', 'amber', 'rose', 'violet', 'blue'] as const

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: (typeof tones)[number]
  style?: CSSProperties
  className?: string
}

export function Avatar({ name, size = 'md', tone, style, className = '' }: AvatarProps) {
  const sizeClass = size === 'md' ? '' : `avatar--${size}`
  const resolvedTone = tone ?? tones[Math.abs(hash(name)) % tones.length]
  return (
    <span
      className={`avatar avatar--${resolvedTone} ${sizeClass} ${className}`.trim()}
      style={style}
      aria-hidden="true"
      title={name}
    >
      {initialsOf(name)}
    </span>
  )
}

function hash(value: string): number {
  let total = 0
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 31 + value.charCodeAt(i)) | 0
  }
  return total
}

export function AvatarStack({ names, limit = 3 }: { names: string[]; limit?: number }) {
  const shown = names.slice(0, limit)
  const rest = names.length - shown.length
  return (
    <span className="avatar-stack" aria-label={names.join(', ')}>
      {shown.map((name) => (
        <Avatar key={name} name={name} size="sm" />
      ))}
      {rest > 0 ? (
        <span className="avatar avatar--sm" title={`${rest} more`}>
          +{rest}
        </span>
      ) : null}
    </span>
  )
}

export function AvatarWithName({
  name,
  sub,
  size = 'sm',
  tone,
}: {
  name: string
  sub?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: (typeof tones)[number]
}) {
  return (
    <span className="row-8" style={{ minWidth: 0 }}>
      <Avatar name={name} size={size} tone={tone} />
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </span>
        {sub ? (
          <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--muted)' }}>{sub}</span>
        ) : null}
      </span>
    </span>
  )
}
