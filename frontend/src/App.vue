<template>
  <header>
    <div class="logo">
      <router-link to="/" style="font-size: 1.5rem; font-weight: 800; color: var(--primary); text-decoration: none;">
        BidNow
      </router-link>
    </div>
    <nav>
      <router-link to="/">Auctions</router-link>
      <!-- Onglet visible uniquement si l'étudiant est connecté -->
      <template v-if="user">
        <router-link to="/my-bids">My Bids</router-link>
        <router-link to="/items/new">List Item</router-link>
        <a href="#" @click.prevent="logout">Logout ({{ user.username }})</a>
      </template>
      <template v-else>
        <router-link to="/login">Login</router-link>
        <router-link to="/register">Register</router-link>
      </template>
    </nav>
  </header>

  <main class="container">
    <router-view></router-view>
  </main>

  <footer style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
    &copy; 2026 BidNow - BUT2 R401 Project
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

// L'utilisateur connecté (ref réactive pour le template)
const user = ref(null)
const router = useRouter()

// Fonction de vérification de l'utilisateur avec son token JWT
const checkUser = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    // Correction du bug du prof : user.value au lieu de user.ref
    user.value = null
    return
  }

  try {
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = res.data
  } catch (err) {
    // Si le token est invalide ou expiré, on le supprime et on déconnecte
    localStorage.removeItem('token')
    user.value = null
  }
}

// Fonction de déconnexion simple
const logout = () => {
  localStorage.removeItem('token')
  user.value = null
  router.push('/login')
}

onMounted(checkUser)

// On fournit l'état de connexion si besoin
</script>
