import Link from 'next/link'
import { Button } from '@/components/simple-ui'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Authentication Error</h1>
          <p className="text-gray-600 dark:text-gray-400">
            There was a problem with your authentication request.
          </p>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
          <h2 className="font-semibold mb-2">This could happen because:</h2>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>The verification link has expired</li>
            <li>The link has already been used</li>
            <li>There was an issue with your email provider</li>
            <li>Your session has timed out</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
            <Link href="/login">
              Back to Sign In
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/register">
              Create New Account
            </Link>
          </Button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          If you continue to experience issues, please contact support at{' '}
          <a href="mailto:support@gametriq.com" className="text-orange-600 hover:text-orange-700 dark:text-orange-400">
            support@gametriq.com
          </a>
        </p>
      </div>
    </div>
  )
}