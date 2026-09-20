import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowRight, TrendingDown, Target, AlertTriangle, ShieldCheck } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Money } from '@/components/ui/money';

const CATEGORY_IMAGES = {
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop",
  transportation: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop",
  entertainment: "https://images.unsplash.com/photo-1470229722913-7c090be5c5b4?q=80&w=1000&auto=format&fit=crop",
  shopping: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop",
  utilities: "https://images.unsplash.com/photo-1517502474251-f7615cb0b9c3?q=80&w=1000&auto=format&fit=crop",
  rent: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop",
  education: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1000&auto=format&fit=crop",
  healthcare: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=1000&auto=format&fit=crop",
  groceries: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
  travel: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1000&auto=format&fit=crop"
};

const OVERVIEW_IMAGE = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"; // Abstract liquid
const BEHAVIOR_IMAGE = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"; // Neon Data
const VICTORY_IMAGE = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop"; // Celebration/Group

function calculateWeekStats(transactions) {
  const now = new Date();
  const last7Days = transactions.filter(t => differenceInDays(now, new Date(t.date)) <= 7);

  let spent = 0;
  let earned = 0;
  const categories = {};

  last7Days.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'expense') {
      spent += amount;
      categories[t.category] = (categories[t.category] || 0) + amount;
    } else if (t.type === 'income') {
      earned += amount;
    }
  });

  let topCategory = 'None';
  let topAmount = 0;
  for (const [cat, amt] of Object.entries(categories)) {
    if (amt > topAmount) {
      topCategory = cat;
      topAmount = amt;
    }
  }

  return { spent, earned, topCategory, topAmount, count: last7Days.length };
}

export default function WeeklySummaryStory({ recentTransactions = [], behavioralMeter, shortTermGoals = [], longTermGoals = [], aiPersonality = 'polite' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const stats = calculateWeekStats(recentTransactions);
  const impulseRisk = behavioralMeter?.indicators?.find(i => i.label === 'Impulse Risk')?.value || 'Low';
  
  const topCatImage = CATEGORY_IMAGES[stats.topCategory] || CATEGORY_IMAGES.default;
  const LONG_TERM_IMAGE = "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1000&auto=format&fit=crop"; // Mountains
  const INVESTMENT_IMAGE = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000&auto=format&fit=crop"; // Chart
  
  const investmentTransactions = recentTransactions.filter(t => t.category === 'investment' || t.category === 'investment_return');
  const totalInvested = investmentTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const slides = [];

  slides.push({
      id: 'overview',
      bgImage: OVERVIEW_IMAGE,
      overlay: 'bg-black/60',
      content: (
        <div className="flex flex-col h-full w-full justify-end pb-12 sm:pb-20 px-6 max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tighter mb-3">
              {aiPersonality === 'roast' ? 'Time to Face the Music' : 'Your Week\nin Review'}
            </h2>
            <p className="text-xl text-white/80 font-medium tracking-tight">
              {aiPersonality === 'roast' ? 'The numbers don\'t lie, but you might.' : 'The numbers are in.'}
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-8 border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20"><TrendingDown className="w-24 h-24 text-white" /></div>
            <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-3 block relative z-10">Total Outflow</span>
            <span className="text-[2.75rem] font-black text-white tracking-tighter leading-none block relative z-10">
              <Money>₹{stats.spent.toLocaleString()}</Money>
            </span>
            <div className="mt-6 flex items-center gap-3 relative z-10">
              <div className="h-px bg-white/20 flex-1"></div>
              <span className="text-sm font-bold text-white/80">{stats.count} transactions</span>
              <div className="h-px bg-white/20 flex-1"></div>
            </div>
          </div>
        </div>
      )
  });

  slides.push({
      id: 'habits',
      bgImage: topCatImage,
      overlay: 'bg-gradient-to-t from-black via-black/80 to-black/20',
      content: (
        <div className="flex flex-col h-full w-full justify-end pb-12 sm:pb-20 px-6 max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tighter mb-3">
              {aiPersonality === 'roast' ? 'Bleeding Money' : 'Where Did\nIt Go?'}
            </h2>
            <p className="text-xl text-white/80 font-medium tracking-tight">
              {aiPersonality === 'roast' ? `You blew it all on ${stats.topCategory.replace('_', ' ')}.` : 'Your biggest slice of the pie.'}
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-8 border border-white/20 shadow-2xl">
            <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-1 block">Top Category</span>
            <div className="text-3xl font-black text-white capitalize mb-4">{stats.topCategory.replace('_', ' ')}</div>
            
            <div className="bg-black/40 rounded-2xl p-5 border border-white/10">
              <span className="text-sm font-bold text-white/60 uppercase tracking-widest block mb-1">Spent</span>
              <span className="text-3xl font-bold text-rose-400"><Money>₹{stats.topAmount.toLocaleString()}</Money></span>
            </div>
          </div>
        </div>
      )
  });

  slides.push({
      id: 'behavior',
      bgImage: BEHAVIOR_IMAGE,
      overlay: impulseRisk === 'High' ? 'bg-rose-950/80 mix-blend-multiply' : 'bg-emerald-950/80 mix-blend-multiply',
      content: (
        <div className="flex flex-col h-full w-full justify-end pb-12 sm:pb-20 px-6 max-w-md mx-auto relative z-10">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tighter mb-3">Reality<br/>Check</h2>
            <p className="text-xl text-white/80 font-medium tracking-tight">Your financial habits analyzed.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-8 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              {impulseRisk === 'High' ? (
                <div className="p-3 bg-rose-500/20 rounded-full border border-rose-500/50">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/20 rounded-full border border-emerald-500/50">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] block">Impulse Risk</span>
                <span className={`text-2xl font-black ${impulseRisk === 'High' ? 'text-rose-400' : 'text-emerald-400'}`}>{impulseRisk}</span>
              </div>
            </div>
            
            <p className="text-lg text-white/90 font-medium leading-relaxed">
              {aiPersonality === 'roast' 
                ? (impulseRisk === 'High' ? "You have zero self-control. Stop buying junk you don't need." : "Miraculously, you didn't buy stupid stuff this week. Don't get comfortable.")
                : (impulseRisk === 'High' ? "You've been spending heavily on non-essentials. Try the 24-hour rule before your next big purchase." : "You're showing great discipline this week. Your impulse spending is well under control.")}
            </p>
          </div>
        </div>
      )
  });

  if (longTermGoals && longTermGoals.length > 0) {
    slides.push({
      id: 'long-term',
      bgImage: LONG_TERM_IMAGE,
      overlay: 'bg-indigo-950/70 mix-blend-multiply',
      content: (
        <div className="flex flex-col h-full w-full justify-end pb-12 sm:pb-20 px-6 max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tighter mb-3">The Long<br/>Game</h2>
            <p className="text-xl text-white/80 font-medium tracking-tight">Focusing on your future.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-8 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/30">
                <Target className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <span className="text-4xl font-black text-white">{longTermGoals.length}</span>
                <span className="text-sm font-bold text-white/60 uppercase tracking-widest block mt-1">Big Dreams</span>
              </div>
            </div>
            <p className="text-lg font-medium text-white/90 leading-relaxed">
              Every small step you take today is moving you closer to those massive life goals. Keep building that foundation!
            </p>
          </div>
        </div>
      )
    });
  }

  if (totalInvested > 0) {
    slides.push({
      id: 'investments',
      bgImage: INVESTMENT_IMAGE,
      overlay: 'bg-emerald-950/80 mix-blend-multiply',
      content: (
        <div className="flex flex-col h-full w-full justify-end pb-12 sm:pb-20 px-6 max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tighter mb-3">Wealth<br/>Builder</h2>
            <p className="text-xl text-white/80 font-medium tracking-tight">Paying your future self.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-8 border border-white/20 shadow-2xl">
            <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-3 block">Total Invested This Week</span>
            <span className="text-[2.75rem] font-black text-emerald-400 tracking-tighter leading-none block">
              <Money>₹{totalInvested.toLocaleString()}</Money>
            </span>
            <p className="text-lg font-medium text-white/90 leading-relaxed mt-6">
              You are actively compounding your wealth! Fantastic job prioritizing investments over immediate consumption.
            </p>
          </div>
        </div>
      )
    });
  }

  slides.push({
      id: 'verdict',
      bgImage: VICTORY_IMAGE,
      overlay: 'bg-gradient-to-tr from-blue-900/90 via-black/80 to-black/60',
      content: (
        <div className="flex flex-col h-full w-full justify-end pb-12 sm:pb-20 px-6 max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tighter mb-3">The<br/>Verdict</h2>
            <p className="text-xl text-white/80 font-medium tracking-tight">Ready for next week?</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-8 border border-white/20 shadow-2xl mb-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
              <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/30">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <span className="text-4xl font-black text-white">{shortTermGoals.length}</span>
                <span className="text-sm font-bold text-white/60 uppercase tracking-widest block mt-1">Active Goals</span>
              </div>
            </div>
            <p className="text-lg font-medium text-white/90 leading-relaxed italic">
              {aiPersonality === 'roast'
                ? (stats.spent > stats.earned && stats.earned > 0 ? "You spent more than you earned. At this rate, you'll be broke by next month. Get it together." : "You actually saved money. I'm genuinely shocked. Keep it up so you don't end up on my bad side again.")
                : (stats.spent > stats.earned && stats.earned > 0 ? "You spent more than you earned this week. Time to tighten the belt!" : "A solid week of financial discipline. You are moving closer to your dreams.")}
            </p>
          </div>
          
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full py-5 rounded-[24px] bg-white text-black text-lg font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-transform pointer-events-auto flex items-center justify-center gap-2 cursor-pointer shadow-xl"
          >
            Finish Story <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )
    });

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
      else setIsOpen(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [currentSlide, isOpen, slides.length]);

  if (!isOpen) {
    return (
      <div 
        className="relative group cursor-pointer shrink-0" 
        onClick={() => {
          setCurrentSlide(0);
          setIsOpen(true);
        }}
      >
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-400 via-cyan-400 to-blue-500 blur-[3px] opacity-70 group-hover:opacity-100 group-hover:blur-[5px] transition-all duration-500 animate-pulse"></div>
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-emerald-400 via-cyan-400 to-blue-500"></div>
        <div className="relative h-11 w-11 rounded-full border-2 border-background bg-card flex flex-col items-center justify-center overflow-hidden z-10 hover:scale-[0.98] transition-transform">
          <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black select-none overflow-hidden font-sans">
      
      {/* Background Images Layer */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={slides[currentSlide].bgImage}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${slides[currentSlide].bgImage})` }}
        />
      </AnimatePresence>

      {/* Overlay Layer */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={slides[currentSlide].overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 z-10 ${slides[currentSlide].overlay}`}
        />
      </AnimatePresence>

      {/* Progress Bars Layer */}
      <div className="absolute top-0 inset-x-0 flex gap-1.5 p-4 z-50 pt-8 sm:pt-6">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden relative shadow-sm">
            {i === currentSlide && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 6, ease: 'linear' }}
                className="absolute inset-y-0 left-0 bg-white" 
              />
            )}
            {i < currentSlide && <div className="w-full h-full bg-white" />}
          </div>
        ))}
      </div>
      
      {/* Tap Zones */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-40 cursor-pointer" onClick={(e) => { e.stopPropagation(); if(currentSlide > 0) setCurrentSlide(p => p - 1); }} />
      <div className="absolute inset-y-0 right-0 w-2/3 z-40 cursor-pointer" onClick={(e) => { e.stopPropagation(); if(currentSlide < slides.length - 1) setCurrentSlide(p => p + 1); else setIsOpen(false); }} />
      
      {/* Close Button */}
      <button 
        className="absolute top-10 right-6 z-50 p-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-colors pointer-events-auto shadow-xl" 
        onClick={() => setIsOpen(false)}
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Content Layer */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide} 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, type: 'spring', bounce: 0, damping: 20 }}
            className="w-full h-full"
          >
            {slides[currentSlide].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
