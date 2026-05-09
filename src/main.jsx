// Punto de entrada de la aplicación
// React toma el componente App y lo "monta" en el div#root del index.html
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
