<script setup>
</script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

:root {
  --primary: #e74c3c;
  --primary-hover: #c0392b;
  --text: #333;
  --text-light: #999;
  --bg-overlay: rgba(255, 255, 255, 0.92);
  --border: rgba(0, 0, 0, 0.08);
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
</style>
