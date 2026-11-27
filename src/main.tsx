import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Nunito is bundled with the app (Latin, weights used by the design) so it works offline.
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import './index.css'
import { registerServiceWorker } from './services/pwa/registerServiceWorker'
import { requestPersistentStorage } from './services/persistence/storagePersistence'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
void requestPersistentStorage()
