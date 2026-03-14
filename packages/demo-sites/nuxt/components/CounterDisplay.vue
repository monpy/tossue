<script setup lang="ts">
defineProps<{
  count: number;
}>();
</script>

<template>
  <div class="counter-display">
    <span class="label">Count:</span>
    <span class="value">{{ count }}</span>
  </div>
</template>

<style scoped>
.counter-display {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #e8f4ff;
  border-radius: 4px;
}

.label {
  color: #666;
}

.value {
  font-weight: bold;
  color: #0066cc;
  font-size: 1.25rem;
}
</style>
