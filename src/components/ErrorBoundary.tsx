import { Component, type ErrorInfo, type ReactNode } from 'react'
import { resetCurrentSession } from '../lib/storage'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AP Study encountered an unexpected error.', error, info)
  }

  private resetSession = () => {
    resetCurrentSession()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink dark:bg-[#101713] dark:text-white">
        <section className="w-full max-w-[440px] rounded-[24px] bg-white p-6 text-center shadow-card dark:bg-white/5">
          <h1 className="text-lg font-bold">画面の表示中にエラーが発生しました</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
            学習履歴と設定はそのまま残っています。再読み込みしても復旧しない場合は、現在の演習セッションだけリセットしてください。
          </p>
          <div className="mt-6 space-y-3">
            <button onClick={() => window.location.reload()} className="h-12 w-full rounded-xl bg-ink text-sm font-bold text-white dark:bg-lime dark:text-ink">
              再読み込み
            </button>
            <button onClick={this.resetSession} className="h-12 w-full rounded-xl border border-slate-200 text-sm font-bold dark:border-white/20">
              現在の演習セッションだけリセット
            </button>
          </div>
        </section>
      </main>
    )
  }
}
