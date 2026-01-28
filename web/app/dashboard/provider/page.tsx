'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export default function ProviderDashboard() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') {
      router.push('/auth/login')
    }
  }, [user, router])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/providers/me')
        setProfile(response.data)
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    if (user?.role === 'PROVIDER') {
      fetchProfile()
    }
  }, [user])

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments')
      return response.data
    },
  })

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Stylo - Prestador</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user.firstName} {user.lastName}</span>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!profile && (
            <div className="mb-8 bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Completa tu perfil</h2>
              <p className="text-gray-600 mb-4">
                Para comenzar a recibir citas, necesitas completar tu perfil de prestador.
              </p>
              <button className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700">
                Crear perfil
              </button>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">Mis citas</h2>
            {isLoading ? (
              <p>Cargando...</p>
            ) : appointments?.length === 0 ? (
              <p className="text-gray-500">No tienes citas agendadas</p>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {appointments?.map((apt: any) => (
                    <li key={apt.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {apt.service} - {apt.client.firstName} {apt.client.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(apt.date).toLocaleDateString()} a las {apt.startTime}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Estado: {apt.status}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {apt.status === 'PENDING' && (
                            <button className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                              Confirmar
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

