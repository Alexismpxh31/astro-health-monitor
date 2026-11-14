import { useState, useRef, useEffect } from "react";
import { dailyCheckinTranslations } from "../i18n/dailyCheckinLocale";
import "./ChequeoDiario.css";

export default function ChequeoDiario({ usuarioId = "astro-demo-01", onSaveCheckin }) {
  const [lang, setLang] = useState("es");
  const t = dailyCheckinTranslations[lang].dailyCheckin;

  const [animo, setAnimo] = useState(4);
  const [horasSueno, setHorasSueno] = useState(7.5);
  const [estres, setEstres] = useState(2);
  const [sintomasSeleccionados, setSintomasSeleccionados] = useState([]);
  const [notas, setNotas] = useState("");

  // Estado del Test de Vigilancia Psicomotora (PVT)
  const [pvtState, setPvtState] = useState("idle"); // idle | waiting | ready | early | done
  const [pvtMs, setPvtMs] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // Resultado de evaluación NASA
  const [evaluacion, setEvaluacion] = useState(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const iniciarPvt = () => {
    clearTimeout(timerRef.current);
    setPvtState("waiting");
    const delay = 1200 + Math.floor(Math.random() * 1800);
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setPvtState("ready");
    }, delay);
  };

  const manejarToquePvt = () => {
    if (pvtState === "idle" || pvtState === "done" || pvtState === "early") {
      iniciarPvt();
      return;
    }
    if (pvtState === "waiting") {
      clearTimeout(timerRef.current);
      setPvtState("early");
      return;
    }
    if (pvtState === "ready") {
      const latencia = Math.round(performance.now() - startTimeRef.current);
      setPvtMs(latencia);
      setPvtState("done");
    }
  };

  const toggleSintoma = (sintomaId) => {
    setSintomasSeleccionados((prev) =>
      prev.includes(sintomaId)
        ? prev.filter((id) => id !== sintomaId)
        : [...prev, sintomaId]
    );
  };

  const ajustarSueno = (delta) => {
    setHorasSueno((prev) => {
      const nuevo = Math.round((prev + delta) * 2) / 2;
      return Math.min(24, Math.max(0, nuevo));
    });
  };

  const calcularEvaluacionNasa = () => {
    let nivel = "verde";
    const recomendaciones = [];

    // Evaluación SLEEP (Nominal 6.5 - 9.0 h, Crítico < 4.0 o > 14.0 h)
    if (horasSueno < 4.0 || horasSueno > 14.0) {
      nivel = "rojo";
      recomendaciones.push(t.recSleepWarn);
    } else if (horasSueno < 6.5 || horasSueno > 9.0) {
      nivel = "amarillo";
      recomendaciones.push(t.recSleepWarn);
    }

    // Evaluación PVT (Precaución > 320 ms, Crítico > 450 ms)
    if (pvtMs !== null) {
      if (pvtMs > 450) {
        nivel = "rojo";
        recomendaciones.push(t.recPvtCrit);
      } else if (pvtMs > 320) {
        if (nivel !== "rojo") nivel = "amarillo";
        recomendaciones.push(t.recPvtWarn);
      }
    }

    // Contramedidas por síntomas HSRB específicos
    if (sintomasSeleccionados.includes("sym-02")) {
      if (nivel === "verde") nivel = "amarillo";
      recomendaciones.push(t.recSans);
    }
    if (sintomasSeleccionados.includes("sym-04")) {
      if (nivel === "verde") nivel = "amarillo";
      recomendaciones.push(t.recCo2);
    }

    if (recomendaciones.length === 0) {
      recomendaciones.push(t.recNominal);
    }

    return { nivel, recomendaciones };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nowUtc = new Date().toISOString();
    const fechaUtc = nowUtc.split("T")[0];
    const chequeoId = crypto.randomUUID();

    // 1. Tabla chequeos_diarios
    const registroChequeo = {
      id: chequeoId,
      usuario_id: usuarioId,
      fecha: fechaUtc,
      animo,
      horas_sueno: horasSueno,
      estres,
      notas: notas.trim(),
      registrado_en: nowUtc,
      estado_sync: "pendiente",
    };

    // 2. Tabla puente chequeo_sintomas
    const registrosSintomas = sintomasSeleccionados.map((sintomaId) => ({
      chequeo_id: chequeoId,
      sintoma_id: sintomaId,
    }));

    // 3. Lecturas fisiológicas estándar para tabla lecturas (SLEEP y PVT)
    const lecturasGeneradas = [
      {
        id: crypto.randomUUID(),
        usuario_id: usuarioId,
        indicador_codigo: "SLEEP",
        valor: horasSueno,
        unidad: "h/24h",
        medido_en: nowUtc,
        estado_sync: "pendiente",
      },
    ];

    if (pvtMs !== null) {
      lecturasGeneradas.push({
        id: crypto.randomUUID(),
        usuario_id: usuarioId,
        indicador_codigo: "PVT",
        valor: pvtMs,
        unidad: "ms",
        medido_en: nowUtc,
        estado_sync: "pendiente",
      });
    }

    const payload = {
      chequeo: registroChequeo,
      sintomas: registrosSintomas,
      lecturas: lecturasGeneradas,
    };

    if (typeof onSaveCheckin === "function") {
      onSaveCheckin(payload);
    } else {
      const existentes = JSON.parse(localStorage.getItem("chequeos_diarios_queue") || "[]");
      const filtrados = existentes.filter(
        (item) => !(item.chequeo.usuario_id === usuarioId && item.chequeo.fecha === fechaUtc)
      );
      localStorage.setItem("chequeos_diarios_queue", JSON.stringify([...filtrados, payload]));
    }

    setEvaluacion(calcularEvaluacionNasa());
  };

  const textoBotonPvt = {
    idle: t.pvtStart,
    waiting: t.pvtWait,
    ready: t.pvtTapNow,
    early: t.pvtEarly,
    done: t.pvtRetry,
  }[pvtState];

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
        {/* 1. Ánimo */}
        <div className="checkin-card">
          <h2>{t.moodLabel}</h2>
          <div className="scale-grid">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button
                key={valor}
                type="button"
                className={`scale-btn ${animo === valor ? "active" : ""}`}
                onClick={() => setAnimo(valor)}
              >
                <strong>{valor}</strong>
                <span>{t.moodOptions[valor]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Horas de sueño (SLEEP) */}
        <div className="checkin-card">
          <h2>{t.sleepLabel}</h2>
          <p className="checkin-subtitle">{t.sleepHint}</p>
          <div className="sleep-stepper">
            <button type="button" className="stepper-btn" onClick={() => ajustarSueno(-0.5)}>
              −
            </button>
            <div className="sleep-display">
              {horasSueno} {t.sleepUnit}
            </div>
            <button type="button" className="stepper-btn" onClick={() => ajustarSueno(0.5)}>
              +
            </button>
          </div>
        </div>

        {/* 3. Estrés */}
        <div className="checkin-card">
          <h2>{t.stressLabel}</h2>
          <div className="scale-grid">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button
                key={valor}
                type="button"
                className={`scale-btn ${estres === valor ? "active" : ""}`}
                onClick={() => setEstres(valor)}
              >
                <strong>{valor}</strong>
                <span>{t.stressOptions[valor]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Test PVT */}
        <div className="checkin-card">
          <h2>{t.pvtTitle}</h2>
          <p className="checkin-subtitle">{t.pvtSubtitle}</p>
          <button
            type="button"
            className={`pvt-pad ${pvtState}`}
            onClick={manejarToquePvt}
          >
            {textoBotonPvt}
          </button>
          {pvtMs !== null && (
            <div className="pvt-result-badge">
              {t.pvtResultLabel} {pvtMs} ms
            </div>
          )}
        </div>

        {/* 5. Síntomas HSRB */}
        <div className="checkin-card">
          <h2>{t.symptomsLabel}</h2>
          <p className="checkin-subtitle">{t.symptomsHint}</p>
          <div className="symptoms-grid">
            {t.symptomsCatalog.map((sintoma) => {
              const activo = sintomasSeleccionados.includes(sintoma.id);
              return (
                <button
                  key={sintoma.id}
                  type="button"
                  className={`symptom-btn ${activo ? "selected" : ""}`}
                  onClick={() => toggleSintoma(sintoma.id)}
                >
                  {activo ? "✓ " : "+ "}
                  {sintoma.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Notas */}
        <div className="checkin-card">
          <h2>{t.notesLabel}</h2>
          <textarea
            className="notes-textarea"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder={t.notesPlaceholder}
          />
        </div>

        <button type="submit" className="submit-checkin-btn">
          {t.submitButton}
        </button>

        {evaluacion && (
          <div className={`triage-box ${evaluacion.nivel}`}>
            <h3>
              {t.evalTitle}:{" "}
              {evaluacion.nivel === "verde"
                ? t.statusGreen
                : evaluacion.nivel === "amarillo"
                ? t.statusYellow
                : t.statusRed}
            </h3>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>{t.savedSuccess}</p>
            <ul>
              {evaluacion.recomendaciones.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </section>
  );
}
