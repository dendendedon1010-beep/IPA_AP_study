import React from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

const getErrorDetail = (message: string, detail?: unknown) => {
  if (detail instanceof Error) return detail.stack || detail.message
  return String(detail ?? message)
}

const showBootError = (message: string, detail?: unknown) => {
  console.error('[AP Study] Boot error:', message, detail)
  document.body.classList.add('boot-error')
  const title = document.getElementById('boot-title')
  const messageElement = document.getElementById('boot-message')
  const detailElement = document.getElementById('boot-error-detail')
  if (title) title.textContent = '読み込みに失敗しました'
  if (messageElement) {
    messageElement.textContent =
      'アプリ本体の起動中にエラーが発生しました。再読み込み、または保存データのリセットを試してください。'
  }
  if (detailElement) detailElement.textContent = getErrorDetail(message, detail)
}

window.addEventListener('error', (event) => {
  showBootError(event.message || 'Global error', event.error)
})
window.addEventListener('unhandledrejection', (event) => {
  showBootError('Unhandled promise rejection', event.reason)
})

async function bootstrap() {
  try {
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      showBootError('Root element was not found')
      return
    }

    const { default: App } = await import('./App')

    function AppBootMarker() {
      React.useEffect(() => {
        document.body.classList.add('app-mounted')
      }, [])

      return <App />
    }

    createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppBootMarker />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (error) {
    showBootError('Failed to bootstrap React app', error)
  }
}

void bootstrap()
