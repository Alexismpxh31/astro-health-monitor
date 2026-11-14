import React, { useState } from 'react';
import { 
  HelpCircle, 
  AlertTriangle, 
  PhoneCall, 
  ShieldAlert, 
  FileText, 
  HeartPulse, 
  Radio, 
  ExternalLink,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

const EMERGENCY_PROTOCOLS = [
  {
    id: 'hypoxia',
    title: 'Protocolo de Hipoxia Aguda / Caída de SpO₂ (< 90%)',
    category: 'Soporte Vital',
    severity: 'Crítica',
    color: '#DC2626',
    bg: '#FEF2F2',
    steps: [
      'Verificar sellado de casco y presión interna de traje EVA (> 4.3 psi).',
      'Activar válvula de oxígeno de emergencia del PLSS a flujo máximo.',
      'Informar inmediatamente a CAPCOM Houston con reporte de SpO₂ y frecuencia de pulso.',
      'Cesar cualquier esfuerzo físico y entrar a esclusa de descompresión.'
    ]
  },
  {
    id: 'arrhythmia',
    title: 'Protocolo de Arritmia / Taquicardia Súbita (> 130 bpm)',
    category: 'Cardiovascular',
    severity: 'Alerta',
    color: '#D97706',
    bg: '#FFFBEB',
    steps: [
      'Suspender ejercicio en cicloergómetro CEVIS o máquina ARED.',
      'Ingerir 400 ml de solución electrolítica balanceada para restaurar volemia.',
      'Iniciar registro continuo de ECG de 12 derivaciones en Bio-Monitor.',
      'Monitorear presión arterial cada 5 minutos hasta retorno a rango nominal (60-100 bpm).'
    ]
  },
  {
    id: 'radiation',
    title: 'Protocolo de Evento de Partículas Solares (SPE / Alerta de Radiación)',
    category: 'Radiación Cósmica',
    severity: 'Prioritaria',
    color: '#7C3AED',
    bg: '#F5F3FF',
    steps: [
      'Abortar actividad extravehicular (EVA) y regresar de inmediato al módulo presurizado.',
      'Refugiarse en el compartimiento de blindaje reforzado (Zvezda / Módulo habitable).',
      'Verificar dosímetros pasivos y activos Liulin.',
      'Seguir instrucciones de la División Médica de Vuelo sobre medicación radioprotectora.'
    ]
  },
  {
    id: 'sans',
    title: 'Protocolo de Síndrome Neuro-Ocular Asociado al Vuelo Espacial (SANS)',
    category: 'Neuro-Oftalmológico',
    severity: 'Moderada',
    color: '#2563EB',
    bg: '#EFF6FF',
    steps: [
      'Realizar ecografía del nervio óptico y medición del diámetro de la vaina (ONSD).',
      'Completar test de agudeza visual y rejilla de Amsler en pantalla.',
      'Aplicar sesión de Presión Negativa en la Parte Inferior del Cuerpo (LBNP) durante 45 min.',
      'Registrar síntomas de visión borrosa o cefalea en el diario médico.'
    ]
  }
];

export default function Alerts() {
  const [selectedProtocol, setSelectedProtocol] = useState(EMERGENCY_PROTOCOLS[0]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-blue-600 font-bold uppercase tracking-widest flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            CENTRO MÉDICO DE AYUDA Y CONTINGENCIAS · NASA HRP
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0E1B3E] mt-1 tracking-tight">
            Guía Clínica de Emergencia & Soporte al Vuelo
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Procedimientos operativos estandarizados validados por el Human Research Program para misiones Artemis.
          </p>
        </div>

        {/* Houston CAPCOM Comm Button */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono font-bold flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
            <span>Enlace Houston: <strong className="text-emerald-600">ACTIVO</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Protocols List & Protocol Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Protocol Selectors */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-mono tracking-wider uppercase text-[#0E1B3E] font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            Protocolos de Contingencia Inmediata
          </h3>

          <div className="space-y-3">
            {EMERGENCY_PROTOCOLS.map((proto) => {
              const isSelected = proto.id === selectedProtocol.id;
              return (
                <div
                  key={proto.id}
                  onClick={() => setSelectedProtocol(proto)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-[0_4px_16px_rgba(37,99,235,0.12)]'
                      : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      {proto.category}
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ color: proto.color, backgroundColor: proto.bg }}
                    >
                      ● {proto.severity}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0E1B3E] mb-2 leading-snug">
                    {proto.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs font-mono text-blue-600 font-bold">
                    <span>{proto.steps.length} pasos de acción</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Protocol Checklist */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span 
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono inline-block mb-2"
                  style={{ color: selectedProtocol.color, backgroundColor: selectedProtocol.bg }}
                >
                  {selectedProtocol.category} · Severidad {selectedProtocol.severity}
                </span>
                <h2 className="text-xl font-extrabold text-[#0E1B3E] tracking-tight">
                  {selectedProtocol.title}
                </h2>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Lista de Verificación de Pasos Obligatorios:
              </h4>

              <div className="space-y-2.5">
                {selectedProtocol.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-start gap-3.5 text-xs font-mono text-slate-700 leading-relaxed"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs font-mono text-blue-900 flex items-start gap-3">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Referencia Oficial NASA HRP:</strong> Documento NASA-STD-3001 Vol 1 & Vol 2 (Crew Health and Medical Operations).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
