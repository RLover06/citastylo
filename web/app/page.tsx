'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.push(user?.role === 'PROVIDER' ? '/dashboard/provider' : '/dashboard/client')
    } else {
      router.push('/auth/login')
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Stylo</h1>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  )
}

