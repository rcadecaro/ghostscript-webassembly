<script setup lang="ts">
import ConverterView from './views/ConverterView.vue'
</script>

<template>
  <ConverterView />
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
}

#app {
  min-height: 100vh;
}
</style>
