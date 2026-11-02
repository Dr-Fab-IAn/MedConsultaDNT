import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Activity, PieChart as PieIcon, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import { DntPatient } from '../types/dnt';
import { MESES_DEL_ANIO } from '../utils/clinicalCalculations';

interface DntAnalyticsDashboardProps {
  patients: DntPatient[];
}

const PIE_COLORS = {
  soloHta: '#EF4444',
  soloDm: '#0D9488',
  ambos: '#8B5CF6',
  preventivo: '#94A3B8',
};

export const DntAnalyticsDashboard: React.FC<DntAnalyticsDashboardProps> = ({ patients }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Distribución por diagnóstico HTA / DM
  const soloHta = patients.filter((p) => p.tieneHta && !p.tieneDm).length;
  const soloDm = patients.filter((p) => !p.tieneHta && p.tieneDm).length;
  const ambos = patients.filter((p) => p.tieneHta && p.tieneDm).length;
  const preventivo = patients.filter((p) => !p.tieneHta && !p.tieneDm).length;
  const total = patients.length || 1;

  const distributionData = [
    { name: 'Solo HTA', value: soloHta, color: PIE_COLORS.soloHta, percent: Math.round((soloHta / total) * 100) },
    { name: 'Solo Diabetes', value: soloDm, color: PIE_COLORS.soloDm, percent: Math.round((soloDm / total) * 100) },
    { name: 'HTA + DM', value: ambos, color: PIE_COLORS.ambos, percent: Math.round((ambos / total) * 100) },
    { name: 'En Tamizaje', value: preventivo, color: PIE_COLORS.preventivo, percent: Math.round((preventivo / total) * 100) },
  ].filter((item) => item.value > 0);

  // 2. Adherencia y control mensual (Ene - Dic)
  const monthlyAdherenceData = MESES_DEL_ANIO.map((mes) => {
    let atendidos = 0;
    let controlados = 0;

    patients.forEach((p) => {
      const ctrl = p.controles?.[mes.id];
      if (ctrl?.atendido) {
        atendidos++;
        if (ctrl.controlado) {
          controlados++;
        }
      }
    });

    return {
      mes: mes.abrev,
      nombre: mes.nombre,
      Atendidos: atendidos,
      Controlados: controlados,
      tasaControl: atendidos > 0 ? Math.round((controlados / atendidos) * 100) : 0,
    };
  });

  const totalAtenciones = monthlyAdherenceData.reduce((acc, m) => acc + m.Atendidos, 0);
  const totalCompensados = monthlyAdherenceData.reduce((acc, m) => acc + m.Controlados, 0);
  const tasaCompensacionGlobal = totalAtenciones > 0 ? Math.round((totalCompensados / totalAtenciones) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Barra de título del dashboard card */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-700" />
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Panel Epidemiológico & Seguimiento Mensual
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            · {patients.length} pacientes evaluados
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Atenciones 2026: <strong className="font-mono text-slate-900">{totalAtenciones}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Control Clínico: <strong className="font-mono text-emerald-700">{tasaCompensacionGlobal}%</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors flex items-center gap-1 text-xs"
            title={isCollapsed ? 'Expandir gráficos' : 'Colapsar gráficos'}
          >
            <span>{isCollapsed ? 'Mostrar' : 'Ocultar'}</span>
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido con Recharts */}
      {!isCollapsed && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico 1: Distribución por Diagnóstico (Pie / Donut) */}
          <div className="lg:col-span-5 border border-slate-100 rounded-lg p-4 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <PieIcon className="w-4 h-4 text-teal-700" />
                <span>Distribución por Diagnóstico DNT</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Total: {patients.length}</span>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              {distributionData.length === 0 ? (
                <span className="text-xs text-slate-400">Sin datos de pacientes</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg font-mono">
                              <span className="font-sans font-bold">{data.name}: </span>
                              <span className="text-teal-300 font-bold">{data.value} pacientes</span> ({data.percent}%)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => (
                        <span className="text-xs text-slate-600 font-medium">
                          {value} ({entry.payload.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Micro-resumen cuantitativo */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">HTA</span>
                <span className="font-mono text-xs font-bold text-red-600 tabular-nums">
                  {soloHta + ambos}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Diabetes</span>
                <span className="font-mono text-xs font-bold text-teal-700 tabular-nums">
                  {soloDm + ambos}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ambos</span>
                <span className="font-mono text-xs font-bold text-purple-700 tabular-nums">
                  {ambos}
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico 2: Adherencia y Control Mensual (BarChart Ene - Dic) */}
          <div className="lg:col-span-7 border border-slate-100 rounded-lg p-4 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <BarChart3 className="w-4 h-4 text-teal-700" />
                <span>Adherencia y Pacientes Controlados por Mes (2026)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block"></span>
                  Atendidos
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block"></span>
                  Controlados
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyAdherenceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="mes"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded shadow-lg font-mono space-y-1">
                            <div className="font-sans font-bold text-slate-200 border-b border-slate-700 pb-0.5">
                              {data.nombre}
                            </div>
                            <div className="text-teal-300">
                              Atendidos: <span className="font-bold">{data.Atendidos}</span>
                            </div>
                            <div className="text-emerald-300">
                              Controlados: <span className="font-bold">{data.Controlados}</span> ({data.tasaControl}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Atendidos" fill="#0D9488" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Controlados" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Resumen al pie del gráfico mensual */}
            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
              <span>
                Meta MINSA: <strong className="text-slate-700">&gt; 70%</strong> de pacientes crónicos con PA y Glucosa controladas.
              </span>
              <span className="font-mono text-teal-800 font-semibold">
                {totalAtenciones} registros acumulados
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
