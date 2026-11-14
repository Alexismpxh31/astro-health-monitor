import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db.js';
import { recommendationText } from '../rules/engine.js';
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
  CheckCircle2,
  Bell,
  Clock
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
  const { t, i18n } = useTranslation();
  const [selectedProtocol, setSelectedProtocol] = useState(EMERGENCY_PROTOCOLS[0]);

  // Load live alerts from Dexie db.alerts joined with reading & recommendation
  const liveAlerts = useLiveQuery(async () => {
    try {
      const alerts = await db.alerts.orderBy('generatedAt').reverse().limit(6).toArray();
      const levels = await db.alertLevels.toArray();
      return Promise.all(
        alerts.map(async (alert) => ({
          ...alert,
          reading: await db.readings.get(alert.readingId),
          level: levels.find((l) => l.id === alert.alertLevelId),
          recommendation: alert.recommendationId ? await db.recommendations.get(alert.recommendationId) : null
        }))
      );
    } catch {
      return [];
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div 
        style={{
          padding: '22px 26px',
          borderRadius: '20px',
          background: '#FFFFFF',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <span 
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#0284C7',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <HelpCircle size={15} color="#0284C7" />
            CENTRO MÉDICO DE AYUDA Y CONTINGENCIAS · NASA HRP
          </span>
          <h1 
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#0E1B3E',
              margin: '4px 0 2px 0',
              letterSpacing: '-0.02em'
            }}
          >
            Alertas de Telemetría & Protocolos de Emergencia
          </h1>
          <p style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', margin: 0 }}>
            Reglas clínicas de NASA HRP integradas con Dexie y procedimientos operativos para misiones de larga duración.
          </p>
        </div>

        {/* Houston CAPCOM Comm Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Radio size={15} color="#2563EB" />
            <span>Enlace Houston: <strong style={{ color: '#059669' }}>ACTIVO</strong></span>
          </div>
        </div>
      </div>

      {/* Live Alerts Stream from Dexie */}
      {liveAlerts && liveAlerts.length > 0 && (
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0E1B3E', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#DC2626" />
              Alertas Generadas por el Motor de Reglas (Dexie Live)
            </h3>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>
              {liveAlerts.length} alertas recientes registradas
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {liveAlerts.map((alert) => {
              const isCrit = alert.level?.code === 'critical';
              const recText = alert.recommendation 
                ? recommendationText(alert.recommendation, alert.reading, i18n.resolvedLanguage || 'es')
                : 'Monitorear evolución con médico de vuelo.';
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: isCrit ? '1px solid #FECACA' : '1px solid #FDE68A',
                    background: isCrit ? '#FEF2F2' : '#FFFBEB',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span 
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        color: isCrit ? '#DC2626' : '#D97706',
                        background: '#FFFFFF',
                        border: isCrit ? '1px solid #FCA5A5' : '1px solid #FCD34D'
                      }}
                    >
                      ● {alert.level?.nameEs || alert.level?.code || 'Alerta'}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      {new Date(alert.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0E1B3E' }}>
                    Indicador: {alert.reading?.indicatorCode || 'Sensor'} · Valor:{' '}
                    <span style={{ color: isCrit ? '#DC2626' : '#D97706' }}>
                      {alert.reading?.value} {alert.reading?.unit}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                    <strong>Recomendación HRP:</strong> {recText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Protocols List & Protocol Detail */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Protocol Selectors */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <h3 style={{ fontSize: '14px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0E1B3E', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} color="#0284C7" />
            Protocolos de Contingencia Inmediata
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {EMERGENCY_PROTOCOLS.map((proto) => {
              const isSelected = proto.id === selectedProtocol.id;
              return (
                <div
                  key={proto.id}
                  onClick={() => setSelectedProtocol(proto)}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: isSelected ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                    background: isSelected ? '#F0F9FF' : '#FAFCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '700', textTransform: 'uppercase', color: '#64748B' }}>
                      {proto.category}
                    </span>
                    <span 
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: proto.color,
                        backgroundColor: proto.bg
                      }}
                    >
                      ● {proto.severity}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0E1B3E', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                    {proto.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: '#0284C7', fontWeight: '700' }}>
                    <span>{proto.steps.length} pasos de acción</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Protocol Checklist */}
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div>
            <span 
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '10.5px',
                fontWeight: '800',
                fontFamily: 'monospace',
                display: 'inline-block',
                marginBottom: '8px',
                color: selectedProtocol.color,
                backgroundColor: selectedProtocol.bg
              }}
            >
              {selectedProtocol.category} · Severidad {selectedProtocol.severity}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0E1B3E', margin: 0, letterSpacing: '-0.02em' }}>
              {selectedProtocol.title}
            </h2>
          </div>

          <div style={{ height: '1px', background: '#E2E8F0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '11.5px', fontFamily: 'monospace', textTransform: 'uppercase', color: '#64748B', fontWeight: '700', margin: 0 }}>
              Lista de Verificación de Pasos Obligatorios:
            </h4>

            {selectedProtocol.steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#334155',
                  lineHeight: '1.5'
                }}
              >
                <div 
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '11px',
                    flexShrink: 0,
                    marginTop: '1px'
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>{step}</div>
              </div>
            ))}
          </div>

          <div 
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <FileText size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Referencia Oficial NASA HRP:</strong> Documento NASA-STD-3001 Vol 1 & Vol 2 (Crew Health and Medical Operations).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
