import { Link } from 'react-router-dom'

/** Header for game screens: close button, game name and scripture reference. */
export function GameHeader({ title, reference, exitTo }: { title: string; reference: string; exitTo: string }) {
  return (
    <header className="sticky top-0 z-30 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2">
        <Link
          to={exitTo}
          aria-label="Leave game"
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-leaf-dark hover:bg-leaf-light"
        >
          <span aria-hidden="true">×</span>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold text-leaf-dark">{title}</h1>
          <p className="truncate text-sm font-bold text-ink-soft">{reference}</p>
        </div>
      </div>
    </header>
  )
}
