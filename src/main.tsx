import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import './index.css'
import App from './App.tsx'
import { startRacquetMatchSync } from './services/racquetMatchService'

// Keep locally saved Badminton / Pickleball scores in sync across screens.
startRacquetMatchSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
