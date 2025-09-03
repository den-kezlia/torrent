"use client"
import { useRouter } from 'next/navigation'

export function ResetStatusButton({ streetId }: { streetId: string }) {
  const router = useRouter()
  async function onClick() {
    await fetch(`/api/streets/${streetId}/visit`, { method: 'DELETE' })
    router.refresh()
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
    >
      Reset
    </button>
  )
}

export default ResetStatusButton
