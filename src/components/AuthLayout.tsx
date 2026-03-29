import { motion } from 'motion/react';
import logo from '../assets/matchlogo.png';
import stockImage from '../assets/onboardingstock.jpg';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  heroImage?: string;
  progress?: { current: number; total: number };
}

export default function AuthLayout({ 
  children, 
  title = "Welcome to MatchChayn", 
  subtitle = "Match with those who vibe on your frequency on chain.",
  heroImage = stockImage,
  progress
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#090a1e] overflow-hidden">
      {/* Left Visual Section */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#090a1e]">
        <div className="absolute inset-0 bg-transparent z-10"></div>
        <img 
          src={heroImage} 
          className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] object-cover rounded-2xl shadow-2xl" 
          alt="Hero" 
          referrerPolicy="no-referrer"
        />
        
        <div className="relative z-20 h-full flex items-end p-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="premium-glass-card p-10 max-w-md border-white/5 bg-[#12122b]/40"
          >
            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight leading-tight">
              Relax. Connect. Match.
            </h3>
            <p className="text-gray-400 text-lg font-medium italic leading-relaxed">
              "Find meaningful connections and intentional love with Web3 professionals."
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 h-screen flex flex-col bg-[#090a1e] relative z-30">
        {/* Fixed Header: Logo & Progress */}
        <div className="w-full max-w-md mx-auto px-8 pt-8 sm:pt-12 shrink-0">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
            <img src={logo} alt="MatchChayn Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">MatchChayn</span>
          </div>

          {/* Progress Bar (if provided) */}
          {progress && (
            <div className="flex justify-center gap-1 sm:gap-2 mb-0 w-full">
              {Array.from({ length: progress.total }).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < progress.current 
                      ? 'bg-purple-500' 
                      : 'bg-white/10'
                  }`} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-12">
          <div className="w-full max-w-md mx-auto pt-8 sm:pt-10 space-y-6 sm:space-y-8 animate-fade-in-up">
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {title && (
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
                    {subtitle && (
                      <p className="text-gray-400 text-sm font-medium px-4 leading-relaxed">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
