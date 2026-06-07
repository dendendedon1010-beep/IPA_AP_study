import { Component, type ReactNode } from 'react'
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

  private resetSession = () => {
    resetCurrentSession()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-paper px-5 text-ink">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-6 text-center shadow-card">
          <h1 className="text-lg font-bold">アプリの読み込み中に問題が発生しました</h1>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">学習履歴と設定は削除せずに復旧できます。</p>
          <button onClick={this.resetSession} className="mt-5 h-12 w-full rounded-xl bg-moss text-sm font-bold text-white">現在の演習セッションだけリセット</button>
          <button onClick={() => window.location.reload()} className="mt-3 h-12 w-full rounded-xl bg-slate-100 text-sm font-bold text-slate-600">再読み込み</button>
        </div>
      </div>
    )
  }
}
