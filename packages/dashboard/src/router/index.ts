import { createRouter, createWebHistory } from 'vue-router'
import RequestComparisonView from '../views/RequestComparisonView.vue'
import PerformanceMetricsView from '../views/PerformanceMetricsView.vue'

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
      path: '/requests/compare',
      name: 'RequestComparison',
      component: RequestComparisonView
    },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('../views/CollectionsView.vue'),
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
    {
      path: '/performance',
      name: 'PerformanceMetrics',
      component: PerformanceMetricsView
    },
    {
      path: '/performance/:id',
      name: 'PerformanceMetricsDetail',
      component: PerformanceMetricsView
    },
  ],
})

export default router
