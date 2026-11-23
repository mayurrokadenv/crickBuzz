import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import './index.css'
import App from './App.tsx'
import { startRacquetMatchSync } from './services/racquetMatchService'

// Badminton / Pickleball scores come from the server; keep them in sync on every screen.
startRacquetMatchSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
