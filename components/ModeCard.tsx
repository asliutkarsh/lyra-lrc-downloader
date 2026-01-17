import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';

interface ModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  colorClass: string;
}

const ModeCard: React.FC<ModeCardProps> = ({ title, description, icon: Icon, onClick, colorClass }) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start p-10 rounded-2xl bg-white dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-500 text-left w-full h-full hover:-translate-y-1"
    >
      <div className={`relative p-6 rounded-2xl ${colorClass} text-white mb-8 group-hover:scale-110 group-hover:shadow-2xl transition-all duration-500`}>
        <Icon size={48} strokeWidth={2} />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {title}
      </h3>

      <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-10 flex-grow">
        {description}
      </p>

      <div className="flex items-center text-base font-bold text-indigo-600 dark:text-indigo-400 gap-2 group-hover:gap-3 transition-all">
        Start Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};

export default ModeCard;