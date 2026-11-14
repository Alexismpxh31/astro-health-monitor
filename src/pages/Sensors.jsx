import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Wifi, 
  Battery, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  Sliders, 
  Activity, 
  Radio, 
  Cpu, 
  ShieldCheck 
} from 'lucide-react';
import { supabase } from '../sync/supabaseClient.js';
import { getPendingCount, syncPending } from '../sync/queue.js';
import { db } from '../db/db.js';

export default function Sensors() {
  const [syncCount, setSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [sensors, setSensors] = useState([
    { id: 'astroskin', name: 'Chaleco Inteligente Astroskin (ISS)', type: 'Cardio-Respiratorio', status: 'Conectado', battery: 92, rate: '1.8s', signal: '100%' },
    { id: 'biomonitor', name: 'Bio-Monitor CSA Smart Shirt', type: 'Electrocardiograma (ECG)', status: 'Conectado', battery: 88, rate: '1.0s', signal: '98%' },
    { id: 'dosimeter', name: 'Dosímetro Activo Liulin/Biorad', type: 'Radiación Cósmica GCR/SPE', status: 'Activo', battery: 95, rate: '5.0s', signal: '100%' },
    { id: 'pvt', name: 'Dispositivo Psychomotor Vigilance (PVT)', type: 'Neurocognitivo & Fatiga', status: 'En espera', battery: 84, rate: 'Bajo demanda', signal: '95%' }
  ]);

  useEffect(() => {
    getPendingCount().then(c => setSyncCount(c));
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncPending();
      setSyncResult(`Sincronización completada: ${res.pushed} registros enviados a Supabase.`);
      const remaining = await getPendingCount();
      setSyncCount(remaining);
    } catch (e) {
      setSyncResult('Error al sincronizar con Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-blue-600 font-bold uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            CONFIGURACIÓN DEL SISTEMA · TELEMETRÍA & BASE DE DATOS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0E1B3E] mt-1 tracking-tight">
            Hub de Sensores Biomédicos & Sincronización
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Gestión de telemetría de vuelo, periféricos biomédicos y enlace con Supabase Cloud.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar con Supabase'}
        </button>
      </div>

      {syncResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{syncResult}</span>
        </div>
      )}

      {/* Cloud & Local DB Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-bold uppercase">SUPABASE CLOUD</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
          </div>
          <div className="text-xl font-extrabold text-[#0E1B3E]">En línea · csjljgqcoanqxjuoxzsl</div>
          <p className="text-xs text-slate-500">PostgreSQL Backend activo con autenticación anónima y RLS habilitado.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-bold uppercase">DEXIE LOCAL DB (PWA)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" />
          </div>
          <div className="text-xl font-extrabold text-[#0E1B3E]">IndexedDB Conectado</div>
          <p className="text-xs text-slate-500">Almacenamiento local persistente para contingencias offline en órbita.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-bold uppercase">COLA DE SINCRONIZACIÓN</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Pendientes</span>
          </div>
          <div className="text-xl font-extrabold text-[#0E1B3E] tabular-nums">{syncCount} registros</div>
          <p className="text-xs text-slate-500">Lecturas biomédicas pendientes de envío al nodo de tierra.</p>
        </div>
      </div>

      {/* Sensor List Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-4">
        <h3 className="text-sm font-mono tracking-wider uppercase text-[#0E1B3E] font-bold flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          Dispositivos Biomédicos Emparejados
        </h3>

        <div className="space-y-3">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0E1B3E]">{sensor.name}</h4>
                  <span className="text-xs text-slate-500 font-mono">{sensor.type}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Wifi size={14} className="text-emerald-500" />
                  <span>Enlace: {sensor.signal}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Battery size={14} className="text-emerald-600" />
                  <span>{sensor.battery}%</span>
                </div>
                <div className="text-slate-600">
                  Tasa: <strong className="text-[#0E1B3E]">{sensor.rate}</strong>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● {sensor.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
