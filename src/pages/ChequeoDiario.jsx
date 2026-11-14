import { useState } from "react";
import { dailyCheckinTranslations } from "../i18n/dailyCheckinLocale";
import "./ChequeoDiario.css";

// Default UUID matches Astronaut One (demo) in setup.sql
const DEMO_ASTRONAUT_ID = "a0000000-0000-4000-8000-000000000002";

export default function ChequeoDiario({ userId = DEMO_ASTRONAUT_ID, onSaveCheckin }) {
  const [lang, setLang] = useState("es");
  const t = dailyCheckinTranslations[lang].dailyCheckin;

  const [mood, setMood] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [stress, setStress] = useState(2);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [notes, setNotes] = useState("");
  const [evaluation, setEvaluation] = useState(null);

  const toggleSymptom = (code) => {
    setSelectedSymptoms((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const adjustSleep = (delta) => {
    setSleepHours((prev) => {
      const next = Math.round((prev + delta) * 2) / 2;
      return Math.min(24, Math.max(0, next)); // CHECK sleep_hours between 0 and 24
    });
  };

  // Evaluates exact thresholds seeded in setup.sql (TH_SLEEP_H, TH_MOOD, TH_STRESS)
  const evaluateCheckin = () => {
    let level = "normal"; // normal | caution | critical
    const triggeredRecs = [];

    const elevate = (newLevel, recId, value = "") => {
      if (newLevel === "critical") level = "critical";
      else if (newLevel === "caution" && level === "normal") level = "caution";

      const template = t.recs[recId] || "";
      triggeredRecs.push({
        recommendation_id: recId,
        level: newLevel,
        text: template.replace("{value}", String(value)),
      });
    };

    // TH_SLEEP_H: min_critical 4, min_normal 6, max_normal 9, max_critical 12
    if (sleepHours < 4) elevate("critical", "REC_SLEEP_H_LOW_CRITICAL", sleepHours);
    else if (sleepHours < 6) elevate("caution", "REC_SLEEP_H_LOW_CAUTION", sleepHours);
    else if (sleepHours > 12) elevate("critical", "REC_SLEEP_H_HIGH_CRITICAL", sleepHours);
    else if (sleepHours > 9) elevate("caution", "REC_SLEEP_H_HIGH_CAUTION", sleepHours);

    // TH_MOOD: min_critical 1.5, min_normal 2.5
    if (mood < 1.5) elevate("critical", "REC_MOOD_LOW_CRITICAL", mood);
    else if (mood < 2.5) elevate("caution", "REC_MOOD_LOW_CAUTION", mood);

    // TH_STRESS: max_normal 3, max_critical 4.5
    if (stress > 4.5) elevate("critical", "REC_STRESS_HIGH_CRITICAL", stress);
    else if (stress > 3) elevate("caution", "REC_STRESS_HIGH_CAUTION", stress);

    return { level, triggeredRecs };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nowUtc = new Date().toISOString();
    const dateUtc = nowUtc.split("T")[0];
    const checkinId = crypto.randomUUID();

    // 1. Mirrors Dexie `checkins` -> Supabase `daily_checkins`
    const checkinRecord = {
      id: checkinId,
      user_id: userId,
      date: dateUtc,
      mood,
      sleep_hours: sleepHours,
      stress,
      notes: notes.trim() || null,
      syncStatus: "pending",
    };

    // 2. Mirrors `checkin_symptoms` using exact `symptoms.code` values from setup.sql
    const symptomRecords = selectedSymptoms.map((symptomCode) => ({
      checkin_id: checkinId,
      symptomCode,
      syncStatus: "pending",
    }));

    // 3. Mirrors Dexie `readings` -> Supabase `readings` (`indicatorCode` maps to `indicators.code`)
    const readingRecords = [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        indicatorCode: "SLEEP_H",
        value: sleepHours,
        measured_at: nowUtc,
        source: "simulated",
        syncStatus: "pending",
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        indicatorCode: "MOOD",
        value: mood,
        measured_at: nowUtc,
        source: "simulated",
        syncStatus: "pending",
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        indicatorCode: "STRESS",
        value: stress,
        measured_at: nowUtc,
        source: "simulated",
        syncStatus: "pending",
      },
    ];

    const payload = {
      checkin: checkinRecord,
      symptoms: symptomRecords,
      readings: readingRecords,
    };

    if (typeof onSaveCheckin === "function") {
      await onSaveCheckin(payload);
    } else {
      const queue = JSON.parse(localStorage.getItem("astro_checkins_queue") || "[]");
      const filtered = queue.filter(
        (item) => !(item.checkin.user_id === userId && item.checkin.date === dateUtc)
      );
      localStorage.setItem("astro_checkins_queue", JSON.stringify([...filtered, payload]));
    }

    setEvaluation(evaluateCheckin());
  };

  return (
    <section className="checkin-container">
      <header className="checkin-header">
        <div>
          <h1>{t.title}</h1>
          <p className="checkin-subtitle">{t.subtitle}</p>
        </div>
        <button
          type="button"
          className="lang-toggle-btn"
          onClick={() => setLang((prev) => (prev === "es" ? "en" : "es"))}
        >
          {lang === "es" ? "🇺🇸 EN" : "🇪🇸 ES"}
        </button>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="checkin-card">
          <h2>{t.moodLabel}</h2>
          <p className="checkin-subtitle">{t.moodHint}</p>
          <div className="scale-grid">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                className={`scale-btn ${mood === val ? "active" : ""}`}
                onClick={() => setMood(val)}
              >
                <strong>{val}</strong>
                <span>{t.moodOptions[val]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="checkin-card">
          <h2>{t.sleepLabel}</h2>
          <p className="checkin-subtitle">{t.sleepHint}</p>
          <div className="sleep-stepper">
            <button type="button" className="stepper-btn" onClick={() => adjustSleep(-0.5)}>
              −
            </button>
            <div className="sleep-display">
              {sleepHours} {t.sleepUnit}
            </div>
            <button type="button" className="stepper-btn" onClick={() => adjustSleep(0.5)}>
              +
            </button>
          </div>
        </div>

        <div className="checkin-card">
          <h2>{t.stressLabel}</h2>
          <p className="checkin-subtitle">{t.stressHint}</p>
          <div className="scale-grid">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                className={`scale-btn ${stress === val ? "active" : ""}`}
                onClick={() => setStress(val)}
              >
                <strong>{val}</strong>
                <span>{t.stressOptions[val]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="checkin-card">
          <h2>{t.symptomsLabel}</h2>
          <p className="checkin-subtitle">{t.symptomsHint}</p>
          <div className="symptoms-grid">
            {t.symptomsCatalog.map((sym) => {
              const active = selectedSymptoms.includes(sym.code);
              return (
                <button
                  key={sym.code}
                  type="button"
                  className={`symptom-btn ${active ? "selected" : ""}`}
                  onClick={() => toggleSymptom(sym.code)}
                >
                  {active ? "✓ " : "+ "}
                  {sym.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="checkin-card">
          <h2>{t.notesLabel}</h2>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
          />
        </div>

        <button type="submit" className="submit-checkin-btn">
          {t.submitButton}
        </button>

        {evaluation && (
          <div className={`triage-box ${evaluation.level}`}>
            <h3>
              {t.evalTitle}:{" "}
              {evaluation.level === "normal"
                ? t.statusNormal
                : evaluation.level === "caution"
                ? t.statusCaution
                : t.statusCritical}
            </h3>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>{t.savedSuccess}</p>
            <ul>
              {evaluation.triggeredRecs.length > 0 ? (
                evaluation.triggeredRecs.map((rec, idx) => <li key={idx}>{rec.text}</li>)
              ) : (
                <li>{t.recNominal}</li>
              )}
            </ul>
          </div>
        )}
      </form>
    </section>
  );
}
