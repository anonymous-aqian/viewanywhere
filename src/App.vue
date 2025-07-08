<script setup>
import ModelViewer from './components/ModelViewer.vue'
</script>

<template>
  <div id="app">
    <ModelViewer />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
  background-color: #000000;
}

#app {
  width: 100% !important;
  height: 100vh !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}
</style>
