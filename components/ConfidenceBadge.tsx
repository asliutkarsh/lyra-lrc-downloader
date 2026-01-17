import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface Props {
  score: number;
  reasons: string[];
}

const ConfidenceBadge: React.FC<Props> = ({ score, reasons }) => {
  const percentage = Math.round(score * 100);
  let colorClass = 'bg-red-500/20 text-red-400 border-red-500/50';
  
  if (percentage >= 90) colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
  else if (percentage >= 70) colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div 
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold cursor-help ${colorClass}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span>{percentage}% Match</span>
        <Info size={12} />
      </div>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-dark border border-slate-600 rounded-lg shadow-xl text-xs text-slate-200 pointer-events-none">
          <p className="font-bold mb-1 text-white">Why this score?</p>
          <ul className="list-disc pl-4 space-y-1">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-600"></div>
        </div>
      )}
    </div>
  );
};

export default ConfidenceBadge;
