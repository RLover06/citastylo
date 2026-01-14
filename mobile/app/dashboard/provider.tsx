import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

export default function ProviderDashboard() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') {
      router.replace('/auth/login')
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

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments')
      return response.data
    },
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (!user) return null

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stylo - Prestador</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {!profile && (
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Completa tu perfil</Text>
            <Text style={styles.cardText}>
              Para comenzar a recibir citas, necesitas completar tu perfil de prestador.
            </Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Crear perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis citas</Text>
        {isLoading ? (
          <Text style={styles.loadingText}>Cargando...</Text>
        ) : appointments?.length === 0 ? (
          <Text style={styles.emptyText}>No tienes citas agendadas</Text>
        ) : (
          appointments?.map((apt: any) => (
            <View key={apt.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {apt.service} - {apt.client.firstName} {apt.client.lastName}
              </Text>
              <Text style={styles.cardText}>
                {format(new Date(apt.date), "d 'de' MMMM 'a las' HH:mm")}
              </Text>
              <Text style={styles.cardSubtext}>Estado: {apt.status}</Text>
              {apt.status === 'PENDING' && (
                <TouchableOpacity style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutText: {
    color: '#0ea5e9',
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#999',
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
})

