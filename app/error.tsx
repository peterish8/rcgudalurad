'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

