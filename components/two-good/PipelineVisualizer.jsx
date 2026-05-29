// components/two-good/PipelineVisualizer.jsx
import React from "react";

export default function PipelineVisualizer({ currentStep }) {
  // currentStep: 0 = Data Ingestion, 1 = AI Processing, 2 = Dashboard Output

  const steps = [
    {
      id: 0,
      title: "Data Pipeline",
      desc: "CSnet CRM → Excel Tracker",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
    {
      id: 1,
      title: "AI Engine",
      desc: "Gemini 2.5 Analysis",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 2,
      title: "Impact Output",
      desc: "Verified Report Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between w-full relative">
        {/* Background connecting line */}
        <div className="absolute left-[15%] right-[15%] top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0"></div>
        
        {/* Active connecting line (animated) */}
        <div 
          className="absolute left-[15%] top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-700 ease-in-out"
          style={{ width: currentStep === 0 ? "0%" : currentStep === 1 ? "35%" : "70%" }}
        ></div>

        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPast = currentStep > step.id;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
              <div 
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-[3px] shadow-sm transition-all duration-500 ease-in-out
                  ${isActive ? "bg-emerald-500 border-emerald-200 text-white shadow-emerald-500/30 scale-110" : 
                    isPast ? "bg-emerald-600 border-emerald-600 text-white" : 
                    "bg-white border-slate-200 text-slate-400"}
                `}
              >
                {step.icon}
              </div>
              <div className="mt-4 text-center">
                <div className={`text-sm font-bold transition-colors duration-300 ${isActive ? "text-slate-900" : isPast ? "text-slate-700" : "text-slate-500"}`}>
                  {step.title}
                </div>
                <div className={`text-[11px] mt-0.5 transition-colors duration-300 ${isActive ? "text-slate-600" : "text-slate-400"}`}>
                  {step.desc}
                </div>
              </div>
              {isActive && (
                <div className="absolute -bottom-8 w-1 h-1 rounded-full bg-emerald-500 animate-ping"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
