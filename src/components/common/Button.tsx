import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  icon?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-leaf text-white shadow-soft hover:bg-leaf-dark active:translate-y-px',
  secondary: 'bg-cream text-leaf-dark ring-2 ring-leaf/40 hover:bg-leaf-light',
  gold: 'bg-gold text-ink shadow-soft hover:brightness-95 active:translate-y-px',
  ghost: 'bg-transparent text-leaf-dark hover:bg-leaf-light',
  danger: 'bg-[#b64b3c] text-white hover:bg-[#953a2e]',
}

const sizeClasses: Record<Size, string> = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
