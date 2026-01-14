'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export default function ClientDashboard() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [providers, setProviders] = useState([])

  useEffect(() => {
    if (!user || user.role !== 'CLIENT') {
      router.push('/auth/login')
    }
  }, [user, router])

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments')
      return response.data
    },
  })

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get('/providers')
        setProviders(response.data)
      } catch (error) {
        console.error('Error fetching providers:', error)
      }
    }
    fetchProviders()
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Stylo</h1>
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Prestadores disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider: any) => (
                <div key={provider.id} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold">
                    {provider.businessName || `${provider.user.firstName} ${provider.user.lastName}`}
                  </h3>
                  <p className="text-gray-600 text-sm mt-2">{provider.description}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Servicios: {provider.services.join(', ')}
                  </p>
                  <Link
                    href={`/appointments/new?providerId=${provider.id}`}
                    className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                  >
                    Agendar cita
                  </Link>
                </div>
              ))}
            </div>
          </div>

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
                            {apt.service} - {apt.provider.businessName || `${apt.provider.user.firstName} ${apt.provider.user.lastName}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(apt.date).toLocaleDateString()} a las {apt.startTime}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Estado: {apt.status}
                          </p>
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


