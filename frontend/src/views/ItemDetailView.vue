<template>
  <div v-if="loading" style="text-align: center; padding: 3rem;">Loading item details...</div>
  <div v-else-if="!item" style="text-align: center; padding: 3rem;">Item not found.</div>
  
  <div v-else class="grid" style="grid-template-columns: 2fr 1fr;">
    <!-- Left Column: Item Info & Bids -->
    <div>
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h1>{{ item.title }}</h1>
          <span :class="['badge', item.status === 'active' ? 'badge-active' : 'badge-ended']">{{ item.status }}</span>
        </div>
        <p style="font-size: 1.1rem; margin-bottom: 2rem;">{{ item.description }}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Seller</span>
            <p style="font-weight: 600;">{{ item.ownerUsername }}</p>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Start Price</span>
            <p style="font-weight: 600;">${{ item.startPrice }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Bid History</h3>
        <div v-if="bids.length === 0" style="color: var(--text-muted); padding: 1rem 0;">No bids yet. Be the first!</div>
        <div v-else class="bid-list">
          <div v-for="bid in bids" :key="bid._id" class="bid-item">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">{{ bid.bidder }}</span>
              <span style="font-weight: 800; color: var(--primary);">${{ bid.amount }}</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">
              {{ new Date(bid.createdAt).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Bidding Action -->
    <div>
      <div class="card" style="position: sticky; top: 2rem;">
        <div v-if="item.status === 'active'">
          <h2 style="text-align: center; color: var(--text-muted);">Time Remaining</h2>
          <div style="font-size: 2.5rem; font-weight: 900; text-align: center; margin: 1rem 0; font-variant-numeric: tabular-nums;">
            {{ countdown }}
          </div>
          
          <div style="margin-top: 2rem; padding: 1rem; background: #f1f5f9; border-radius: 0.5rem; text-align: center;">
            <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Current Price</div>
            <div style="font-size: 2rem; font-weight: 900; color: var(--primary);">${{ item.currentPrice }}</div>
            <div v-if="item.currentBidder" style="font-size: 0.8rem; margin-top: 0.5rem;">
              Held by <strong>{{ item.currentBidder }}</strong>
            </div>
          </div>

          <form @submit.prevent="placeBid" style="margin-top: 2rem;">
            <label>Your Bid ($)</label>
            <input v-model.number="bidAmount" type="number" :min="item.currentPrice + 0.01" step="0.01" required placeholder="Enter amount..." />
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem;" :disabled="placing">
              {{ placing ? 'Placing Bid...' : 'Place Bid' }}
            </button>
          </form>
          <p v-if="bidError" style="color: var(--danger); font-size: 0.8rem; margin-top: 1rem; text-align: center;">{{ bidError }}</p>
        </div>

        <div v-else style="text-align: center; padding: 1rem 0;">
          <h2 style="color: var(--danger);">Auction Ended</h2>
          <div style="margin-top: 1rem; padding: 1.5rem; background: #fef2f2; border-radius: 0.5rem;">
            <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Sold For</div>
            <div style="font-size: 2rem; font-weight: 900; color: var(--danger);">${{ item.currentPrice }}</div>
            <div v-if="item.currentBidder" style="font-size: 1rem; margin-top: 0.5rem;">
              Winner: <strong>{{ item.currentBidder }}</strong>
            </div>
            <div v-else style="color: var(--text-muted);">No winners</div>
          </div>
          
          <button v-if="isOwner" @click="deleteAuction" class="btn" style="margin-top: 2rem; color: var(--danger); background: #fff; border: 1px solid var(--danger); width: 100%;">
            Delete Listing
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'

const route = useRoute()
const router = useRouter()
const item = ref(null)
const bids = ref([])
const loading = ref(true)
const bidAmount = ref(0)
const placing = ref(false)
const bidError = ref('')
const now = ref(new Date())

let socket = null
let timer = null

const isOwner = computed(() => {
    // Basic check, ideally user object is provided by App.vue
    const token = localStorage.getItem('token')
    if (!token || !item.value) return false
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return item.value.ownerId === payload.id
    } catch { return false }
})

const countdown = computed(() => {
  if (!item.value || item.value.status !== 'active') return '00:00:00'
  const end = new Date(item.value.endsAt)
  const diff = end - now.value
  if (diff <= 0) return '00:00:00'

  const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
  const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
})

const fetchData = async () => {
  try {
    const [itemRes, bidsRes] = await Promise.all([
      axios.get(`/api/items/${route.params.id}`),
      axios.get(`/api/items/${route.params.id}/bids`)
    ])
    item.value = itemRes.data
    bids.value = bidsRes.data
    bidAmount.value = item.value.currentPrice + 1
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const placeBid = () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return
  }

  placing.value = true
  bidError.value = ''
  socket.emit('place-bid', { itemId: item.value._id, amount: bidAmount.value })
  
  // Timeout for placing state if socket doesn't respond
  setTimeout(() => { placing.value = false }, 2000)
}

const deleteAuction = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    try {
        const token = localStorage.getItem('token')
        await axios.delete(`/api/items/${item.value._id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        router.push('/')
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete')
    }
}

onMounted(() => {
  fetchData()
  timer = setInterval(() => { now.value = new Date() }, 1000)

  // Setup Socket
  const token = localStorage.getItem('token')
  socket = io({ auth: { token } })

  socket.emit('join-item', route.params.id)

  socket.on('new-bid', (bid) => {
    bids.value.unshift({
        _id: Date.now(), // temporary ID
        bidder: bid.bidder,
        amount: bid.amount,
        createdAt: bid.at
    })
    if (item.value) {
        item.value.currentPrice = bid.amount
        item.value.currentBidder = bid.bidder
        bidAmount.value = bid.amount + 1
    }
    placing.value = false
  })

  socket.on('item-updated', (update) => {
      if (update.itemId === item.value?._id) {
          item.value.status = update.status
      }
  })

  socket.on('auction-ended', (data) => {
    if (item.value) {
        item.value.status = 'ended'
        item.value.currentBidder = data.winner
        item.value.currentPrice = data.finalPrice
    }
  })

  socket.on('bid-rejected', (data) => {
    bidError.value = data.reason
    placing.value = false
  })
})

onUnmounted(() => {
  if (socket) {
    socket.emit('leave-item', route.params.id)
    socket.disconnect()
  }
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.bid-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.bid-item {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
}
.bid-item:first-child {
  background: #f8fafc;
  border-radius: 0.5rem;
}
</style>
