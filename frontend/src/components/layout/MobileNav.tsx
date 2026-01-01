'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Search, 
  Heart, 
  MessageSquare, 
  User,
  Plus,
  LayoutDashboard
} from 'lucide-react'

export function MobileNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error parsing user:', error)
      }
    }
  }, [])

  // Don't show on dashboard pages (they have their own navigation)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/employee')) {
    return null
  }

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/listings', icon: Search },
    ...(user ? [
      { name: 'Favorites', href: '/dashboard/favorites', icon: Heart },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
    ] : [
      { name: 'Login', href: '/login', icon: User }
    ])
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Don't show mobile nav on landing page
  if (pathname === '/') {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              isActive(item.href)
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <item.icon size={20} className="mb-1" />
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
      
      {/* Add some padding to prevent content from being hidden behind the nav */}
      <div className="h-safe-area-inset-bottom"></div>
    </nav>
  )
}