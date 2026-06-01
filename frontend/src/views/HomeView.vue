<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
      <h1>Live Auctions</h1>
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <!-- Barre de recherche (Extension) -->
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher par titre..." 
          style="margin-bottom: 0; max-width: 250px; padding: 0.5rem 1rem;" 
        />
        <div class="tabs">
          <button @click="status = 'active'" :class="['btn', status === 'active' ? 'btn-primary' : '']">Active</button>
          <button @click="status = 'ended'" :class="['btn', status === 'ended' ? 'btn-primary' : '']" style="margin-left: 0.5rem;">Ended</button>
        </div>
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 3rem;">Loading auctions...</div>
    
    <div v-else-if="items.length === 0" class="card" style="text-align: center; padding: 3rem;">
      <p>No {{ status }} auctions found.</p>
      <router-link v-if="status === 'active'" to="/items/new" class="btn btn-primary" style="display: inline-block; margin-top: 1rem;">Start One!</router-link>
    </div>

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
import { ref, onMounted, watch, onUnmounted } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'

const items = ref([])
const status = ref('active')
const searchQuery = ref('') // Extension : texte de recherche réactif
const loading = ref(true)
let socket = null

// Récupérer les articles depuis l'API REST avec les filtres requis
const fetchItems = async () => {
  loading.value = true
  try {
    // On passe le statut et le paramètre 'q' pour la recherche
    const res = await axios.get(`/api/items?status=${status.value}&q=${searchQuery.value}`)
    items.value = res.data
  } catch (err) {
    console.error("Erreur lors de la récupération des enchères :", err)
  } finally {
    loading.value = false
  }
}

// Relancer la récupération si les filtres changent
watch(status, fetchItems)
watch(searchQuery, fetchItems)

onMounted(() => {
  fetchItems()
  
  // Authentification de la socket : on ne se connecte que si on a un token.
  // Cela évite les erreurs de connexion infinies si le visiteur est anonyme !
  const token = localStorage.getItem('token')
  if (token) {
    socket = io({ auth: { token } })
    
    // Écouter les mises à jour temps réel des prix et des enchérisseurs
    socket.on('item-updated', (update) => {
      const index = items.value.findIndex(i => i._id === update.itemId)
      if (index !== -1) {
        items.value[index].currentPrice = update.currentPrice
        items.value[index].currentBidder = update.currentBidder
        
        // Si le statut a changé, on le retire éventuellement de l'affichage courant
        if (update.status !== status.value) {
            items.value.splice(index, 1)
        }
      }
    })
  }
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>
