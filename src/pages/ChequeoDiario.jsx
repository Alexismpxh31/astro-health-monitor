import { useState } from "react";
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
  const [guardadoMsg, setGuardadoMsg] = useState("");

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
      return Math.min(24, Math.max(0, nuevo)); // CHECK horas_sueno entre 0 y 24
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nowUtc = new Date().toISOString();
    const fechaUtc = nowUtc.split("T")[0]; // UNIQUE (usuario_id, fecha)
    const chequeoId = crypto.randomUUID(); // UUID generado en el dispositivo

    // Registro para tabla chequeos_diarios + estado_sync para IndexedDB
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

    // Registros para tabla puente chequeo_sintomas
    const registrosSintomas = sintomasSeleccionados.map((sintomaId) => ({
      chequeo_id: chequeoId,
      sintoma_id: sintomaId,
    }));

    const payload = {
      chequeo: registroChequeo,
      sintomas: registrosSintomas,
    };

    // Si Luis ya conectó Dexie via prop, lo usa; si no, guarda respaldo en localStorage
    if (typeof onSaveCheckin === "function") {
      onSaveCheckin(payload);
    } else {
      const existentes = JSON.parse(localStorage.getItem("chequeos_diarios_queue") || "[]");
      const filtrados = existentes.filter(
        (item) => !(item.chequeo.usuario_id === usuarioId && item.chequeo.fecha === fechaUtc)
      );
      localStorage.setItem("chequeos_diarios_queue", JSON.stringify([...filtrados, payload]));
    }

    setGuardadoMsg(t.savedSuccess);
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
        {/* 1. Ánimo (1 a 5) */}
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

        {/* 2. Horas de sueño (0 a 24) */}
        <div className="checkin-card">
          <h2>{t.sleepLabel}</h2>
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

        {/* 3. Estrés (1 a 5) */}
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

        {/* 4. Síntomas */}
        <div className="checkin-card">
          <h2>{t.symptomsLabel}</h2>
          <p className="checkin-subtitle" style={{ marginBottom: "0.75rem" }}>
            {t.symptomsHint}
          </p>
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

        {/* 5. Notas */}
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

        {guardadoMsg && <div className="status-banner">{guardadoMsg}</div>}
      </form>
    </section>
  );
}