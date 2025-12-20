<script setup lang="ts">
import { ref } from 'vue';
import ConverterView from './views/ConverterView.vue';
import OptimizerView from './views/OptimizerView.vue';

type ViewType = 'converter' | 'optimizer';
const currentView = ref<ViewType>('converter');
</script>

<template>
  <div class="app-container">
    <nav class="main-nav">
      <button 
        :class="['nav-item', { active: currentView === 'converter' }]"
        @click="currentView = 'converter'"
      >
        <span class="nav-icon">🖼️</span>
        PDF para Imagem
      </button>
      <button 
        :class="['nav-item', { active: currentView === 'optimizer' }]"
        @click="currentView = 'optimizer'"
      >
        <span class="nav-icon">⚡</span>
        Otimizar PDF
      </button>
    </nav>

    <Transition name="fade" mode="out-in">
      <ConverterView v-if="currentView === 'converter'" />
      <OptimizerView v-else />
    </Transition>
  </div>
</template>

<style>
/* Google Font - Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: #0f0f1a;
  min-height: 100vh;
  color: #ffffff;
  
  /* Cores Ghostscript */
  --gs-cyan: #1095C2;
  --gs-cyan-light: #3BB4DE;
  --gs-cyan-dark: #0A7A9D;
  
  /* Base Colors */
  --bg-base: #0a0a0f;
  --bg-elevated: #12121a;
  --bg-card: #1a1a24;
  --bg-hover: #222230;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  
  /* Accents */
  --accent: var(--gs-cyan);
  --accent-light: var(--gs-cyan-light);
  --gradient: linear-gradient(135deg, var(--gs-cyan) 0%, #6366f1 50%, #8b5cf6 100%);
  --gradient-subtle: linear-gradient(135deg, rgba(16, 149, 194, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  
  /* Effects */
  --glow-cyan: 0 0 40px rgba(16, 149, 194, 0.4);
  --glow-purple: 0 0 40px rgba(139, 92, 246, 0.3);
  
  /* Feedback */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* Borders */
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(16, 149, 194, 0.5);
  
  /* Sizing */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}

#app {
  min-height: 100vh;
}

/* Navigation */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  position: relative;
  z-index: 10;
}

.nav-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-item.active {
  background: rgba(16, 149, 194, 0.15);
  border-color: #1095C2;
  color: #1095C2;
  box-shadow: 0 0 20px rgba(16, 149, 194, 0.2);
}

.nav-icon {
  font-size: 1.1rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
