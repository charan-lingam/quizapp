import React, { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Users, 
  Settings, 
  Zap, 
  ChevronRight, 
  Check, 
  X, 
  RotateCcw, 
  Timer,
  Smartphone,
  Monitor
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface NetworkInfo {
  port: number;
  ips: string[];
}

interface Team {
  id: string;
  name: string;
  score: number;
  socketId: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

interface QuizState {
  teams: Record<string, Team>;
  currentRound: number;
  currentQuestionIndex: number;
  activeTeamId: string | null;
  buzzerLocked: boolean;
  buzzerWinner: string | null;
  buzzerReactionTime: number | null;
  buzzerBuzzes: { teamId: string; reactionTime: number }[];
  questionStartTime: number | null;
  rapidFireTimer: number;
  isRapidFireRunning: boolean;
  localIp: string;
  questions: {
    passRound: Question[];
    buzzerRound: Question[];
    rapidFireRound: Question[];
  };
}

// --- Components ---

const Button = ({
  children, 
  onClick, 
  variant = "primary", 
  className,
  disabled,
  ...props
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: "primary" | "secondary" | "danger" | "success" | "neon";
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}) => {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20",
    neon: "bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.4)]",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn("bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl", className)}
  >
    {children}
  </div>
);

// --- Sub-Components ---

const RoleSelect = ({ setView, state, lanUrls }: { setView: (v: any) => void; state: QuizState; lanUrls: string[] }) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 pt-20 md:pt-24 gap-8">
    {/* Institutional Headers */}
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-6">
      <div className="text-xl sm:text-2xl font-black text-white tracking-widest border-l-4 border-cyan-400 pl-3">
        NRIIT
      </div>
      <div className="text-xl sm:text-2xl font-black text-cyan-400 tracking-widest border-r-4 border-white pr-3">
        ECE/EVT
      </div>
    </div>

    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
        NEON<span className="text-cyan-400">QUIZ</span>
      </h1>
      <p className="text-slate-400 font-medium">Select your interface to begin</p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
      <Card className="flex flex-col items-center gap-4 text-center hover:border-cyan-400/50 transition-colors cursor-pointer group" onClick={() => setView("registration")}>
        <div className="w-16 h-16 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
          <Smartphone className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Team Device</h3>
        <p className="text-sm text-slate-400">Join as a participant team using your mobile phone.</p>
        <Button variant="neon" className="w-full mt-2">Join Quiz</Button>
      </Card>

      <Card className="flex flex-col items-center gap-4 text-center hover:border-purple-400/50 transition-colors cursor-pointer group" onClick={() => setView("main-display")}>
        <div className="w-16 h-16 rounded-full bg-purple-400/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
          <Monitor className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Main Screen</h3>
        <p className="text-sm text-slate-400">Display questions and scores on the projector.</p>
        <Button variant="secondary" className="w-full mt-2 bg-purple-600 hover:bg-purple-500">Open Display</Button>
      </Card>

      <Card className="flex flex-col items-center gap-4 text-center hover:border-rose-400/50 transition-colors cursor-pointer group" onClick={() => setView("admin")}>
        <div className="w-16 h-16 rounded-full bg-rose-400/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
          <Settings className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Admin Panel</h3>
        <p className="text-sm text-slate-400">Control rounds, questions, and manage scores.</p>
        <Button variant="danger" className="w-full mt-2">Admin Login</Button>
      </Card>
    </div>

    <div className="w-full max-w-4xl">
      <Card className="bg-slate-950/40">
        <div className="text-sm text-slate-400 font-medium">Open this on mobile (same Wi‑Fi):</div>
        <div className="mt-2 font-mono text-slate-200 break-all">
          {lanUrls[0] ??
            `http://${state.localIp === "Detecting..." ? window.location.hostname : state.localIp}:3000`}
        </div>
        {lanUrls.length > 1 && (
          <div className="mt-2 text-xs text-slate-500">
            Other options: {lanUrls.slice(1).join("  •  ")}
          </div>
        )}
      </Card>
    </div>
  </div>
);

const Registration = ({ 
  teamNameInput, 
  setTeamNameInput, 
  registerTeam, 
  setView,
  state
}: { 
  teamNameInput: string; 
  setTeamNameInput: (v: string) => void; 
  registerTeam: () => void; 
  setView: (v: any) => void;
  state: QuizState;
}) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-6">
    <Card className="w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-cyan-400" /> Join Quiz
        </h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-black uppercase">Connected</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Team Name</label>
          <input 
            type="text" 
            value={teamNameInput}
            onChange={(e) => setTeamNameInput(e.target.value)}
            placeholder="Enter your team name..."
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <Button onClick={registerTeam} className="w-full" variant="neon">Enter Arena</Button>
        <button onClick={() => setView("role-select")} className="w-full text-slate-500 text-sm hover:text-slate-400 transition-colors">Back to Selection</button>
      </div>
    </Card>

    {/* Teams already in */}
    <div className="w-full max-w-md space-y-3">
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest text-center">Teams in the Arena ({Object.keys(state.teams).length})</p>
      <div className="flex flex-wrap justify-center gap-2">
        {Object.values(state.teams).map((team: any) => (
          <div key={team.id} className="px-3 py-1 bg-slate-900 border border-white/5 rounded-lg text-sm text-slate-400">
            {team.name}
          </div>
        ))}
        {Object.keys(state.teams).length === 0 && (
          <p className="text-slate-600 text-xs italic">Waiting for teams to join...</p>
        )}
      </div>
    </div>

    <div className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter text-center max-w-xs">
      Note: All devices must be on the same Wi-Fi network to participate.
    </div>
  </div>
);

const TeamControl = ({ 
  myTeam, 
  state, 
  socket, 
  handleBuzz,
  submitAnswer
}: { 
  myTeam: Team; 
  state: QuizState; 
  socket: Socket | null; 
  handleBuzz: () => void;
  submitAnswer: (answer: string) => void;
}) => {
  const [lockedRapidFireAnswer, setLockedRapidFireAnswer] = useState<string | null>(null);

  const currentTeam = state.teams[myTeam.id] || myTeam;
  const currentQuestionSet = 
    state.currentRound === 1 ? state.questions.passRound :
    state.currentRound === 2 ? state.questions.buzzerRound :
    state.currentRound === 3 ? state.questions.rapidFireRound : [];
  const currentQuestion = currentQuestionSet[state.currentQuestionIndex];

  useEffect(() => {
    // Reset locked option whenever round or question changes
    setLockedRapidFireAnswer(null);
  }, [state.currentRound, currentQuestion?.id]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-bottom border-white/10 flex justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-cyan-400">{currentTeam.name}</h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Score: {currentTeam.score}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", socket?.connected ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500")} />
          <span className="text-[10px] text-slate-500 uppercase font-bold">{socket?.connected ? "Live" : "Offline"}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-8">
        {state.currentRound === 0 && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-cyan-400/10 rounded-full flex items-center justify-center mx-auto text-cyan-400 animate-pulse">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold">Waiting in Lobby</h3>
            <p className="text-slate-400">The quiz will start shortly. Get ready!</p>
          </div>
        )}

        {state.currentRound === 1 && (
          <div className="text-center space-y-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Pass Round</h3>
            
            {/* Question Display on Mobile */}
            <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-lg font-medium text-white">
              {currentQuestion?.question}
            </div>

            {state.activeTeamId === myTeam.id ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className="p-8 bg-emerald-500/10 border-2 border-emerald-500 rounded-3xl">
                  <div className="text-emerald-400 font-black text-3xl">YOUR TURN!</div>
                  <p className="text-slate-300 mt-4 text-lg">Answer the question verbally to the quizmaster.</p>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 bg-slate-900 border border-white/5 rounded-3xl opacity-50">
                <p className="text-slate-400">Waiting for other teams...</p>
              </div>
            )}
          </div>
        )}

        {state.currentRound === 2 && (
          <div className="w-full max-w-md flex flex-col items-center gap-8">
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Buzzer Round</h3>
            
            {/* Question Display on Mobile */}
            <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-lg font-medium text-white text-center w-full">
              {currentQuestion?.question}
            </div>

            {state.buzzerLocked && state.buzzerWinner === myTeam.id ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-6"
              >
                <div className="text-center p-8 bg-emerald-500/20 rounded-3xl border-2 border-emerald-500">
                  <div className="text-emerald-400 font-black text-3xl">YOU BUZZED!</div>
                  <p className="text-slate-300 mt-4 text-lg">Answer the question verbally now!</p>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={state.buzzerLocked}
                onClick={handleBuzz}
                className={cn(
                  "w-64 h-64 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-2xl relative overflow-hidden",
                  state.buzzerLocked 
                    ? "bg-slate-800 opacity-50"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-500/50 active:shadow-none"
                )}
              >
                {state.buzzerLocked ? (
                  <>
                    <X className="w-20 h-20" />
                    <span className="font-black text-xl">LOCKED</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-20 h-20" />
                    <span className="font-black text-3xl">BUZZ</span>
                  </>
                )}
                
                {!state.buzzerLocked && (
                  <motion.div 
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-white/20"
                  />
                )}
              </motion.button>
            )}

            {state.buzzerLocked && state.buzzerWinner !== myTeam.id && (
              <p className="text-rose-400 font-bold animate-pulse">
                {state.teams[state.buzzerWinner!]?.name} buzzed first!
              </p>
            )}
          </div>
        )}

        {state.currentRound === 3 && (
          <div className="text-center space-y-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Rapid Fire</h3>
            
            {/* Question Display on Mobile */}
            <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-lg font-medium text-white">
              {currentQuestion?.question}
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-cyan-500/10 border-2 border-cyan-500 rounded-3xl">
                <div className="text-cyan-400 font-black text-3xl">GO GO GO!</div>
                <p className="text-slate-300 text-sm mt-2">Tap the correct answer fast!</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {currentQuestion?.options.map((opt, i) => (
                  <Button 
                    key={i} 
                    variant="neon" 
                    onClick={() => {
                      if (!state.isRapidFireRunning || lockedRapidFireAnswer !== null) return;
                      setLockedRapidFireAnswer(opt);
                      submitAnswer(opt);
                    }}
                    className={cn(
                      "text-lg py-4 relative overflow-hidden",
                      lockedRapidFireAnswer === opt &&
                        "bg-pink-500/20 border-pink-400 text-pink-100 shadow-[0_0_25px_rgba(236,72,153,0.9)]"
                    )}
                    disabled={
                      !state.isRapidFireRunning ||
                      (lockedRapidFireAnswer !== null && lockedRapidFireAnswer !== opt)
                    }
                  >
                    <span className="relative z-10">{opt}</span>
                    {lockedRapidFireAnswer === opt && (
                      <span className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-yellow-300/10 to-pink-500/20 opacity-80 pointer-events-none" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPanel = ({ 
  isAdminAuthenticated, 
  setIsAdminAuthenticated, 
  adminPassword, 
  setAdminPassword, 
  adminAction, 
  state, 
  setView 
}: { 
  isAdminAuthenticated: boolean; 
  setIsAdminAuthenticated: (v: boolean) => void; 
  adminPassword: string; 
  setAdminPassword: (v: string) => void; 
  adminAction: (type: string, payload?: any) => void; 
  state: QuizState; 
  setView: (v: any) => void;
}) => {
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6">Admin Access</h2>
          <div className="space-y-4">
            <input 
              type="password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-400"
            />
            <Button 
              onClick={() => {
                if (adminPassword === "eceevt") setIsAdminAuthenticated(true);
                else alert("Wrong password");
              }} 
              className="w-full" 
              variant="danger"
            >
              Authenticate
            </Button>
            <button onClick={() => setView("role-select")} className="w-full text-slate-500 text-sm">Cancel</button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Settings className="text-rose-500" /> CONTROL CENTER
          </h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setView("role-select")}>Exit</Button>
            <Button variant="danger" onClick={() => adminAction("RESET_QUIZ")}>Reset All</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Round Control */}
          <Card className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xl font-bold">Round Control</h3>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                R1: 1pt | R2: 1.5pt | R3: 2pt
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant={state.currentRound === 1 ? "primary" : "secondary"} 
                onClick={() => adminAction("START_ROUND", { round: 1 })}
              >
                Round 1: Pass
              </Button>
              <Button 
                variant={state.currentRound === 2 ? "primary" : "secondary"} 
                onClick={() => adminAction("START_ROUND", { round: 2 })}
              >
                Round 2: Buzzer
              </Button>
              <Button 
                variant={state.currentRound === 3 ? "primary" : "secondary"} 
                onClick={() => adminAction("START_ROUND", { round: 3 })}
              >
                Round 3: Rapid Fire
              </Button>
              <Button 
                variant={state.currentRound === 0 ? "primary" : "secondary"} 
                onClick={() => adminAction("START_ROUND", { round: 0 })}
              >
                Lobby
              </Button>
            </div>

            {state.currentRound > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Question {state.currentQuestionIndex + 1}</span>
                  <Button onClick={() => adminAction("NEXT_QUESTION")} variant="neon" className="py-2 px-4">Next Q</Button>
                </div>
                {state.currentRound === 1 && (
                  <Button onClick={() => adminAction("PASS_CONTROL")} variant="secondary" className="w-full">Pass to Next Team</Button>
                )}
                {state.currentRound === 2 && (
                  <Button onClick={() => adminAction("RESET_BUZZER")} variant="danger" className="w-full">Reset Buzzer</Button>
                )}
                {state.currentRound === 3 && (
                  <Button 
                    onClick={() => adminAction("TOGGLE_RAPID_FIRE", { running: !state.isRapidFireRunning })} 
                    variant={state.isRapidFireRunning ? "danger" : "success"} 
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {state.isRapidFireRunning ? <><X size={18} /> Stop Timer</> : <><Zap size={18} /> Start Timer</>}
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Team Management */}
          <Card className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold border-b border-white/10 pb-2">Teams & Scores</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-sm uppercase tracking-widest">
                    <th className="pb-4">Team</th>
                    <th className="pb-4">Score</th>
                    <th className="pb-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(Object.values(state.teams) as Team[]).map(team => (
                    <tr key={team.id} className={cn(state.activeTeamId === team.id ? "bg-cyan-400/5" : "")}>
                      <td className="py-4 font-bold">
                        {team.name}
                        {state.activeTeamId === team.id && <span className="ml-2 text-[10px] bg-cyan-400 text-black px-1 rounded">ACTIVE</span>}
                        {state.buzzerWinner === team.id && <span className="ml-2 text-[10px] bg-rose-500 text-white px-1 rounded">BUZZED</span>}
                      </td>
                      <td className="py-4 text-2xl font-mono text-cyan-400">{team.score}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {state.currentRound > 0 && (
                            <button 
                              onClick={() => {
                                const points = state.currentRound === 1 ? 1 : state.currentRound === 2 ? 1.5 : 2;
                                adminAction("ADJUST_SCORE", { teamId: team.id, amount: points });
                              }} 
                              className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors font-bold flex items-center gap-1"
                            >
                              <Check size={16} /> 
                              +{state.currentRound === 1 ? "1" : state.currentRound === 2 ? "1.5" : "2"}
                            </button>
                          )}
                          <button onClick={() => adminAction("ADJUST_SCORE", { teamId: team.id, amount: 1 })} className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">+1</button>
                          <button onClick={() => adminAction("ADJUST_SCORE", { teamId: team.id, amount: -1 })} className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">-1</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {Object.keys(state.teams).length === 0 && (
                <div className="py-12 text-center text-slate-500 italic">No teams registered yet...</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const MainDisplay = ({ state }: { state: QuizState }) => {
  const roundNames = ["LOBBY", "ROUND 1: PASS", "ROUND 2: BUZZER", "ROUND 3: RAPID FIRE"];
  const currentQuestionSet = 
    state.currentRound === 1 ? state.questions.passRound :
    state.currentRound === 2 ? state.questions.buzzerRound :
    state.currentRound === 3 ? state.questions.rapidFireRound : [];
  
  const currentQuestion = currentQuestionSet[state.currentQuestionIndex];
  const [showBuzzerOrder, setShowBuzzerOrder] = useState(false);

  useEffect(() => {
    // When first buzzer hits in Round 2, show order list for 2 seconds
    if (state.currentRound === 2 && state.buzzerLocked && state.buzzerWinner) {
      setShowBuzzerOrder(true);
      const timer = setTimeout(() => setShowBuzzerOrder(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowBuzzerOrder(false);
  }, [state.currentRound, state.buzzerLocked, state.buzzerWinner]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col">
      {/* Institutional Headers */}
      <div className="flex justify-between items-center mb-8 px-2">
        <div className="text-4xl font-black text-white tracking-widest border-l-4 border-cyan-400 pl-4">NRIIT</div>
        <div className="text-4xl font-black text-cyan-400 tracking-widest border-r-4 border-white pr-4">ECE/EVT</div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-end mb-12 border-b-2 border-white/10 pb-6">
        <div>
          <h1 className="text-6xl font-black tracking-tighter">
            NEON<span className="text-cyan-400">QUIZ</span>
          </h1>
          <p className="text-2xl text-slate-400 font-bold mt-2">{roundNames[state.currentRound]}</p>
        </div>
        <div className="text-right">
          {state.currentRound === 3 && state.isRapidFireRunning && (
            <div className="mr-8 inline-block align-bottom">
              <div className="text-rose-500 font-mono text-xl">TIMER</div>
              <div className="text-5xl font-black text-rose-500">{state.rapidFireTimer}s</div>
            </div>
          )}
          <div className="text-slate-500 font-mono text-xl inline-block">QUESTION</div>
          <div className="text-5xl font-black text-white inline-block ml-4">{state.currentQuestionIndex + 1} <span className="text-slate-600 text-3xl">/ {currentQuestionSet.length}</span></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Question Display */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          {state.currentRound === 0 ? (
            <div className="text-center space-y-8">
              <h2 className="text-8xl font-black text-white">GET READY!</h2>
              <p className="text-3xl text-slate-400">Teams are joining the arena...</p>
              
              {/* Big IP Display for Lobby */}
              <div className="mt-12 p-8 bg-cyan-400/5 border-2 border-cyan-400/20 rounded-[2rem] inline-block">
                <p className="text-slate-500 font-bold uppercase tracking-widest mb-2">Connect your phones to:</p>
                <p className="text-6xl font-mono font-black text-cyan-400">
                  http://{state.localIp === "Detecting..." ? window.location.hostname : state.localIp}:3000
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mt-12">
                {(Object.values(state.teams) as Team[]).map(team => (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    key={team.id} 
                    className="px-8 py-4 bg-cyan-400/10 border border-cyan-400/50 rounded-2xl text-2xl font-bold text-cyan-400"
                  >
                    {team.name}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentQuestion?.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-12"
              >
                <div className="p-12 bg-slate-900/50 border-2 border-white/10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-400/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-400/10 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
                  
                  <h2 className="text-6xl font-bold leading-tight text-white text-center">
                    {currentQuestion?.question || "Waiting for next question..."}
                  </h2>
                </div>

                {/* Options Display - Only for Rapid Fire */}
                {state.currentRound === 3 && currentQuestion?.options && (
                  <div className="space-y-8 w-full">
                    {/* Rapid Fire Timer Bar */}
                    <div className="max-w-4xl mx-auto w-full space-y-2">
                      <div className="flex justify-between items-end px-2">
                        <span className="text-cyan-400 font-black text-2xl">TIME LEFT</span>
                        <span className="text-cyan-400 font-mono text-4xl">{state.rapidFireTimer}s</span>
                      </div>
                      <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                        <motion.div 
                          initial={false}
                          animate={{ width: `${(state.rapidFireTimer / 8) * 100}%` }}
                          className={cn(
                            "h-full transition-colors",
                            state.rapidFireTimer <= 2 ? "bg-rose-500 shadow-[0_0_20px_#f43f5e]" : "bg-cyan-400 shadow-[0_0_20px_#22d3ee]"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                      {currentQuestion.options.map((opt, i) => (
                        <div 
                          key={i} 
                          className="p-6 bg-slate-900/80 border border-white/10 rounded-2xl text-3xl font-bold text-center text-slate-300"
                        >
                          <span className="text-cyan-400 mr-4">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {state.currentRound === 1 && state.activeTeamId && (
                  <div className="flex items-center justify-center gap-6">
                    <span className="text-2xl text-slate-500 font-bold uppercase tracking-widest">ACTIVE TEAM:</span>
                    <div className="px-12 py-6 bg-cyan-400 text-black text-4xl font-black rounded-3xl shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                      {state.teams[state.activeTeamId]?.name}
                    </div>
                  </div>
                )}

                {state.currentRound === 2 && state.buzzerLocked && (
                  <div className="flex flex-col items-center gap-8 w-full">
                    <div className="text-2xl text-rose-500 font-black uppercase tracking-widest animate-pulse">
                      BUZZER HIT!
                    </div>
                    <div className="px-12 py-6 bg-rose-600 text-white text-5xl font-black rounded-3xl shadow-[0_0_40px_rgba(225,29,72,0.6)] flex flex-col items-center">
                      {state.teams[state.buzzerWinner!]?.name}
                      <span className="text-xl font-mono opacity-80 mt-2">
                        {state.buzzerReactionTime}ms
                      </span>
                    </div>

                    {/* Transparency: show all buzz times from first hit */}
                    {state.buzzerBuzzes.length > 0 && (
                      <div className="w-full max-w-xl mx-auto">
                        <h4 className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-2 text-center">
                          Buzzer Order (Time from First Hit)
                        </h4>
                        <div className="bg-slate-900/70 border border-white/10 rounded-2xl divide-y divide-white/10">
                          {(() => {
                            const sorted = state.buzzerBuzzes
                              .slice()
                              .sort((a, b) => a.reactionTime - b.reactionTime);
                            const base = sorted[0]?.reactionTime ?? 0;
                            return sorted.map((buzz, index) => {
                              const delta = buzz.reactionTime - base;
                              return (
                                <div
                                  key={`${buzz.teamId}-${index}`}
                                  className="flex justify-between items-center px-4 py-2 text-sm"
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                        index === 0
                                          ? "bg-yellow-400 text-black"
                                          : "bg-slate-800 text-slate-300"
                                      )}
                                    >
                                      {index + 1}
                                    </span>
                                    <span className="font-semibold text-slate-100">
                                      {state.teams[buzz.teamId]?.name ?? buzz.teamId}
                                    </span>
                                  </div>
                                  <span className="font-mono text-cyan-400">
                                    {index === 0 ? "0 ms" : `+${delta} ms`}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Leaderboard Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-2xl font-black flex items-center gap-2 text-slate-400">
            <Trophy className="text-yellow-400" /> LEADERBOARD
          </h3>
          <div className="space-y-4">
            {(Object.values(state.teams) as Team[])
              .sort((a, b) => b.score - a.score)
              .map((team, idx) => (
                <motion.div 
                  layout
                  key={team.id}
                  className={cn(
                    "p-4 rounded-2xl flex justify-between items-center border transition-all",
                    idx === 0 ? "bg-yellow-400/10 border-yellow-400/50" : "bg-slate-900 border-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", idx === 0 ? "bg-yellow-400 text-black" : "bg-slate-800 text-slate-400")}>
                      {idx + 1}
                    </span>
                    <span className="text-xl font-bold">{team.name}</span>
                  </div>
                  <span className="text-3xl font-mono font-black text-cyan-400">{team.score}</span>
                </motion.div>
              ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-slate-500 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users size={20} />
            <span>{Object.keys(state.teams).length} Teams Connected</span>
          </div>
        </div>
        <div className="text-sm">
          Local Server: <span className="text-slate-300 font-mono">
            http://{state.localIp === "Detecting..." ? window.location.hostname : state.localIp}:3000
          </span>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<QuizState | null>(null);
  const [view, setView] = useState<"role-select" | "registration" | "team-control" | "admin" | "main-display">("role-select");
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [lanUrls, setLanUrls] = useState<string[]>([]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("stateUpdate", (newState: QuizState) => {
      setState(newState);
    });

    newSocket.on("buzzerEffect", ({ teamId, reactionTime }) => {
      console.log(`Buzzer hit by ${teamId} in ${reactionTime}ms`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/network")
      .then((r) => (r.ok ? (r.json() as Promise<NetworkInfo>) : null))
      .then((data) => {
        if (!data || cancelled) return;
        const urls = (data.ips ?? []).map((ip) => `http://${ip}:${data.port}`);
        setLanUrls(urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const registerTeam = () => {
    if (teamNameInput.trim() && socket) {
      socket.emit("registerTeam", teamNameInput.trim());
      socket.once("teamRegistered", (team: Team) => {
        setMyTeam(team);
        setView("team-control");
      });
    }
  };

  const adminAction = (type: string, payload: any = {}) => {
    if (socket) {
      socket.emit("adminAction", { type, payload });
    }
  };

  const handleBuzz = () => {
    if (socket && myTeam && state?.currentRound === 2 && !state.buzzerLocked) {
      socket.emit("buzz", myTeam.id);
    }
  };

  const submitAnswer = (answer: string) => {
    if (socket && myTeam) {
      socket.emit("submitAnswer", { teamId: myTeam.id, answer });
    }
  };

  if (!state) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Zap className="w-12 h-12" />
        <span className="font-mono tracking-widest uppercase">Connecting to Quiz Server...</span>
      </div>
    </div>
  );

  return (
    <div className="font-sans selection:bg-cyan-400 selection:text-black">
      {view === "role-select" && <RoleSelect setView={setView} state={state} lanUrls={lanUrls} />}
      {view === "registration" && (
        <Registration 
          teamNameInput={teamNameInput} 
          setTeamNameInput={setTeamNameInput} 
          registerTeam={registerTeam} 
          setView={setView} 
          state={state}
        />
      )}
      {view === "team-control" && myTeam && (
        <TeamControl 
          myTeam={myTeam} 
          state={state} 
          socket={socket} 
          handleBuzz={handleBuzz} 
          submitAnswer={submitAnswer}
        />
      )}
      {view === "admin" && (
        <AdminPanel 
          isAdminAuthenticated={isAdminAuthenticated} 
          setIsAdminAuthenticated={setIsAdminAuthenticated} 
          adminPassword={adminPassword} 
          setAdminPassword={setAdminPassword} 
          adminAction={adminAction} 
          state={state} 
          setView={setView} 
        />
      )}
      {view === "main-display" && <MainDisplay state={state} />}
    </div>
  );
}
