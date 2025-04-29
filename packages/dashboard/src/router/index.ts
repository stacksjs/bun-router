import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/requests',
      name: 'requests',
      component: () => import('../views/RequestsView.vue'),
    },
    {
      path: '/requests/:id',
      name: 'request-details',
      component: () => import('../views/RequestDetailsView.vue'),
    },
    {
      path: '/capture',
      name: 'capture',
      component: () => import('../views/LiveCaptureView.vue'),
    },
    {
      path: '/headers',
      name: 'headers',
      component: () => import('../views/HeadersAnalyzerView.vue'),
    },
    {
      path: '/tester',
      name: 'tester',
      component: () => import('../views/ResponseTesterView.vue'),
    },
    {
      path: '/websocket',
      name: 'websocket',
      component: () => import('../views/WebSocketMonitorView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
  ],
})

export default router
