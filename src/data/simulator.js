/**
 * Astroskin Spaceflight Biomedical Telemetry Simulator
 * Generates continuous physiological telemetry with noise and supports real-time anomaly injection.
 */
import { NASA_INDICATORS_MAP } from './nasaHrpData.js';
import { db } from '../db/db.js';
import { createReading } from '../models/reading.js';

class TelemetrySimulator {
  constructor() {
    this.timer = null;
    this.subscribers = new Set();
    this.isRunning = false;

    // Current physiological state
    this.state = {
      HR: 72,
      SPO2: 98,
      SBP: 118,
      DBP: 76,
      RR: 14,
      TSKIN: 36.6,
      BMD: -0.8,
      MUSCLE_MASS: 96,
      RAD_DAILY: 0.35,
      RAD_CUMULATIVE: 42.1,
      PVT: 232,
      SLEEP_HOURS: 7.4,
      WBC: 6.4,
      IL6: 1.8,
      CORTISOL: 12.0
    };

    // Buffer for history
    this.history = {
      HR: [],
      SPO2: [],
      TSKIN: [],
      RR: [],
      RAD_DAILY: [],
      SBP: []
    };

    // Pre-populate some history points
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const timeStr = new Date(now - i * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.history.HR.push({ time: timeStr, value: 70 + Math.round(Math.random() * 6) });
      this.history.SPO2.push({ time: timeStr, value: 98 });
      this.history.TSKIN.push({ time: timeStr, value: 36.6 });
      this.history.RR.push({ time: timeStr, value: 14 });
      this.history.RAD_DAILY.push({ time: timeStr, value: 0.35 });
      this.history.SBP.push({ time: timeStr, value: 118 });
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.state, this.history);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => cb(this.state, this.history));
  }

  start(intervalMs = 1800) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  tick() {
    // Realistic organic random walk
    this.state.HR = Math.max(52, Math.min(145, Math.round(this.state.HR + (Math.random() * 4 - 2))));
    this.state.SPO2 = Math.max(88, Math.min(100, Math.round(this.state.SPO2 + (Math.random() * 0.8 - 0.4))));
    this.state.TSKIN = parseFloat(Math.max(35.2, Math.min(38.8, this.state.TSKIN + (Math.random() * 0.08 - 0.04))).toFixed(1));
    this.state.RR = Math.max(10, Math.min(26, Math.round(this.state.RR + (Math.random() * 2 - 1))));
    this.state.RAD_DAILY = parseFloat(Math.max(0.1, Math.min(2.5, this.state.RAD_DAILY + (Math.random() * 0.02 - 0.01))).toFixed(2));

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Append to rolling history
    ['HR', 'SPO2', 'TSKIN', 'RR', 'RAD_DAILY', 'SBP'].forEach(code => {
      if (this.history[code]) {
        this.history[code].push({ time: timeStr, value: this.state[code] });
        if (this.history[code].length > 25) {
          this.history[code].shift();
        }
      }
    });

    this.notify();

    // Persist live reading sample to Dexie offline DB (with pending sync to Supabase)
    try {
      const defaultUserId = '00000000-0000-4000-8000-000000000901';
      const r = createReading({
        userId: defaultUserId,
        indicatorCode: 'HR',
        value: this.state.HR,
        unit: 'bpm',
        source: 'simulated'
      });
      db.readings.put(r).catch(() => {});
    } catch (e) {
      // non-blocking
    }
  }

  // Live Hackathon Anomaly Injections for Demonstration
  triggerAnomaly(type) {
    switch (type) {
      case 'hypoxia':
        this.state.SPO2 = 89; // Triggers critical SpO2 alert
        break;
      case 'tachycardia':
        this.state.HR = 138; // Triggers critical HR alert
        break;
      case 'radiation':
        this.state.RAD_DAILY = 2.15; // Triggers critical Solar Particle Event
        break;
      case 'reset':
        this.state.HR = 72;
        this.state.SPO2 = 98;
        this.state.RAD_DAILY = 0.35;
        break;
      default:
        break;
    }
    this.tick();
  }
}

export const simulator = new TelemetrySimulator();

// Team stub compatibility
export function generateReading(userId, indicatorCode) {
  return {
    id: crypto.randomUUID(),
    userId,
    indicatorCode,
    value: simulator.state[indicatorCode] || 72,
    unit: NASA_INDICATORS_MAP[indicatorCode]?.unit || '',
    measuredAt: new Date().toISOString(),
    source: 'simulated'
  };
}

export function startSimulator(options = {}) {
  simulator.start(options.intervalMs || 1800);
  const unsub = simulator.subscribe((state) => {
    if (options.onReading) {
      const code = options.indicatorCodes?.[0] || 'HR';
      options.onReading(generateReading(options.userId || 'user-1', code));
    }
  });
  return () => {
    unsub();
    simulator.stop();
  };
}
