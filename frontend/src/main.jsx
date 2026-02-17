import React from "react";
import ReactDOM from "react-dom/client";
import './index.css'
import App from './App.jsx'
import { DeckProvider } from "./state/DeckContext.jsx";



ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DeckProvider>
      <App />
    </DeckProvider>
  </React.StrictMode>
);