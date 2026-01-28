import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Iniciar sesión' }} />
        <Stack.Screen name="auth/register" options={{ title: 'Registrarse' }} />
        <Stack.Screen name="dashboard/client" options={{ title: 'Mis citas' }} />
        <Stack.Screen name="dashboard/provider" options={{ title: 'Panel de prestador' }} />
      </Stack>
    </QueryClientProvider>
  )
}

