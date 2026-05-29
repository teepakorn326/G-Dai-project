import "./home.css";

export const metadata = {
  title: "Two Good | PWI Data Import",
  description: "Upload CS.Net exports, review mapped Work Work outcomes, and generate a clean PWI tracker.",
};

export default function HomePage() {
  return (
    <div className="tg-home">
      <div className="page">
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div>
                <div className="kicker mono"><span className="dot" /> Two Good PWI Data Import</div>
                <h1 className="brand-font">CHANGE<br />THE<br />COURSE<br />WITH DATA.</h1>
                <p>Upload CS.Net exports, review mapped Work Work outcomes, and generate a clean PWI tracker for impact reporting in one simple flow.</p>
                <div className="hero-actions">
                  <a className="btn secondary mono" href="/">Launch the importer →</a>
                </div>
              </div>
              <div className="mono">Built for intake → baseline → 3 months → 6 months tracking</div>
            </div>

            <div className="hero-panel">
              <div className="preview-card">
                <div className="window-bar">
                  <div className="traffic"><span /><span /><span /></div>
                  <div className="mono">Data Import V1.0.4</div>
                </div>
                <div className="screen">
                  <div className="screen-top"><div className="mini-logo">Two Good</div><div className="mono">Gemini mapping</div></div>
                  <div className="screen-body">
                    <aside className="side mono"><div>Upload</div><div>Review</div><div>Confirm</div><div>Download</div></aside>
                    <div className="main-preview">
                      <div className="stepper">
                        <span className="circle">1</span>
                        <span className="circle" style={{ background: "#e2e2e3", color: "#5d5e66" }}>2</span>
                        <span className="circle" style={{ background: "#e2e2e3", color: "#5d5e66" }}>3</span>
                        <span className="circle" style={{ background: "#e2e2e3", color: "#5d5e66" }}>4</span>
                      </div>
                      <div className="upload-box">
                        <div className="upload-icon">↑</div>
                        <strong>Drop your CS.Net CSV here</strong>
                        <span style={{ color: "var(--muted)", marginTop: "6px" }}>Auto-map client, cohort, PWI, hours and wages fields.</span>
                      </div>
                      <div className="file-row">
                        <span><strong>csnet_export_q2_2026.csv</strong><br /><small style={{ color: "var(--green)" }}>ready to process</small></span>
                        <span className="mono">43 KB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="metrics-strip">
                <div className="metric"><b>15</b><span className="mono">records mapped</span></div>
                <div className="metric"><b>0</b><span className="mono">mapping errors</span></div>
                <div className="metric"><b>4</b><span className="mono">step import flow</span></div>
              </div>
            </div>
          </section>

          <section className="impact">
            <article className="impact-card dark">
              <h2 className="brand-font">FY2025 IMPACT READY.</h2>
              <p style={{ color: "#dcdcdc", lineHeight: 1.55 }}>Connect operational records to human outcomes, so reporting shows both participation and progress.</p>
              <div className="stat-grid">
                <div className="big-stat"><b>47</b><span>women employed</span></div>
                <div className="big-stat"><b>22,629</b><span>Work Work hours</span></div>
                <div className="big-stat"><b>30,962</b><span>meals donated</span></div>
                <div className="big-stat"><b>$726k</b><span>paid in wages</span></div>
              </div>
            </article>
            <article className="impact-card">
              <div className="purple-block" />
              <div className="mono">Why this matters</div>
              <h2 className="brand-font">TRACK THE FULL JOURNEY.</h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.55, maxWidth: "560px" }}>The landing experience explains the tool before users begin: CS.Net upload, mapped review, validation, and Excel download.</p>
              <div className="journey">
                <div><b>1. Upload</b><span>CSV export from CS.Net.</span></div>
                <div><b>2. Review</b><span>Check baseline, 3mo, 6mo scores.</span></div>
                <div><b>3. Report</b><span>Download a clean PWI tracker.</span></div>
              </div>
            </article>
          </section>
        </main>

        <footer className="footer">
          <div className="footer-inner">
            <div className="brand-font" style={{ fontSize: "42px" }}>BELIEVE IN PEOPLE<br />UNTIL THEY BELIEVE AGAIN.</div>
            <a className="btn secondary mono" href="/">Start import →</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
