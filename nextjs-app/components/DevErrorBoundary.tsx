"use client"

import React from 'react'

type State = { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }

export default class DevErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('DevErrorBoundary caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, background: '#fee', color: '#600', minHeight: '100vh' }}>
          <h2 style={{ marginTop: 0 }}>Fehler beim Rendern der App</h2>
          <p><strong>Fehlermeldung:</strong> {this.state.error?.message}</p>
          {this.state.errorInfo && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      )
    }

    return this.props.children as React.ReactElement
  }
}


