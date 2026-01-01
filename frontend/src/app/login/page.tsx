'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Home,
  ArrowRight,
  ArrowLeft,
  Shield,
  Users,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLoader } from '@/components/GlobalLoader'

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle } = useAuth()
  const { showLoader } = useLoader()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  // Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    showLoader('Signing you in securely...', 2000)

    try {
      await login(formData.email, formData.password)
      // Login function already handles navigation with loader
    } catch (error: any) {
      if (error.message.includes('user-not-found')) {
        alert('No account found with this email')
      } else if (error.message.includes('wrong-password')) {
        alert('Incorrect password')
      } else {
        alert(error.message || 'Login failed')
      }
      setLoading(false)
    }
  }

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setLoading(true)
    showLoader('Signing in with Google...', 2000)
    try {
      await loginWithGoogle()
      // LoginWithGoogle function already handles navigation with loader
    } catch (error: any) {
      alert(error.message || 'Google login failed')
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex overflow-y-auto relative">
      {/* Go Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all duration-200 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </Link>
      {/* Left Side - Brand Section (50%) */}
      <div className="hidden lg:flex w-1/2 relative items-start justify-center py-8 lg:py-12 pb-16 lg:pb-24 bg-white dark:bg-gray-950">


        <div className="relative z-10 text-center text-white px-6 lg:px-12 bg-gradient-to-br from-teal-600 via-emerald-600 to-blue-700 rounded-3xl p-8 lg:p-12 shadow-2xl mb-8">
          {/* Logo */}
          <div className="mb-8 lg:mb-12">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-white/20 backdrop-blur-sm rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-2xl overflow-hidden">
              <img
                src="/images/gharbazaar logo.jpeg"
                alt="GharBazaar Logo"
                className="w-12 h-12 lg:w-16 lg:h-16 object-contain rounded-lg"
              />
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold mb-2 lg:mb-4">GharBazaar</h1>
            <p className="text-lg lg:text-xl text-teal-100 font-light">
              India's Leading Property Platform
            </p>
          </div>

          {/* Main Content */}
          <div className="mb-8 lg:mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-6 leading-tight">
              Welcome Back!
            </h2>
            <p className="text-base lg:text-lg text-teal-100 mb-6 lg:mb-8 leading-relaxed max-w-md mx-auto">
              Sign in to access your dashboard and manage your property listings with complete transparency.
            </p>
          </div>

          {/* Trust Points */}
          <div className="space-y-3 lg:space-y-4 max-w-sm mx-auto">
            <div className="flex items-center space-x-3 lg:space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-3 lg:p-4">
              <Shield className="text-teal-200" size={20} />
              <div className="text-left">
                <p className="font-semibold text-sm lg:text-base">Secure Authentication</p>
                <p className="text-xs lg:text-sm text-teal-200">Bank-level security</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 lg:space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-3 lg:p-4">
              <Users className="text-emerald-200" size={20} />
              <div className="text-left">
                <p className="font-semibold text-sm lg:text-base">Trusted by 10,000+ Users</p>
                <p className="text-xs lg:text-sm text-emerald-200">Real property deals</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 lg:space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-3 lg:p-4">
              <CheckCircle className="text-blue-200" size={20} />
              <div className="text-left">
                <p className="font-semibold text-sm lg:text-base">No Broker Interference</p>
                <p className="text-xs lg:text-sm text-blue-200">Direct property access</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center p-4 lg:p-12 py-12 lg:py-16 pb-16 lg:pb-24 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 lg:p-8 mb-8">
          {/* Mobile Logo (Hidden on Desktop) */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-xl overflow-hidden p-1">
                <img
                  src="/images/gharbazaar logo.jpeg"
                  alt="GharBazaar Logo"
                  className="w-10 h-10 object-contain rounded-lg"
                />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                GharBazaar
              </h1>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-center mb-6 lg:mb-8 mt-4">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Hello Again!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
              Welcome back, you've been missed!
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-4 lg:space-y-6">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl lg:rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl group"
            >
              <svg width="20" height="20" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-gray-700 dark:text-gray-200 text-base lg:text-lg">
                Sign in with Google
              </span>
            </button>


            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4 lg:space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm lg:text-lg"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 lg:pl-12 pr-12 lg:pr-14 py-3 lg:py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm lg:text-lg"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="w-4 h-4 lg:w-5 lg:h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 lg:ml-3 text-xs lg:text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-semibold text-base lg:text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={20} className="lg:w-6 lg:h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="text-center pt-4 lg:pt-6">
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link
                  href="/signup"
                  className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold transition-colors"
                >
                  Create account
                </Link>
              </p>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}