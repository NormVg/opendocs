import { createRouter, createWebHashHistory } from 'vue-router'
import LibraryView from '../views/LibraryView.vue'
import ReaderView from '../views/ReaderView.vue'

const routes = [
  {
    path: '/',
    name: 'library',
    component: LibraryView
  },
  {
    path: '/reader',
    name: 'reader',
    component: ReaderView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
