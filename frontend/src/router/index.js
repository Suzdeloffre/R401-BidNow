import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import CreateItemView from '../views/CreateItemView.vue'
import ItemDetailView from '../views/ItemDetailView.vue'
import MyBidsView from '../views/MyBidsView.vue' // Extension : Historique des mises de l'étudiant

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/items/new', name: 'create-item', component: CreateItemView },
  { path: '/items/:id', name: 'item-detail', component: ItemDetailView },
  { path: '/my-bids', name: 'my-bids', component: MyBidsView }, // Route pour voir ses mises perso
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard (protection des routes privées)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  // On ajoute 'my-bids' à la liste des routes protégées
  const protectedRoutes = ['create-item', 'my-bids']
  if (protectedRoutes.includes(to.name) && !token) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
