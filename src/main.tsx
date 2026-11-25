// Latin subsets only: they are precached for offline use, so every byte counts.
import '@fontsource/vt323/latin-400.css'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import './styles/app.css'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { RenderOnly } from './app/RenderOnly'

const m = location.hash.match(/^#\/render\/([\w-]+)/)
createRoot(document.getElementById('root')!).render(m ? <RenderOnly id={m[1]} /> : <App />)

if ('serviceWorker' in navigator && import.meta.env.PROD && !m) {
  const register = () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => console.warn('Offline mode unavailable:', e))
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}
