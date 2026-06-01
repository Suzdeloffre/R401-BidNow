<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h1>My Bids History</h1>
    </div>

    <!-- Chargement en cours -->
    <div v-if="loading" style="text-align: center; padding: 3rem;">Loading your bid history...</div>
    
    <!-- Liste vide si aucune enchère n'a de mise de cet utilisateur -->
    <div v-else-if="items.length === 0" class="card" style="text-align: center; padding: 3rem;">
      <p>You haven't placed any bids yet.</p>
      <router-link to="/" class="btn btn-primary" style="display: inline-block; margin-top: 1rem;">Browse Live Auctions</router-link>
    </div>

    <!-- Grille d'affichage des enchères -->
    <div v-else class="grid">
      <div v-for="item in items" :key="item._id" class="card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h2 style="margin: 0; font-size: 1.25rem;">{{ item.title }}</h2>
          <span :class="['badge', item.status === 'active' ? 'badge-active' : 'badge-ended']">{{ item.status }}</span>
        </div>
        <p style="color: var(--text-muted); margin: 0.5rem 0; font-size: 0.9rem; height: 3rem; overflow: hidden;">
          {{ item.description }}
        </p>
        
        <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Current Price</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${{ item.currentPrice }}</div>
          </div>
          <router-link :to="'/items/' + item._id" class="btn btn-primary">
            {{ item.status === 'active' ? 'Bid Now' : 'View Result' }}
          </router-link>
        </div>
        
        <div v-if="item.status === 'active'" style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
          Ends: {{ new Date(item.endsAt).toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// Les articles récupérés depuis la base de données
const items = ref([])
const loading = ref(true)

// Charger l'historique des enchères sur lesquelles l'étudiant a misé
const fetchMyBids = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    // Requête REST authentifiée avec le token JWT
    const res = await axios.get('/api/items/my-bids', {
      headers: { Authorization: `Bearer ${token}` }
    })
    items.value = res.data
  } catch (err) {
    console.error("Erreur lors du chargement des mises perso :", err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchMyBids)
</script>
