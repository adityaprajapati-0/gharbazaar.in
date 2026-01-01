# 🚀 GharBazaar - Professional Development Guide

## 📋 **Table of Contents**

1. [Development Environment Setup](#-development-environment-setup)
2. [Code Standards & Best Practices](#-code-standards--best-practices)
3. [Component Development](#-component-development)
4. [State Management](#-state-management)
5. [API Integration](#-api-integration)
6. [Performance Optimization](#-performance-optimization)
7. [Testing Guidelines](#-testing-guidelines)
8. [Deployment Process](#-deployment-process)

---

## 🛠️ **Development Environment Setup**

### **Prerequisites**
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Git >= 2.30.0
VS Code (recommended)
```

### **Required VS Code Extensions**
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### **Environment Setup**
```bash
# 1. Clone repository
git clone <repository-url>
cd gharbazaar-main/frontend

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local

# 4. Configure Firebase credentials in .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 5. Start development server
npm run dev
```

---

## 📏 **Code Standards & Best Practices**

### **TypeScript Guidelines**
```typescript
// ✅ Good: Explicit types
interface UserProfile {
  id: string
  name: string
  email: string
  role: 'client' | 'employee' | 'admin'
  createdAt: Date
}

// ✅ Good: Function with proper typing
const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get(`/users/${userId}`)
  return response.data
}

// ❌ Bad: Any types
const fetchUser = async (id: any): Promise<any> => {
  // Avoid using 'any'
}
```

### **Component Structure**
```typescript
// ✅ Recommended component structure
'use client' // Only if needed for client components

import { useState, useEffect } from 'react'
import { ComponentProps } from './types'
import { utilityFunction } from '@/lib/utils'

interface Props {
  title: string
  isVisible?: boolean
  onClose?: () => void
}

export default function ComponentName({ title, isVisible = false, onClose }: Props) {
  // 1. Hooks
  const [state, setState] = useState<string>('')
  
  // 2. Effects
  useEffect(() => {
    // Effect logic
  }, [])
  
  // 3. Event handlers
  const handleClick = () => {
    // Handler logic
  }
  
  // 4. Render
  return (
    <div className="component-container">
      <h1>{title}</h1>
      {/* Component JSX */}
    </div>
  )
}
```

### **File Naming Conventions**
```
Components:     PascalCase.tsx     (UserProfile.tsx)
Pages:          page.tsx           (Next.js App Router)
Utilities:      camelCase.ts       (apiHelpers.ts)
Hooks:          useHookName.ts     (useAuth.ts)
Types:          types.ts           (userTypes.ts)
Constants:      UPPER_CASE.ts      (API_ENDPOINTS.ts)
```

### **Import Organization**
```typescript
// 1. React imports
import { useState, useEffect } from 'react'

// 2. Third-party imports
import { NextPage } from 'next'
import { toast } from 'react-hot-toast'

// 3. Internal imports (absolute paths)
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'

// 4. Relative imports
import './ComponentName.css'
```

---

## 🧩 **Component Development**

### **Reusable Component Pattern**
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  children,
  onClick 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors'
  const variantClasses = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  )
}
```

### **Page Component Pattern**
```typescript
// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardStats()
  }, [])
  
  const fetchDashboardStats = async () => {
    try {
      // API call logic
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        {/* Dashboard content */}
      </div>
    </DashboardLayout>
  )
}
```

---

## 🔄 **State Management**

### **Context API Pattern**
```typescript
// contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    
    return unsubscribe
  }, [])
  
  const signIn = async (email: string, password: string) => {
    // Sign in logic
  }
  
  const signOut = async () => {
    // Sign out logic
  }
  
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### **Local State Management**
```typescript
// Custom hook for form state
export function useFormState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const updateField = (field: keyof T, value: any) => {
    setState(prev => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }
  
  const setError = (field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }))
  }
  
  const reset = () => {
    setState(initialState)
    setErrors({})
  }
  
  return { state, errors, updateField, setError, reset }
}
```

---

## 🌐 **API Integration**

### **API Client Setup**
```typescript
// lib/api.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
})

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { apiClient }
```

### **API Service Pattern**
```typescript
// lib/services/userService.ts
import { apiClient } from '@/lib/api'

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export const userService = {
  async getProfile(userId: string): Promise<User> {
    const response = await apiClient.get(`/users/${userId}`)
    return response.data
  },
  
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.put(`/users/${userId}`, data)
    return response.data
  },
  
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`)
  }
}
```

---

## ⚡ **Performance Optimization**

### **Code Splitting**
```typescript
// Dynamic imports for large components
import dynamic from 'next/dynamic'

const DashboardChart = dynamic(() => import('@/components/DashboardChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false
})

// Lazy loading with React.lazy
const LazyComponent = lazy(() => import('./LazyComponent'))
```

### **Image Optimization**
```typescript
import Image from 'next/image'

// ✅ Optimized image usage
<Image
  src="/images/property.jpg"
  alt="Property image"
  width={800}
  height={600}
  priority={false} // Set to true for above-fold images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### **Memoization**
```typescript
import { memo, useMemo, useCallback } from 'react'

// Memoize expensive calculations
const ExpensiveComponent = memo(({ data }: { data: any[] }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveProcessing(item))
  }, [data])
  
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, [])
  
  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  )
})
```

---

## 🧪 **Testing Guidelines**

### **Component Testing**
```typescript
// __tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### **API Testing**
```typescript
// __tests__/api/userService.test.ts
import { userService } from '@/lib/services/userService'
import { apiClient } from '@/lib/api'

jest.mock('@/lib/api')
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('UserService', () => {
  it('fetches user profile', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }
    mockedApiClient.get.mockResolvedValue({ data: mockUser })
    
    const result = await userService.getProfile('1')
    
    expect(mockedApiClient.get).toHaveBeenCalledWith('/users/1')
    expect(result).toEqual(mockUser)
  })
})
```

---

## 🚀 **Deployment Process**

### **Build Process**
```bash
# 1. Install dependencies
npm ci

# 2. Run type checking
npm run type-check

# 3. Run linting
npm run lint

# 4. Build application
npm run build

# 5. Test build
npm start
```

### **Environment Configuration**
```bash
# Production environment variables
NEXT_PUBLIC_FIREBASE_API_KEY=prod_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=prod_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=prod_project
NEXT_PUBLIC_APP_URL=https://gharbazaar.in
```

### **Vercel Deployment**
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "env": {
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase_api_key",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "@firebase_auth_domain"
  }
}
```

---

## 🔧 **Development Scripts**

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### **Git Hooks (Husky)**
```json
// .husky/pre-commit
#!/bin/sh
npm run lint
npm run type-check
npm run test
```

---

## 📚 **Additional Resources**

- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **React Documentation**: [react.dev](https://react.dev)
- **TypeScript Handbook**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Firebase Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)

---

**This guide ensures consistent, high-quality development practices across the GharBazaar platform.**