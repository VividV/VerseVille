import type { ButtonHTMLAttributes } from 'react'

export type TileTone = 'default' | 'placed' | 'correct' | 'wrong' | 'hint'

const TONES: Record<TileTone, string> = {
  default: 'bg-white text-ink ring-2 ring-leaf-light hover:ring-leaf',
  placed: 'bg-cream text-ink ring-2 ring-leaf/60',
  correct: 'bg-leaf-light text-leaf-dark ring-2 ring-leaf',
  wrong: 'bg-[#f7dcd6] text-[#8a2f22] ring-2 ring-[#b64b3c]',
  hint: 'bg-gold/30 text-ink ring-2 ring-gold animate-glow',
}

/** A word tile. Always a real button, so it works with tap, mouse and keyboard. */
export function WordTileButton({
  tone = 'default',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: TileTone }) {
  return (
    <button
      type="button"
      className={[
        'min-h-11 min-w-11 select-none rounded-xl px-3 py-1.5 text-lg font-bold shadow-sm transition',
        tone === 'correct' ? 'disabled:cursor-default' : 'disabled:cursor-default disabled:opacity-40',
        TONES[tone],
        className,
      ].join(' ')}
      {...rest}
    />
  )
}
