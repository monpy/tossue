<script setup lang="ts">
defineProps<{
  name: string;
}>();
</script>

<template>
  <div class="nested-component">
    <div class="component-label">{{ name }}</div>
    <div v-if="$slots.default" class="children">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.nested-component {
  border: 2px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  margin: 0.5rem 0;
  background: #fafafa;
}

.component-label {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.children {
  padding-left: 1rem;
  border-left: 2px solid #0066cc;
}
</style>
