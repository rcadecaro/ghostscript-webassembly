<script setup lang="ts">
defineProps<{
  titlePrefix: string;
  titleSuffix: string;
  features: string[];
}>();
</script>

<template>
  <header class="header">
    <div class="logo-wrapper">
      <img src="/ghostscript/Ghostscript.svg" alt="Ghostscript" class="logo" />
      <div class="badge-container">
        <span class="badge">WebAssembly</span>
        <span class="badge badge-secondary">16MB</span>
      </div>
    </div>
    <p class="tagline">
      <span class="highlight">{{ titlePrefix }}</span> {{ titleSuffix }}
    </p>
    <div class="features">
      <span v-for="(feature, index) in features" :key="index" class="feature">
        {{ feature }}
      </span>
    </div>
  </header>
</template>

<style scoped>
/* Header */
.header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 4rem 2rem 3rem;
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.logo {
  height: 70px;
  width: auto;
  filter: brightness(0) invert(1) drop-shadow(0 0 30px rgba(16, 149, 194, 0.5));
  transition: all 0.4s ease;
}

.logo:hover {
  transform: scale(1.05);
  filter: brightness(0) invert(1) drop-shadow(0 0 50px rgba(16, 149, 194, 0.8));
}

.badge-container {
  display: flex;
  gap: 0.5rem;
}

.badge {
  background: var(--gradient);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.badge-secondary {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.tagline {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.highlight {
  color: var(--gs-cyan-light);
  font-weight: 600;
}

.features {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  background: var(--gradient-subtle);
  border-radius: 20px;
  border: 1px solid var(--border);
}
</style>
