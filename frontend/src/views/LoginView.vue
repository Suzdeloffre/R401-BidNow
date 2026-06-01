<template>
  <div style="max-width: 400px; margin: 4rem auto;">
    <div class="card">
      <h1 style="text-align: center;">Welcome Back</h1>
      <form @submit.prevent="handleLogin">
        <label>Email</label>
        <input v-model="form.email" type="email" placeholder="email@example.com" required />
        
        <label>Password</label>
        <input v-model="form.password" type="password" placeholder="••••••••" required />
        
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      <p v-if="error" style="color: var(--danger); margin-top: 1rem; text-align: center;">{{ error }}</p>
      <p style="margin-top: 2rem; text-align: center; font-size: 0.9rem;">
        Don't have an account? <router-link to="/register">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.post('/api/auth/login', form)
    localStorage.setItem('token', res.data.token)
    window.location.href = '/' // Simple way to refresh app state
  } catch (err) {
    error.value = err.response?.data?.error || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
