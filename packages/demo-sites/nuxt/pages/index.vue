<script setup lang="ts">
import { ref } from "vue";

const networkStatus = ref("");
const consoleStatus = ref("");
const counter = ref(0);
const formName = ref("");
const formEmail = ref("");
const formSubmitted = ref(false);

function handleFormSubmit() {
  formSubmitted.value = true;
  setTimeout(() => {
    formSubmitted.value = false;
  }, 2000);
}

function clearForm() {
  formName.value = "";
  formEmail.value = "";
}

async function triggerNetworkError() {
  networkStatus.value = "Loading...";
  try {
    const response = await fetch("/api/error-endpoint");
    if (!response.ok) {
      networkStatus.value = `Error: ${response.status} ${response.statusText}`;
    }
  } catch (error) {
    networkStatus.value = `Fetch failed: ${error}`;
  }
}

async function triggerNotFound() {
  networkStatus.value = "Loading...";
  try {
    const response = await fetch("/api/not-found-page");
    networkStatus.value = `Status: ${response.status}`;
  } catch (error) {
    networkStatus.value = `Fetch failed: ${error}`;
  }
}

function triggerConsoleError() {
  console.error("This is a test console.error message from Tossue Demo");
  consoleStatus.value = "Console error logged!";
}

function triggerConsoleWarn() {
  console.warn("This is a test console.warn message from Tossue Demo");
  consoleStatus.value = "Console warning logged!";
}

function triggerRuntimeException() {
  consoleStatus.value = "Throwing exception...";
  throw new Error("Uncaught runtime exception from Tossue Demo!");
}

function incrementCounter() {
  counter.value++;
}
</script>

<template>
  <div class="container">
    <header>
      <h1>Tossue Demo Site</h1>
      <p>拡張機能の DevTools Bridge をテストするためのデモサイト</p>
    </header>

    <main>
      <section class="card">
        <h2>Network Errors</h2>
        <p>DevTools で Tossue タブを開いた状態でボタンをクリックすると、Network エラーがキャプチャされます。</p>
        <div class="button-group">
          <button @click="triggerNetworkError">Trigger 500 Error</button>
          <button @click="triggerNotFound">Trigger 404 Error</button>
        </div>
        <p v-if="networkStatus" class="status">{{ networkStatus }}</p>
      </section>

      <section class="card">
        <h2>Console Errors</h2>
        <p>DevTools で「Attach Debugger」した状態でボタンをクリックすると、Console エラーがキャプチャされます。</p>
        <div class="button-group">
          <button @click="triggerConsoleError">Trigger console.error</button>
          <button @click="triggerConsoleWarn">Trigger console.warn</button>
          <button @click="triggerRuntimeException" class="danger">
            Throw Exception
          </button>
        </div>
        <p v-if="consoleStatus" class="status">{{ consoleStatus }}</p>
      </section>

      <section class="card">
        <h2>Vue Component Tracking</h2>
        <p>Vue コンポーネントの状態変更をトラッキングするテスト</p>
        <div class="counter-demo">
          <CounterDisplay :count="counter" />
          <button @click="incrementCounter">Increment ({{ counter }})</button>
        </div>
      </section>

      <section class="card">
        <h2>Nested Components</h2>
        <NestedComponent name="Parent">
          <NestedComponent name="Child-1" />
          <NestedComponent name="Child-2">
            <NestedComponent name="Grandchild" />
          </NestedComponent>
        </NestedComponent>
      </section>

      <DemoCard title="Form Components Test">
        <p>フォームコンポーネントのテスト（コンポーネント名の検出確認用）</p>
        <div class="form-demo">
          <FormInput
            v-model="formName"
            label="Name"
            placeholder="Enter your name"
          />
          <FormInput
            v-model="formEmail"
            label="Email"
            placeholder="Enter your email"
          />
          <div class="button-group">
            <SubmitButton label="Submit" @click="handleFormSubmit" />
            <SubmitButton label="Cancel" variant="secondary" @click="clearForm" />
          </div>
          <p v-if="formSubmitted" class="status">Form submitted!</p>
        </div>
      </DemoCard>
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  margin: 0;
  color: #333;
}

header p {
  color: #666;
  margin-top: 0.5rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin-top: 0;
  color: #333;
  font-size: 1.25rem;
}

.card p {
  color: #666;
  line-height: 1.5;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #0066cc;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
}

button:hover {
  background: #0052a3;
}

button.danger {
  background: #cc3300;
}

button.danger:hover {
  background: #a32900;
}

.status {
  margin-top: 1rem;
  padding: 0.5rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.875rem;
}

.counter-demo {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
