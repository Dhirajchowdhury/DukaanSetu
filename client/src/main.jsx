import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.onerror = function (msg, url, line, col, error) {
  console.error("GLOBAL ERROR caught in window.onerror:", error || msg);
};

window.onunhandledrejection = function (event) {
  console.error("UNHANDLED REJECTION caught in window.onunhandledrejection:", event.reason);
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Return hasError: false during debug to bypass the boundary and let real runtime errors crash/surface.
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#EF4444', fontFamily: 'sans-serif', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8 }}>
          <h2>Something went wrong in the component tree.</h2>
          <p>Please check the developer console for the full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error("ROOT CRASH:", e);
}

