import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'

export function NotFoundScreen() {
  return (
    <div className="mx-auto max-w-md">
      <EmptyState
        icon="🍂"
        title="This path is overgrown"
        message="We couldn't find that page."
        action={
          <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-leaf px-5 font-bold text-white">
            Back to the garden
          </Link>
        }
      />
    </div>
  )
}
