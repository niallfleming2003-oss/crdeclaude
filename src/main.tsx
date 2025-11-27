import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Database is automatically initialized when sandbox starts - just render!
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
