import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'expo-router'
import { Picker } from '@react-native-picker/picker'

interface RegisterForm {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'CLIENT' | 'PROVIDER'
  phone?: string
}

export default function RegisterScreen() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string>('')
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      role: 'CLIENT',
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      const response = await api.post('/auth/register', data)
      await setAuth(response.data.user, response.data.access_token)
      router.replace(response.data.user.role === 'PROVIDER' ? '/dashboard/provider' : '/dashboard/client')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse')
      Alert.alert('Error', err.response?.data?.message || 'Error al registrarse')
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Crea tu cuenta en Stylo</Text>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Controller
        control={control}
        name="firstName"
        rules={{ required: 'El nombre es requerido' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Nombre"
            />
            {errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="lastName"
        rules={{ required: 'El apellido es requerido' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Apellido"
            />
            {errors.lastName && (
              <Text style={styles.errorText}>{errors.lastName.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="email"
        rules={{ required: 'El email es requerido' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: 'La contraseña es requerida', minLength: 6 }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Contraseña (mínimo 6 caracteres)"
              secureTextEntry
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Teléfono"
              keyboardType="phone-pad"
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tipo de usuario</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={value}
                onValueChange={onChange}
                style={styles.picker}
              >
                <Picker.Item label="Cliente" value="CLIENT" />
                <Picker.Item label="Prestador de servicios" value="PROVIDER" />
              </Picker>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>

      <Link href="/auth/login" asChild>
        <TouchableOpacity>
          <Text style={styles.linkText}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 40,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    marginTop: 20,
    marginBottom: 40,
    textAlign: 'center',
    color: '#0ea5e9',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
})

