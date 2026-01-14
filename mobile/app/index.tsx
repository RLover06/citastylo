import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { View, Text, ActivityIndicator } from 'react-native'

export default function Index() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(user.role === 'PROVIDER' ? '/dashboard/provider' : '/dashboard/client')
    } else {
      router.replace('/auth/login')
    }
  }, [isAuthenticated, user, router])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Stylo</Text>
      <ActivityIndicator size="large" />
    </View>
  )
}


