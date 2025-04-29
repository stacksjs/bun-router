<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { computed } from 'vue'
import { Line } from 'vue-chartjs'

const props = defineProps<{
  data: number[]
  labels: string[]
}>()

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const chartData = computed(() => {
  return {
    labels: props.labels,
    datasets: [
      {
        label: 'Response Time (ms)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald
        borderColor: '#10b981',
        tension: 0.4,
        fill: true,
        data: props.data,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (context: any) => {
          return `${context.raw} ms`
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Response Time (ms)',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
}
</script>

<template>
  <div class="h-80">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>