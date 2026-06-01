<template>
  <div style="max-width: 600px; margin: 2rem auto;">
    <div class="card">
      <h1>List a New Item</h1>
      <form @submit.prevent="handleCreate">
        <label>Item Title</label>
        <input v-model="form.title" type="text" placeholder="e.g. Vintage Rolex Watch" required />

        <label>Description</label>
        <textarea v-model="form.description" rows="4" placeholder="Tell bidders about your item..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 1rem;"></textarea>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label>Starting Price ($)</label>
            <input v-model.number="form.startPrice" type="number" step="0.01" min="0.01" required />
          </div>
          <div>
            <label>Duration (minutes)</label>
            <input v-model.number="form.duration" type="number" min="1" required />
          </div>
        </div>
        
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" :disabled="loading">
          {{ loading ? 'Creating...' : 'List Item' }}
        </button>
      </form>
      <p v-if="error" style="color: var(--danger); margin-top: 1rem; text-align: center;">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const form = reactive({ title: '', description: '', startPrice: 1, duration: 10 })
const loading = ref(false)
const error = ref('')

const handleCreate = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post('/api/items', form, {
      headers: { Authorization: `Bearer ${token}` }
    })
    router.push(`/items/${res.data._id}`)
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create item'
  } finally {
    loading.value = false
  }
}
</script>
