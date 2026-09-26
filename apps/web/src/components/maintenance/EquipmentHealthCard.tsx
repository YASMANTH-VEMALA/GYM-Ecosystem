'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Wrench,
  Calendar,
  History,
  Activity,
  ShieldCheck,
  ChevronRight,
  Printer,
  X,
  PlusCircle,
} from 'lucide-react';

export type EquipmentData = {
  id: string;
  name: string;
  code: string;
  category: string;
  brand: string;
  status: 'healthy' | 'service_due' | 'overdue';
  totalUsageHours: number;
  lastServiceDate: string;
  nextServiceHours: number | string;
  assignedTech: string;
  healthMetrics: {
    motor: number;
    belt: number;
    incline: number;
    console: number;
  };
  serviceHistory: Array<{
    id: string;
    date: string;
    technician: string;
    type: string;
    notes: string;
    cost?: string;
  }>;
};

interface EquipmentHealthCardProps {
  equipment: EquipmentData;
  onBack?: () => void;
  onScheduleService?: (equipment: EquipmentData) => void;
}

export function EquipmentHealthCard({
  equipment,
  onBack,
  onScheduleService,
}: EquipmentHealthCardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'history'>('overview');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const getStatusBadge = (status: EquipmentData['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Healthy
          </span>
        );
      case 'service_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Service Due
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Overdue
          </span>
        );
    }
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-emerald-500';
    if (value >= 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0F172A] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#0B0F19]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-base font-medium text-white tracking-wide">
            Equipment Health Card
          </h2>
        </div>
        <button
          onClick={() => setShowQrModal(true)}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors shadow-sm"
          title="Scan or View QR Code"
        >
          <QrCode size={19} />
        </button>
      </div>

      {/* Equipment Header Card */}
      <div className="p-5 border-b border-slate-800/60 bg-gradient-to-b from-[#131E35] to-[#0F172A]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-slate-800/90 border border-slate-700/60 p-2 flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
              <Activity className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white tracking-tight">
                  {equipment.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {equipment.category} • {equipment.brand}
              </p>
              <div className="mt-2">{getStatusBadge(equipment.status)}</div>
            </div>
          </div>

          <button
            onClick={() => setShowQrModal(true)}
            className="hidden sm:flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-all hover:border-slate-700"
          >
            <QrCode size={24} className="text-slate-300" />
            <span className="text-[10px] font-mono tracking-wider text-slate-400">
              {equipment.code}
            </span>
          </button>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b border-slate-800/80 bg-[#0C1322] px-3 pt-2">
        {(['overview', 'maintenance', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'maintenance' ? 'Maintenance' : 'History'}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="p-5 space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* 4 Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Total Usage</span>
                <span className="text-lg font-semibold text-white font-mono mt-1 block">
                  {equipment.totalUsageHours} hrs
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Last Service</span>
                <span className="text-sm font-medium text-white font-mono mt-1.5 block">
                  {equipment.lastServiceDate}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Next Service</span>
                <span className="text-lg font-semibold text-cyan-400 font-mono mt-1 block">
                  {typeof equipment.nextServiceHours === 'number'
                    ? `${equipment.nextServiceHours} hrs`
                    : equipment.nextServiceHours}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Assigned To</span>
                <span className="text-sm font-medium text-white mt-1.5 block truncate">
                  {equipment.assignedTech}
                </span>
              </div>
            </div>

            {/* Health Status Section with Bars */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Health Status
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck size={13} /> Live Telemetry
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Motor', val: equipment.healthMetrics.motor },
                  { label: 'Belt', val: equipment.healthMetrics.belt },
                  { label: 'Incline', val: equipment.healthMetrics.incline },
                  { label: 'Console', val: equipment.healthMetrics.console },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{metric.label}</span>
                      <span className="font-mono text-slate-200 font-medium">{metric.val}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                          metric.val
                        )}`}
                        style={{ width: `${metric.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <History size={15} />
                View Service History
              </button>
              {onScheduleService && (
                <button
                  onClick={() => onScheduleService(equipment)}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950"
                >
                  <Wrench size={15} />
                  Schedule Maintenance
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Preventive Maintenance Checklist
              </h4>
              <div className="space-y-2 text-xs">
                {[
                  { task: 'Deck & belt lubrication', due: 'Every 50 hrs', done: true },
                  { task: 'Motor sensor & belt alignment check', due: 'Every 100 hrs', done: true },
                  { task: 'Incline elevation calibration', due: 'Every 150 hrs', done: false },
                  { task: 'Emergency stop & safety cord test', due: 'Weekly', done: true },
                  { task: 'Power cord & plug wear inspection', due: 'Monthly', done: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.done ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className={item.done ? 'text-slate-300' : 'text-slate-100 font-medium'}>
                        {item.task}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{item.due}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center justify-between">
              <div>
                <h5 className="text-xs font-medium text-cyan-300">Telemetry Sensor Online</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  IoT gateway reporting motor temperature 34°C (Normal)
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Recent Service Logs
            </h4>
            <div className="space-y-2.5">
              {equipment.serviceHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{item.type}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{item.date}</span>
                  </div>
                  <p className="text-xs text-slate-400">{item.notes}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Tech: {item.technician}</span>
                    {item.cost && <span className="font-mono text-slate-300">{item.cost}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                Equipment QR Tag
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-lg">
              <svg
                className="w-44 h-44 mx-auto text-slate-950"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <rect width="30" height="30" rx="4" fill="#0F172A" />
                <rect x="6" y="6" width="18" height="18" fill="#FFFFFF" />
                <rect x="10" y="10" width="10" height="10" fill="#0F172A" />

                <rect x="70" width="30" height="30" rx="4" fill="#0F172A" />
                <rect x="76" y="6" width="18" height="18" fill="#FFFFFF" />
                <rect x="80" y="10" width="10" height="10" fill="#0F172A" />

                <rect y="70" width="30" height="30" rx="4" fill="#0F172A" />
                <rect x="6" y="76" width="18" height="18" fill="#FFFFFF" />
                <rect x="10" y="80" width="10" height="10" fill="#0F172A" />

                <rect x="36" y="10" width="8" height="18" fill="#0F172A" />
                <rect x="48" y="6" width="14" height="8" fill="#0F172A" />
                <rect x="40" y="36" width="20" height="20" rx="3" fill="#0F172A" />
                <rect x="45" y="45" width="10" height="10" fill="#10B981" />

                <rect x="68" y="42" width="10" height="24" fill="#0F172A" />
                <rect x="12" y="44" width="18" height="12" fill="#0F172A" />
                <rect x="38" y="72" width="24" height="12" fill="#0F172A" />
                <rect x="72" y="76" width="16" height="16" fill="#0F172A" />
              </svg>
            </div>

            <div>
              <h4 className="text-base font-semibold text-white">{equipment.name}</h4>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">{equipment.code}</p>
              <p className="text-xs text-slate-400 mt-1">
                Technicians can scan this QR code on the machine to immediately log maintenance or view telemetry.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-2 border border-slate-600 transition-colors"
            >
              <Printer size={15} />
              Print QR Machine Badge
            </button>
          </div>
        </div>
      )}

      {/* History Full Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Full Service History</h3>
                <p className="text-xs text-slate-400">{equipment.name} ({equipment.code})</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {equipment.serviceHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-300">{item.type}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{item.date}</span>
                  </div>
                  <p className="text-xs text-slate-300">{item.notes}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Verified Technician: {item.technician}</span>
                    <span className="font-mono text-emerald-400">{item.cost || 'Routine Warranty'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
