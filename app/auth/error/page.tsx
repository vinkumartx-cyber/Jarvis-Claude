'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Home } from 'lucide-react'

const errorMessages: Record<string, string> = {
  OAuthSignin: 'Could not sign in with the selected provider.',
  OAuthCallback: 'The sign-in callback failed.',
  OAuthCreateAccount: 'Could not create your account.',
  EmailCreateAccount: 'Could not create your email account. Please try again.',
  Callback: 'There was an issue with the callback. Please try again.',
  OAuthAccountNotLinked:
    'You already have an account with a different sign-in method.',
  EmailSignInError: 'Check your email for a sign-in link.',
  CredentialsSignin:
    'Sign in failed. Check the credentials you provided are correct.',
  default:
    'An authentication error occurred. Please try again or contact support.',
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorMessage =
    errorMessages[error || 'default'] || errorMessages.default

  return (
    <>
      {/* Error Details */}
      <p className="text-gray-300 text-center mb-6">{errorMessage}</p>

      {/* Error Code */}
      {error && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-400 text-center font-mono">
            Error code: <span className="text-red-400">{error}</span>
          </p>
        </div>
      )}
    </>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Error Card */}
        <div className="bg-gray-900/50 backdrop-blur border border-red-900 rounded-2xl p-8 shadow-2xl">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertCircle className="text-red-500" size={32} />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-100 text-center mb-3">
            Authentication Error
          </h1>

          {/* Dynamic error content wrapped in Suspense */}
          <Suspense
            fallback={
              <p className="text-gray-300 text-center mb-6">
                {errorMessages.default}
              </p>
            }
          >
            <AuthErrorContent />
          </Suspense>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block text-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg font-semibold transition-all"
            >
              <Home size={20} />
              Go to Home
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center mt-6">
            If you continue to experience issues, please contact support for
            assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
