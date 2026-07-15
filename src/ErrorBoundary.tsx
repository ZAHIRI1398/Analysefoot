import { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  info: string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info: info.componentStack ?? null })
    console.error('Uncaught error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
          <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 shadow-xl shadow-red-950/20">
            <h1 className="text-3xl font-black text-red-300">Erreur d’exécution</h1>
            <p className="mt-4 text-sm text-slate-200">Un problème empêche l’interface de s’afficher. Voici le message d’erreur :</p>
            <pre className="mt-4 rounded-xl bg-slate-950/80 p-4 text-sm text-white overflow-auto">{this.state.error.message}</pre>
            <details className="mt-4 rounded-xl bg-slate-950/80 p-4 text-sm text-slate-200">
              <summary className="cursor-pointer font-semibold">Détails du composant</summary>
              <pre className="mt-2 whitespace-pre-wrap">{this.state.info}</pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
