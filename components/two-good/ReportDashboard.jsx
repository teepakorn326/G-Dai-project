"use client";

import { useState, useRef } from "react";
import ReportSummary from "./ReportSummary.jsx";

export default function ReportDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [files, setFiles] = useState([]);
  
  const [parsingFile, setParsingFile] = useState(false);
  const [parsedClients, setParsedClients] = useState(null);
  const [parseError, setParseError] = useState(null);
  
  const [downloading, setDownloading] = useState(false);
  
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    
    if (selectedFiles.length > 5) {
      setParseError("Maximum of 5 files can be uploaded at once.");
      return;
    }
    
    setFiles(selectedFiles);
    setParsedClients(null);
    setParseError(null);
    setParsingFile(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append("files", f));
      
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to parse files.");
      
      setParsedClients(data.clients);
    } catch (err) {
      setParseError(err.message || "Failed to read Excel files.");
    } finally {
      setParsingFile(false);
    }
  }

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      let res;
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append("problem", "two-good");
        formData.append("input", "Q3 2026");
        files.forEach(f => formData.append("files", f));

        res = await fetch("/api/generate", {
          method: "POST",
          body: formData
        });
      } else {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problem: "two-good", input: "Q3 2026" })
        });
      }

      const body = await res.json();
      if (!res.ok || body.error) throw new Error(body.error || "Request failed");
      
      setReport(body);
    } catch (err) {
      setError(err?.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadExcel() {
    if (!report || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: report.result.raw.clients, generatedAt: new Date().toLocaleString() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate Excel file.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `TwoGood_Impact_Tracker.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const step = report ? 4 : (parsedClients ? 2 : 1);

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md min-h-screen flex flex-col md:flex-row overflow-x-hidden">
      
      {/* Top Navigation Bar (Mobile / Global) */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface dark:bg-on-surface border-b border-outline-variant dark:border-on-surface-variant md:hidden">
        <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">Two Good</div>
        <div className="flex items-center gap-unit-4">
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim">help</span>
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim">account_circle</span>
        </div>
      </header>

      {/* Side Navigation (Desktop) */}
      <aside className="fixed left-0 top-0 h-full w-64 flex-col py-unit-8 z-40 bg-surface-container-low dark:bg-tertiary-container border-r border-outline-variant dark:border-on-surface-variant hidden md:flex">
        <div className="px-unit-8 mb-unit-12">
          <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">Two Good</h1>
          <p className="text-secondary font-label-md text-label-md">Data Import V1.0.4</p>
        </div>
        <nav className="flex-1 px-unit-4 space-y-unit-2">
          <div className={`flex items-center gap-unit-4 px-unit-4 py-unit-2 rounded-lg transition-transform duration-150 ${step === 1 ? 'bg-primary text-on-primary dark:bg-primary-fixed-dim dark:text-on-primary-fixed scale-95' : 'text-secondary dark:text-on-secondary-container hover:bg-surface-container-highest cursor-pointer'}`}>
            <span className="material-symbols-outlined">upload_file</span>
            <span className="font-label-md text-label-md">Upload</span>
          </div>
          <div className={`flex items-center gap-unit-4 px-unit-4 py-unit-2 rounded-lg transition-transform duration-150 ${step === 2 || step === 3 ? 'bg-primary text-on-primary dark:bg-primary-fixed-dim dark:text-on-primary-fixed scale-95' : 'text-secondary dark:text-on-secondary-container hover:bg-surface-container-highest cursor-pointer'}`}>
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-label-md text-label-md">Review</span>
          </div>
          <div className={`flex items-center gap-unit-4 px-unit-4 py-unit-2 rounded-lg transition-transform duration-150 ${step === 4 ? 'bg-primary text-on-primary dark:bg-primary-fixed-dim dark:text-on-primary-fixed scale-95' : 'text-secondary dark:text-on-secondary-container hover:bg-surface-container-highest cursor-pointer'}`}>
            <span className="material-symbols-outlined">download</span>
            <span className="font-label-md text-label-md">Download</span>
          </div>
        </nav>
        <div className="px-unit-4 mt-auto pt-unit-8 space-y-unit-2">
          <div className="flex items-center gap-unit-4 text-secondary px-unit-4 py-unit-2 hover:bg-surface-container-highest cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-margin-mobile md:px-gutter py-unit-8 md:py-unit-12">
          
          {/* Progress Stepper */}
          <div className="mb-unit-12">
            <div className="flex items-center justify-between w-full relative">
              <div className="absolute top-4 left-0 w-full h-[2px] bg-outline-variant -z-10"></div>
              
              <div className="flex flex-col items-center gap-unit-2 bg-background pr-unit-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 1 ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant bg-surface text-secondary'}`}>
                  {step > 1 ? <span className="material-symbols-outlined text-[18px]">check</span> : "1"}
                </div>
                <span className={`font-label-md text-label-md ${step >= 1 ? 'text-primary' : 'text-secondary'}`}>Upload</span>
              </div>
              
              <div className="flex flex-col items-center gap-unit-2 bg-background px-unit-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 2 ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant bg-surface text-secondary'}`}>
                  {step > 2 ? <span className="material-symbols-outlined text-[18px]">check</span> : "2"}
                </div>
                <span className={`font-label-md text-label-md ${step >= 2 ? 'text-primary' : 'text-secondary'}`}>Review</span>
              </div>
              
              <div className="flex flex-col items-center gap-unit-2 bg-background px-unit-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 3 ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant bg-surface text-secondary'}`}>
                  {step > 3 ? <span className="material-symbols-outlined text-[18px]">check</span> : "3"}
                </div>
                <span className={`font-label-md text-label-md ${step >= 3 ? 'text-primary' : 'text-secondary'}`}>Confirm</span>
              </div>
              
              <div className="flex flex-col items-center gap-unit-2 bg-background pl-unit-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 4 ? 'border-emerald-success bg-emerald-success text-on-primary' : 'border-outline-variant bg-surface text-secondary'}`}>
                  4
                </div>
                <span className={`font-label-md text-label-md ${step >= 4 ? 'text-primary' : 'text-secondary'}`}>Download</span>
              </div>
            </div>
          </div>

          {/* View Router */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="mb-unit-8">
                <h2 className="font-headline-lg text-headline-lg mb-unit-2">Upload CS.Net export</h2>
                <p className="font-body-lg text-body-lg text-secondary">Export your data from CS.Net as a CSV, then upload it here. Gemini will automatically map all fields to the PWI tracker template.</p>
              </section>

              <div className="bg-white border border-outline-variant rounded-xl p-unit-8 mb-unit-6 custom-shadow">
                <div 
                  className="file-drop-zone rounded-lg flex flex-col items-center justify-center py-unit-12 px-unit-8 cursor-pointer hover:bg-surface-container-low transition-colors duration-200 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".csv,.xlsx" 
                    multiple
                  />
                  <div className="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center mb-unit-4 group-hover:bg-primary-container transition-colors">
                    <span className="material-symbols-outlined text-4xl text-secondary group-hover:text-primary">upload</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md mb-unit-1">Drop your CS.Net CSV here</h3>
                  <p className="font-body-md text-body-md text-secondary">
                    or <span className="text-primary font-bold underline decoration-1 underline-offset-4">browse to upload</span>
                  </p>
                  <div className="mt-unit-6 px-unit-4 py-unit-1 bg-surface-container-low rounded-full flex items-center gap-unit-2">
                    <span className="material-symbols-outlined text-sm text-secondary">description</span>
                    <span className="font-label-md text-label-md text-secondary">.csv · CS.Net export only</span>
                  </div>
                </div>
              </div>

              {parsingFile && (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              {parseError && (
                <div className="bg-error-container text-error p-4 rounded-lg text-sm mb-4 border border-outline-variant font-bold">
                  {parseError}
                </div>
              )}

              {/* Demo Override Button */}
              {!parsingFile && files.length === 0 && (
                <div className="flex justify-end pt-unit-6">
                  <button 
                    onClick={() => {
                       // Trigger demo state by fetching fallback API
                       handleGenerate();
                    }}
                    disabled={loading}
                    className="flex items-center justify-center gap-unit-2 px-unit-8 py-unit-3 bg-surface border border-outline-variant text-primary rounded-lg hover:bg-surface-container-low transition-all active:scale-95 font-label-md text-label-md"
                  >
                    <span className="material-symbols-outlined text-lg">bolt</span>
                    Use Demo Dataset
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && parsedClients && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="mb-unit-8">
                <h1 className="font-headline-lg text-headline-lg mb-unit-2">Review mapped data</h1>
                <p className="font-body-md text-body-md text-secondary">Gemini has mapped {parsedClients.length} records from your CS.Net export. Review below before generating the Excel file.</p>
              </section>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-unit-4 mb-unit-8">
                <div className="bg-surface-container-low border border-outline-variant p-unit-6 rounded-lg">
                  <p className="font-label-md text-label-md text-secondary mb-unit-2">Total records</p>
                  <p className="font-display text-display text-primary leading-tight">{parsedClients.length}</p>
                </div>
                <div className="bg-surface-container-low border border-outline-variant p-unit-6 rounded-lg">
                  <p className="font-label-md text-label-md text-secondary mb-unit-2">Ready</p>
                  <p className="font-display text-display text-emerald-success leading-tight">{parsedClients.length}</p>
                </div>
              </div>

              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden custom-shadow mb-unit-8">
                <div className="overflow-x-auto no-scrollbar max-h-[400px]">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                      <tr>
                        {Object.keys(parsedClients[0] || {}).slice(0, 8).map(key => (
                          <th key={key} className="px-unit-4 py-unit-3 font-label-md text-label-md text-secondary uppercase tracking-wider whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-table-data text-table-data">
                      {parsedClients.map((client, i) => (
                        <tr key={i} className="hover:bg-surface-container transition-colors">
                          {Object.values(client).slice(0, 8).map((val, j) => {
                            let displayVal = val;
                            if (val && typeof val === 'object') {
                              displayVal = "Data Included";
                            } else if (val === null || val === "") {
                              displayVal = <span className="text-outline">—</span>;
                            } else {
                              displayVal = String(val);
                            }
                            return (
                              <td key={j} className="px-unit-4 py-unit-3 whitespace-nowrap text-primary">
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="mt-unit-12 flex flex-col md:flex-row justify-end items-center gap-unit-4 mb-unit-12">
                <button 
                  onClick={() => { setFiles([]); setParsedClients(null); }}
                  className="w-full md:w-auto flex items-center justify-center gap-unit-2 px-unit-8 py-unit-4 border border-outline-variant text-primary font-body-md text-body-md font-bold rounded-lg hover:bg-surface-container transition-colors active:scale-95 duration-150"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Re-upload
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full md:w-auto flex items-center justify-center gap-unit-2 px-unit-8 py-unit-4 bg-primary text-on-primary font-body-md text-body-md font-bold rounded-lg hover:opacity-90 transition-all active:scale-95 duration-150 custom-shadow disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <span className="material-symbols-outlined">check_circle</span>
                  )}
                  {loading ? "Processing via Gemini..." : "Confirm and generate Excel"}
                </button>
              </footer>
            </div>
          )}

          {step === 4 && report && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-unit-12 flex flex-col items-center text-center gap-unit-8 custom-shadow min-h-[500px] justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-emerald-success/10 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-[48px] text-emerald-success" style={{ fontVariationSettings: "'FILL' 0" }}>check_circle</span>
                  </div>
                </div>
                
                <div className="space-y-unit-2 z-10">
                  <h1 className="font-headline-lg text-headline-lg text-primary">Excel file ready</h1>
                  <p className="font-body-lg text-body-lg text-secondary max-w-md mx-auto">
                    {report.result.raw.totalClients} records mapped successfully across {report.result.computedMetrics.totalDatapoints} data points. 
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-unit-4 justify-center z-10">
                  <button 
                    onClick={handleDownloadExcel}
                    disabled={downloading}
                    className="bg-emerald-success text-on-primary px-unit-8 py-unit-4 rounded-lg font-headline-md flex items-center gap-unit-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-75"
                  >
                    <span className="material-symbols-outlined">download</span>
                    {downloading ? "Downloading..." : "Download PWI_Tracker.xlsx"}
                  </button>
                  <button 
                    onClick={() => { setReport(null); setFiles([]); setParsedClients(null); }}
                    className="border border-outline-variant bg-surface hover:bg-surface-container-low text-primary px-unit-8 py-unit-4 rounded-lg font-headline-md flex items-center gap-unit-2 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Start New Import
                  </button>
                </div>
                
                <div className="w-full mt-unit-8 border border-outline-variant bg-surface rounded-lg p-unit-4 flex items-center justify-center gap-unit-4 z-10">
                  <span className="w-2 h-2 rounded-full bg-emerald-success"></span>
                  <p className="font-label-md text-label-md text-secondary tracking-wide flex items-center gap-2">
                    Import logged <span className="opacity-40">•</span> Gemini Engine <span className="opacity-40">•</span> Generated {new Date().toLocaleString()}
                  </p>
                </div>
              </section>

              {/* Dashboard review summary */}
              <ReportSummary report={report} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
