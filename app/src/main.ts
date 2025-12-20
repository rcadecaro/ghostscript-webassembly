import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import '@/services/firebase' // Inicializa Firebase Analytics

createApp(App).mount('#app')
