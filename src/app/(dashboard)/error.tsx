'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="text-red-500 text-lg font-semibold">Erro ao carregar página</div>
      <pre className="text-xs text-gray-600 bg-gray-100 rounded p-4 max-w-xl overflow-auto whitespace-pre-wrap">
        {error.message}
        {'\n'}
        {error.digest && `Digest: ${error.digest}`}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        Tentar novamente
      </button>
    </div>
  )
}
