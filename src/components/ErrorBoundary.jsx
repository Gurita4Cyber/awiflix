import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CloudStream Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#f87171', background: '#0e0f14', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '12px' }}>
            ⚠️ AwiFlix Terjadi Kesalahan:
          </h2>
          <div style={{ background: '#1e1e24', padding: '16px', borderRadius: '12px', border: '1px solid #3f3f46', marginBottom: '16px' }}>
            <p style={{ color: '#ffffff', fontWeight: 'bold' }}>{String(this.state.error?.message || this.state.error)}</p>
            <pre style={{ color: '#a1a1aa', fontSize: '12px', marginTop: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.stack}
            </pre>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Reset Cache & Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
