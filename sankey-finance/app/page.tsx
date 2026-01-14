import SankeyEditor from "../components/SankeyEditor";

export default function Home() {
  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-left">
            <div className="app-logo-circle" />
            <div className="app-title">
              <span className="app-title-main">LumenFlow Finance</span>
              <span className="app-title-sub">
                Interactive income statement &amp; flow explorer
              </span>
            </div>
          </div>
          <div className="app-header-actions">
            <button className="btn btn-ghost" type="button">
              <span className="btn-icon">⬆</span>
              <span>Export scenario</span>
            </button>
            <button className="btn btn-ghost" type="button">
              <span className="btn-icon">⬇</span>
              <span>Import scenario</span>
            </button>
            <button className="btn btn-primary" type="button">
              <span className="btn-icon">●</span>
              <span>Snapshot</span>
            </button>
          </div>
        </header>

        <main className="app-main">
          <SankeyEditor />
        </main>
      </div>
    </div>
  );
}
