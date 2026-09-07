import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

/**
 * Shim for the `window.storage` API that Claude.ai artifacts provide.
 * Locally, we just back it with the browser's own localStorage, so
 * the app persists data in your browser between page reloads.
 *
 * The "shared" flag from the original artifact API is ignored here —
 * everything just lives in this browser's localStorage, which is fine
 * for running the prototype on one machine.
 */
window.storage = {
  async get(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) throw new Error(`Key not found: ${key}`);
    return { key, value: raw, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix = "") {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    return { keys, prefix, shared: false };
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
