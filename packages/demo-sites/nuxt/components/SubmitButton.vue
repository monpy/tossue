<script setup lang="ts">
defineProps<{
  label: string;
  variant?: "primary" | "secondary" | "danger";
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    :class="['submit-button', `submit-button--${variant || 'primary'}`]"
    @click="emit('click')"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.submit-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.submit-button--primary {
  background: #0066cc;
  color: white;
}

.submit-button--primary:hover {
  background: #0052a3;
}

.submit-button--secondary {
  background: #e0e0e0;
  color: #333;
}

.submit-button--secondary:hover {
  background: #d0d0d0;
}

.submit-button--danger {
  background: #cc3300;
  color: white;
}

.submit-button--danger:hover {
  background: #a32900;
}
</style>
