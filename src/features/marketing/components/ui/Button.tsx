import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'default' | 'primary' | 'soft' | 'ghost' | 'danger' | 'success' | 'outline-danger'
type Size = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

const variantClass: Record<Variant, string> = {
  default: '',
  primary: 'btn--primary',
  soft: 'btn--soft',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
  success: 'btn--success',
  'outline-danger': 'btn--outline-danger',
}

const sizeClass: Record<Size, string> = {
  xs: 'btn--xs',
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    loading = false,
    icon,
    block = false,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        'btn',
        variantClass[variant],
        sizeClass[size],
        block ? 'btn--block' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
})
