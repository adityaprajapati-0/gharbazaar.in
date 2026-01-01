'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoaderProvider } from '@/components/GlobalLoader'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { PaymentProvider } from '@/contexts/PaymentContext'
import { SellerSubscriptionProvider } from '@/contexts/SellerSubscriptionContext'
import LoadingScreen from './LoadingScreen'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoaderProvider>
          <AuthProvider loadingComponent={<LoadingScreen />}>
            <FavoritesProvider>
              <PaymentProvider>
                <SellerSubscriptionProvider>
                  {children}
                </SellerSubscriptionProvider>
              </PaymentProvider>
            </FavoritesProvider>
            <Toaster position="top-right" />
          </AuthProvider>
        </LoaderProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
