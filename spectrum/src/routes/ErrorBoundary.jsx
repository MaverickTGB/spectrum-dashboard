import React from "react";

/* ————————————————————————————————————————————————————————————————
   ErrorBoundary — catches render errors in child tab content so one bad
   tab shows a fallback instead of white-screening the whole app.

   • Colors are inlined (mirror the Spectrum design tokens) so this file is
     fully self-contained — no shared import from Executive.jsx.
   • The ed-card / ed-ui / ed-display classes come from the global <style>
     block already injected in Executive.jsx, so they apply here for free.

   HIPAA note: technical detail is logged to the browser CONSOLE ONLY. It is
   never rendered to the partner-facing UI, and it is never shipped to a
   remote error-reporting service (Sentry etc.) — that would need a BAA and
   could carry data-adjacent strings off the client. Keep it console-only.
———————————————————————————————————————————————————————————————— */

const C = {
  panel: "#FFFFFF", ink: "#132A2E", inkSoft: "#5C7276",
  teal: "#0E7C86", alert: "#C4452A", hairline: "#DCE7E9",
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Console-only by design. Do NOT wire to remote logging without a BAA.
    console.error(
      "[ErrorBoundary]",
      this.props.label || "tab",
      error,
      info?.componentStack
    );
  }

  componentDidUpdate(prevProps) {
    // Auto-recover on navigation: when resetKey (e.g. the active tab) changes,
    // clear the error so the newly selected tab renders normally.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  handleRetry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="ed-card ed-ui"
        style={{ padding: 28, borderLeft: `4px solid ${C.alert}`, background: C.panel }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.alert, fontWeight: 600, marginBottom: 8 }}>
          Section unavailable
        </div>
        <div className="ed-display" style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
          {this.props.label ? `The ${this.props.label} section couldn’t load` : "This section couldn’t load"}
        </div>
        <p style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.6, margin: "0 0 16px", maxWidth: 520 }}>
          Something went wrong rendering this view. The rest of the dashboard is
          unaffected — you can switch tabs, or try reloading this section.
        </p>
        <button
          onClick={this.handleRetry}
          className="ed-ui"
          style={{
            fontSize: 13, padding: "9px 18px", cursor: "pointer", borderRadius: 99,
            border: `1px solid ${C.teal}`, background: C.teal, color: "#FFF", fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
