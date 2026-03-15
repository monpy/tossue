<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="demo-card">
    <h2 class="demo-card-title">{{ title }}</h2>
    <div class="demo-card-content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.demo-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.demo-card-title {
  margin-top: 0;
  color: #333;
  font-size: 1.25rem;
}

.demo-card-content {
  color: #666;
  line-height: 1.5;
}
</style>
