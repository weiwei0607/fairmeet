import { Component } from 'react';

// 任何一個子元件炸掉（例如 Leaflet 地圖初始化異常），不要讓整頁變白，
// 至少留一個可以重新整理的畫面。
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('FairMeet crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>發生了一點問題</div>
          <div style={{ fontSize: 14, color: '#666', maxWidth: 320 }}>
            這個頁面暫時無法顯示，重新整理應該就能恢復。
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8, border: 'none',
              background: '#ef6b43', color: '#fff', fontWeight: 600, cursor: 'pointer',
            }}
          >
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
