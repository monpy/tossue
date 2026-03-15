"use client";

import { useState } from "react";
import { FormInput, SubmitButton, Card } from "./components";

function CounterDisplay({ count }: { count: number }) {
  return (
    <div className="counter-display">
      <span className="label">Count:</span>
      <span className="value">{count}</span>
    </div>
  );
}

function NestedComponent({
  name,
  children,
}: {
  name: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="nested-component">
      <div className="component-label">{name}</div>
      {children && <div className="children">{children}</div>}
    </div>
  );
}

export default function Home() {
  const [networkStatus, setNetworkStatus] = useState("");
  const [consoleStatus, setConsoleStatus] = useState("");
  const [counter, setCounter] = useState(0);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  function handleFormSubmit() {
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 2000);
  }

  async function triggerNetworkError() {
    setNetworkStatus("Loading...");
    try {
      const response = await fetch("/api/error-endpoint");
      if (!response.ok) {
        setNetworkStatus(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setNetworkStatus(`Fetch failed: ${error}`);
    }
  }

  async function triggerNotFound() {
    setNetworkStatus("Loading...");
    try {
      const response = await fetch("/api/not-found-page");
      setNetworkStatus(`Status: ${response.status}`);
    } catch (error) {
      setNetworkStatus(`Fetch failed: ${error}`);
    }
  }

  function triggerConsoleError() {
    console.error("This is a test console.error message from Tossue Demo (Next.js)");
    setConsoleStatus("Console error logged!");
  }

  function triggerConsoleWarn() {
    console.warn("This is a test console.warn message from Tossue Demo (Next.js)");
    setConsoleStatus("Console warning logged!");
  }

  function triggerRuntimeException() {
    setConsoleStatus("Throwing exception...");
    throw new Error("Uncaught runtime exception from Tossue Demo (Next.js)!");
  }

  return (
    <div className="container">
      <header>
        <h1>Tossue Demo Site (Next.js)</h1>
        <p>拡張機能の DevTools Bridge をテストするためのデモサイト</p>
      </header>

      <main>
        <section className="card">
          <h2>Network Errors</h2>
          <p>
            DevTools で Tossue タブを開いた状態でボタンをクリックすると、Network
            エラーがキャプチャされます。
          </p>
          <div className="button-group">
            <button onClick={triggerNetworkError}>Trigger 500 Error</button>
            <button onClick={triggerNotFound}>Trigger 404 Error</button>
          </div>
          {networkStatus && <p className="status">{networkStatus}</p>}
        </section>

        <section className="card">
          <h2>Console Errors</h2>
          <p>
            DevTools で「Attach Debugger」した状態でボタンをクリックすると、Console
            エラーがキャプチャされます。
          </p>
          <div className="button-group">
            <button onClick={triggerConsoleError}>Trigger console.error</button>
            <button onClick={triggerConsoleWarn}>Trigger console.warn</button>
            <button onClick={triggerRuntimeException} className="danger">
              Throw Exception
            </button>
          </div>
          {consoleStatus && <p className="status">{consoleStatus}</p>}
        </section>

        <section className="card">
          <h2>React Component Tracking</h2>
          <p>React コンポーネントの状態変更をトラッキングするテスト</p>
          <div className="counter-demo">
            <CounterDisplay count={counter} />
            <button onClick={() => setCounter((c) => c + 1)}>
              Increment ({counter})
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Nested Components</h2>
          <NestedComponent name="Parent">
            <NestedComponent name="Child-1" />
            <NestedComponent name="Child-2">
              <NestedComponent name="Grandchild" />
            </NestedComponent>
          </NestedComponent>
        </section>

        <Card title="Form Components Test">
          <p>フォームコンポーネントのテスト（コンポーネント名の検出確認用）</p>
          <div className="form-demo">
            <FormInput
              label="Name"
              value={formName}
              onChange={setFormName}
              placeholder="Enter your name"
            />
            <FormInput
              label="Email"
              value={formEmail}
              onChange={setFormEmail}
              placeholder="Enter your email"
            />
            <div className="button-group">
              <SubmitButton label="Submit" onClick={handleFormSubmit} />
              <SubmitButton
                label="Cancel"
                onClick={() => {
                  setFormName("");
                  setFormEmail("");
                }}
                variant="secondary"
              />
            </div>
            {formSubmitted && <p className="status">Form submitted!</p>}
          </div>
        </Card>
      </main>
    </div>
  );
}
