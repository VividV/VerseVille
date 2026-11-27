import { EmptyState } from '../components/common/EmptyState'

/**
 * Honest placeholder for tabs whose features arrive in later build phases.
 * It contains no buttons, so nothing pretends to work.
 */
export function ComingSoonScreen({ title, icon, message }: { title: string; icon: string; message: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-leaf-dark">{title}</h1>
      <EmptyState icon={icon} title="Growing soon" message={message} />
    </div>
  )
}
