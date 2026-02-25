import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function getLanIPv4s(): string[] {
  const ifaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const net of Object.values(ifaces)) {
    for (const addr of net ?? []) {
      if (addr.family === "IPv4" && !addr.internal) ips.push(addr.address);
    }
  }
  return Array.from(new Set(ips));
}

interface Team {
  id: string;
  name: string;
  score: number;
  socketId: string;
  round1Score: number;
  round2Score: number;
  round3Score: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

interface BuzzerBuzz {
  teamId: string;
  reactionTime: number;
}

interface QuizState {
  teams: Record<string, Team>;
  currentRound: number; // 0: Lobby, 1: Pass, 2: Buzzer, 3: Rapid Fire
  currentQuestionIndex: number;
  activeTeamId: string | null; // For Pass Round
  buzzerLocked: boolean;
  buzzerWinner: string | null;
  buzzerReactionTime: number | null;
  buzzerBuzzes: BuzzerBuzz[];
  // Absolute timestamp (ms) when buzzer window closes after first buzz
  buzzerWindowEndTime: number | null;
  questionStartTime: number | null;
  rapidFireTimer: number;
  isRapidFireRunning: boolean;
  localIp: string;
  // Tracks which teams have already scored for a given Rapid Fire question (by question id)
  rapidFireAnsweredTeams: Record<string, string[]>;
  questions: {
    passRound: Question[];
    buzzerRound: Question[];
    rapidFireRound: Question[];
  };
}

const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, "questions.json"), "utf8"));

// Shuffle function
function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

const state: QuizState = {
  teams: {},
  currentRound: 0,
  currentQuestionIndex: 0,
  activeTeamId: null,
  buzzerLocked: false,
  buzzerWinner: null,
  buzzerReactionTime: null,
  buzzerBuzzes: [],
  buzzerWindowEndTime: null,
  questionStartTime: null,
  rapidFireTimer: 8,
  isRapidFireRunning: false,
  localIp: "Detecting...",
  rapidFireAnsweredTeams: {},
  questions: {
    passRound: shuffle([...questionsData.passRound]),
    buzzerRound: shuffle([...questionsData.buzzerRound]),
    rapidFireRound: shuffle([...questionsData.rapidFireRound]),
  },
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const disableHmr = process.env.DISABLE_HMR === "true";

  app.get("/api/network", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ port: PORT, ips: getLanIPv4s() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: true,
        allowedHosts: true,
        // When serving to multiple phones on a LAN, the extra HMR websocket port
        // (often 24678) is frequently blocked by firewalls. Disabling HMR keeps
        // everything on port 3000 so many devices can load reliably.
        hmr: disableHmr ? false : true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send initial state
    socket.emit("stateUpdate", state);

    socket.on("registerTeam", (name: string) => {
      const teamId = name.toLowerCase().replace(/\s+/g, "-");
      if (state.teams[teamId]) {
        state.teams[teamId].socketId = socket.id;
      } else {
        state.teams[teamId] = {
          id: teamId,
          name,
          score: 0,
          socketId: socket.id,
          round1Score: 0,
          round2Score: 0,
          round3Score: 0,
        };
      }
      socket.emit("teamRegistered", state.teams[teamId]);
      io.emit("stateUpdate", state);
    });

    // Admin Controls
    socket.on("adminAction", (action: any) => {
      // Simple password check could be added here if needed
      const { type, payload } = action;

      switch (type) {
        case "START_ROUND":
          state.currentRound = payload.round;
          state.currentQuestionIndex = 0;
          state.buzzerLocked = false;
          state.buzzerWindowEndTime = null;
          state.buzzerWinner = null;
          state.buzzerReactionTime = null;
          state.buzzerBuzzes = [];
          state.questionStartTime = null;
          state.isRapidFireRunning = false;

          if (state.currentRound === 1) {
            const teamIds = Object.keys(state.teams);
            state.activeTeamId = teamIds.length > 0 ? teamIds[0] : null;
          } else if (state.currentRound === 2) {
            state.questionStartTime = Date.now();
          } else if (state.currentRound === 3) {
            state.rapidFireTimer = 8;
            state.rapidFireAnsweredTeams = {};
          }
          break;

        case "NEXT_QUESTION":
          state.currentQuestionIndex++;
          state.buzzerLocked = false;
          state.buzzerWindowEndTime = null;
          state.buzzerWinner = null;
          state.buzzerReactionTime = null;
          state.buzzerBuzzes = [];
          state.questionStartTime = Date.now();
          break;

        case "ADJUST_SCORE":
          if (state.teams[payload.teamId]) {
            const team = state.teams[payload.teamId];
            const newTotal = Math.max(0, team.score + payload.amount);
            const delta = newTotal - team.score;
            team.score = newTotal;

            // Attribute manual adjustments to the current round, if any
            if (delta !== 0) {
              if (state.currentRound === 1) {
                team.round1Score = Math.max(0, team.round1Score + delta);
              } else if (state.currentRound === 2) {
                team.round2Score = Math.max(0, team.round2Score + delta);
              } else if (state.currentRound === 3) {
                team.round3Score = Math.max(0, team.round3Score + delta);
              }
            }
          }
          break;

        case "RESET_BUZZER":
          state.buzzerLocked = false;
          state.buzzerWinner = null;
          state.buzzerReactionTime = null;
          state.buzzerBuzzes = [];
          state.buzzerWindowEndTime = null;
          state.questionStartTime = Date.now();
          break;

        case "PASS_CONTROL":
          const teamIds = Object.keys(state.teams);
          const currentIndex = teamIds.indexOf(state.activeTeamId || "");
          const nextIndex = (currentIndex + 1) % teamIds.length;
          state.activeTeamId = teamIds[nextIndex];
          break;

        case "TOGGLE_RAPID_FIRE":
          state.isRapidFireRunning = payload.running;
          break;
          
        case "RESET_QUIZ":
            state.currentRound = 0;
            state.currentQuestionIndex = 0;
            state.teams = {};
            state.activeTeamId = null;
            state.buzzerLocked = false;
            state.buzzerWinner = null;
            state.buzzerReactionTime = null;
            state.buzzerBuzzes = [];
            state.buzzerWindowEndTime = null;
            state.questionStartTime = null;
            state.rapidFireTimer = 8;
            state.isRapidFireRunning = false;
            state.rapidFireAnsweredTeams = {};
            break;
      }

      io.emit("stateUpdate", state);
    });

    socket.on("buzz", (teamId: string) => {
      if (state.currentRound !== 2) return;
      // Once the buzzer window is fully locked, ignore further buzzes
      if (state.buzzerLocked) return;

      const now = Date.now();
      const reactionTime = state.questionStartTime ? now - state.questionStartTime : 0;

      // Prevent duplicate buzz entries from the same team for a single question
      const alreadyBuzzed = state.buzzerBuzzes.some((b) => b.teamId === teamId);
      if (alreadyBuzzed) {
        return;
      }

      // Track every team’s reaction time for transparency (for the current question)
      state.buzzerBuzzes.push({ teamId, reactionTime });

      // First buzz: decide winner and start a 2.5s window during which
      // other teams can still buzz (for visibility of their times).
      if (!state.buzzerWinner) {
        state.buzzerWinner = teamId;
        state.buzzerReactionTime = reactionTime;
        state.buzzerWindowEndTime = now + 2500;
        io.emit("buzzerEffect", { teamId, reactionTime });
      }

      io.emit("stateUpdate", state);
    });

    socket.on("submitAnswer", ({ teamId, answer }: { teamId: string, answer: string }) => {
      const currentQuestionSet = 
        state.currentRound === 1 ? state.questions.passRound :
        state.currentRound === 2 ? state.questions.buzzerRound :
        state.currentRound === 3 ? state.questions.rapidFireRound : [];
      
      const currentQuestion = currentQuestionSet[state.currentQuestionIndex];
      
      if (!currentQuestion) return;

      const currentQuestionId = currentQuestion.id;
      if (!state.rapidFireAnsweredTeams[currentQuestionId]) {
        state.rapidFireAnsweredTeams[currentQuestionId] = [];
      }
      const hasTeamScoredThisRapidQuestion =
        state.currentRound === 3 &&
        state.rapidFireAnsweredTeams[currentQuestionId].includes(teamId);

      // Check if it's the team's turn or if they won the buzzer
      const isAllowed = 
        (state.currentRound === 1 && state.activeTeamId === teamId) ||
        (state.currentRound === 2 && state.buzzerWinner === teamId) ||
        (state.currentRound === 3 && state.isRapidFireRunning && !hasTeamScoredThisRapidQuestion);
        // Actually for Rapid Fire, usually it's one team at a time, but let's assume activeTeamId for RF too if set.
        // For now, let's just check if it's correct.

      if (isAllowed && answer === currentQuestion.answer) {
        const points = state.currentRound === 1 ? 1 : state.currentRound === 2 ? 1.5 : 2;
        const team = state.teams[teamId];
        team.score += points;

        // Attribute points to the appropriate round bucket
        if (state.currentRound === 1) {
          team.round1Score += points;
        } else if (state.currentRound === 2) {
          team.round2Score += points;
        } else if (state.currentRound === 3) {
          team.round3Score += points;
        }
        
        // Mark that this team has already scored for this Rapid Fire question
        if (state.currentRound === 3) {
          state.rapidFireAnsweredTeams[currentQuestionId].push(teamId);
        }
        
        // Auto-advance for Pass and Buzzer rounds only.
        // In Rapid Fire we keep the same question alive for the whole timer
        // so multiple teams can score on the same question.
        if (state.currentRound === 1 || state.currentRound === 2) {
          state.currentQuestionIndex++;
          state.buzzerLocked = false;
          state.buzzerWinner = null;
          state.buzzerReactionTime = null;
          state.buzzerBuzzes = [];
          state.questionStartTime = Date.now();
        }
        
        if (state.currentRound === 1) {
          // Pass control to next team automatically in Pass round
          const teamIds = Object.keys(state.teams);
          const currentIndex = teamIds.indexOf(state.activeTeamId || "");
          const nextIndex = (currentIndex + 1) % teamIds.length;
          state.activeTeamId = teamIds[nextIndex];
        }

        // Check if we ran out of questions in Rapid Fire
        if (state.currentRound === 3 && state.currentQuestionIndex >= state.questions.rapidFireRound.length) {
          state.isRapidFireRunning = false;
          state.currentQuestionIndex = state.questions.rapidFireRound.length - 1;
        }
      } else if (isAllowed && answer !== currentQuestion.answer) {
        // Optional: penalty? User said "no minus points"
        // Just advance or reset buzzer
        if (state.currentRound === 2) {
          state.buzzerLocked = false;
          state.buzzerWinner = null;
        }
      }

      io.emit("stateUpdate", state);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Rapid Fire Timer Logic
  setInterval(() => {
    // Handle Rapid Fire countdown and question progression
    if (state.currentRound === 3 && state.isRapidFireRunning) {
      state.rapidFireTimer -= 1;
      if (state.rapidFireTimer <= 0) {
        state.currentQuestionIndex++;
        state.rapidFireTimer = 8;
        
        // Check if we ran out of questions
        if (state.currentQuestionIndex >= state.questions.rapidFireRound.length) {
          state.isRapidFireRunning = false;
          state.currentQuestionIndex = state.questions.rapidFireRound.length - 1;
        }
      }
    }

    // Handle buzzer lock window after first buzz in Round 2
    if (
      state.currentRound === 2 &&
      !state.buzzerLocked &&
      state.buzzerWinner &&
      state.buzzerWindowEndTime !== null &&
      Date.now() >= state.buzzerWindowEndTime
    ) {
      state.buzzerLocked = true;
    }

    // Emit state whenever either timer logic may have changed it
    if (
      (state.currentRound === 3 && state.isRapidFireRunning) ||
      (state.currentRound === 2 && state.buzzerWinner && state.buzzerWindowEndTime !== null)
    ) {
      io.emit("stateUpdate", state);
    }
  }, 1000);

  httpServer.listen(PORT, HOST, () => {
    const lan = getLanIPv4s();
    const detectedIp = lan[0] ?? "localhost";

    state.localIp = detectedIp;
    io.emit("stateUpdate", state);

    console.log("\n" + "=".repeat(60));
    console.log(`🚀 NEONQUIZ SERVER IS LIVE!`);
    console.log("=".repeat(60));
    console.log(`\n1. ON THIS LAPTOP:`);
    console.log(`   http://localhost:${PORT}`);
    
    console.log(`\n2. ON MOBILE PHONES (Same Wi-Fi):`);
    console.log(`   http://${detectedIp}:${PORT}`);

    if (lan.length > 1) {
      console.log(`\nOTHER LAN OPTIONS:`);
      for (const ip of lan) console.log(`   http://${ip}:${PORT}`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("TROUBLESHOOTING:");
    console.log("- Make sure both devices are on the SAME Wi-Fi network.");
    console.log("- Check if your Laptop Firewall is blocking port 3000.");
    console.log("=".repeat(60) + "\n");
  });
}

startServer();
