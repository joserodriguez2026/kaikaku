// ─────────────────────────────────────────────────────────────────────────────
// KAIKAKU Mexicali — React + Firebase Firestore (real-time)
//
// SETUP:
//  1. npm install firebase
//  2. Reemplaza los valores de firebaseConfig con los de tu proyecto Firebase
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  Plus, Trash2, X, ChevronDown, ChevronRight,
  Edit3, BarChart2, User, Calendar, MapPin,
  Layers, TrendingUp, TrendingDown, CheckCircle,
  Clock, Lock, Flag, Loader
} from "lucide-react";

// ── Firebase ──────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc,
  onSnapshot, setDoc, deleteDoc, getDocs
} from "firebase/firestore";

// 🔧 REEMPLAZA ESTOS VALORES con los de tu proyecto en Firebase Console
// (Firebase Console → Project Settings → Your Apps → SDK setup → Config)
const firebaseConfig = {
  apiKey: "AIzaSyCIMTuck7pvWLgVwIOXRjdudOQMGYKH_6A",
  authDomain: "kaikaku-mexicali.firebaseapp.com",
  projectId: "kaikaku-mexicali",
  storageBucket: "kaikaku-mexicali.firebasestorage.app",
  messagingSenderId: "295914031234",
  appId: "1:295914031234:web:a4af8a5f3b51564aa04c9b",
  measurementId: "G-94M8FRZ6EH"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const COL = "kaizens";

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_PIN = "Ascotech2026";

const MAIN_STEPS = [
  "Define Project Scope","Analyze Historical & Forecast Demand",
  "Create Project Charter","Organize Current State Sorting Session",
  "Create Value Stream Mapping","Time Study",
  "Revise Operations & Opportunities","Yamazumi",
  "Organize 3P Exercise","Relay Out After 3P","Training Team","Relay Out",
  "Organize 1-Hour Chrono TAKT","Keep Standard",
  "Identify Wastes & Opportunities","Lessons Learned & Celebrate",
];

const UNITS = [
  "%","min","hrs","seg","días","semanas","meses",
  "pzas","unidades","lotes","turnos","operadores","líneas","ciclos",
  "m","cm","mm","km","m²","ft²",
  "kg","lb","g","oz","ton",
  "$","USD","MXN","€",
  "defectos","PPM","DPMO","Sigma","ratio","índice","score","dB","°C","rpm"
];

const makeSteps = () => MAIN_STEPS.map(n => ({ nombre: n, tareas: [] }));

const seedData = [
  { id:"1", nombre:"8210",    area:"Ensamble de Válvulas", fechaInicio:"2025-01", fechaFin:"2025-03", responsable:"Xavier Malige y Paul Prado", estatus:"Completado", fotos:[], kpis:[], steps:makeSteps() },
  { id:"2", nombre:"8210-II", area:"Ensamble de Válvulas", fechaInicio:"2025-04", fechaFin:"2025-07", responsable:"Paul Prado",                 estatus:"Completado", fotos:[], kpis:[], steps:makeSteps() },
  { id:"3", nombre:"8262",    area:"Ensamble de Válvulas", fechaInicio:"2025-09", fechaFin:"2025-11", responsable:"Jose Rodriguez",             estatus:"Completado", fotos:[], kpis:[], steps:makeSteps() },
  { id:"4", nombre:"KITS",    area:"Ensamble de Válvulas", fechaInicio:"2025-12", fechaFin:"2026-02", responsable:"Jose Rodriguez",             estatus:"Completado", fotos:[], kpis:[], steps:makeSteps() },
];

const emptyForm = {
  nombre:"", area:"Ensamble de Válvulas", fechaInicio:"", fechaFin:"",
  responsable:"", estatus:"En Progreso", fotos:[], kpis:[], steps:makeSteps()
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcStepPct = (step) =>
  !step.tareas.length ? 0
  : Math.round(step.tareas.reduce((s, t) => s + t.avance, 0) / step.tareas.length);

const isUnlocked = (steps, si) => {
  if (si === 0) return true;
  const prev = steps[si - 1];
  return prev.tareas.length > 0 && prev.tareas.every(t => t.avance >= 100);
};

const calcKaizenPct = (steps, done) => {
  if (done) return 100;
  return Math.round(steps.reduce((s, step) => s + calcStepPct(step), 0) / steps.length);
};

const barColor = p => p >= 100 ? "bg-green-500" : p >= 70 ? "bg-lime-400" : p >= 40 ? "bg-yellow-400" : "bg-red-400";
const pctColor = p => p >= 100 ? "text-green-600" : p >= 70 ? "text-lime-600" : p >= 40 ? "text-yellow-500" : "text-red-500";

const ymToMs    = ym => { if (!ym) return null; const [y,m]=ym.split("-").map(Number); return new Date(y,m-1,1).getTime(); };
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const formatYM  = ym => { if (!ym) return ""; const [y,m]=ym.split("-").map(Number); return `${MONTHS_ES[m-1]} ${y}`; };

// ── Bar ───────────────────────────────────────────────────────────────────────
function Bar({ pct, h="h-2.5" }) {
  return (
    <div className={`w-full bg-gray-100 rounded-full ${h}`}>
      <div className={`${h} rounded-full transition-all duration-500 ${barColor(Math.min(pct,100))}`} style={{width:`${Math.min(pct,100)}%`}}/>
    </div>
  );
}

// ── PIN Modal ─────────────────────────────────────────────────────────────────
function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const check = () => { if(pin===ADMIN_PIN){ onSuccess(); } else { setErr(true); setPin(""); } };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800 text-sm">Acceso de Administrador</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Ingresa el PIN para habilitar la edición.</p>
        <input type="password" maxLength={20} value={pin}
          onChange={e=>{setPin(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&check()}
          className={`w-full border rounded-xl px-3 py-2 text-center text-lg tracking-widest font-bold mb-2 focus:outline-none ${err?"border-red-400 bg-red-50":"border-gray-200"}`}
          placeholder="••••••••" autoFocus/>
        {err&&<p className="text-xs text-red-500 text-center mb-2">PIN incorrecto.</p>}
        <button onClick={check} className="w-full bg-gray-900 text-white rounded-xl py-2 text-sm font-semibold hover:bg-gray-700 mt-1">Ingresar</button>
      </div>
    </div>
  );
}

// ── KPI Table Edit ────────────────────────────────────────────────────────────
function KpiTableEdit({ kpis, onChange }) {
  const add = () => onChange([...kpis, { nombre:"", valorActual:"", valorObjetivo:"", unidad:"%" }]);
  const upd = (i,k,v) => onChange(kpis.map((r,j)=>j===i?{...r,[k]:v}:r));
  const del = (i) => onChange(kpis.filter((_,j)=>j!==i));
  return (
    <div>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600">KPI</th>
              <th className="text-center px-2 py-2.5 font-semibold text-orange-600 w-20">Actual</th>
              <th className="text-center px-2 py-2.5 font-semibold text-blue-600 w-20">Objetivo</th>
              <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-28">Unidad</th>
              <th className="w-8"/>
            </tr>
          </thead>
          <tbody>
            {kpis.length===0&&<tr><td colSpan={5} className="text-center text-gray-400 italic py-5 text-xs">Sin KPIs. Agrega uno.</td></tr>}
            {kpis.map((r,i)=>(
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5"><input className="w-full border rounded-lg px-2 py-1 text-xs" value={r.nombre} onChange={e=>upd(i,"nombre",e.target.value)} placeholder="Indicador"/></td>
                <td className="px-2 py-1.5"><input className="w-full border rounded-lg px-2 py-1 text-xs text-center" value={r.valorActual} onChange={e=>upd(i,"valorActual",e.target.value)} placeholder="0"/></td>
                <td className="px-2 py-1.5"><input className="w-full border rounded-lg px-2 py-1 text-xs text-center" value={r.valorObjetivo} onChange={e=>upd(i,"valorObjetivo",e.target.value)} placeholder="0"/></td>
                <td className="px-2 py-1.5">
                  <select className="w-full border rounded-lg px-1 py-1 text-xs" value={r.unidad} onChange={e=>upd(i,"unidad",e.target.value)}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center"><button onClick={()=>del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"><Plus size={12}/> Agregar KPI</button>
    </div>
  );
}

// ── KPI Display ───────────────────────────────────────────────────────────────
function KpiDisplay({ kpis }) {
  if (!kpis.length) return <p className="text-xs text-gray-400 italic">Sin KPIs registrados.</p>;
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-3 py-2.5 font-semibold text-gray-600">KPI</th>
            <th className="text-center px-3 py-2.5 font-semibold text-orange-600">Actual</th>
            <th className="text-center px-3 py-2.5 font-semibold text-blue-600">Objetivo</th>
            <th className="text-center px-3 py-2.5 font-semibold text-green-600">Mejora</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((r,i)=>{
            const a=parseFloat(r.valorActual), o=parseFloat(r.valorObjetivo);
            let mejora=null;
            if(!isNaN(a)&&!isNaN(o)&&a!==0){ const d=((o-a)/Math.abs(a)*100).toFixed(1); mejora={val:d,pos:o>=a}; }
            return (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-semibold text-gray-700">{r.nombre}</td>
                <td className="px-3 py-2.5 text-center"><span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-medium">{r.valorActual} {r.unidad}</span></td>
                <td className="px-3 py-2.5 text-center"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-medium">{r.valorObjetivo} {r.unidad}</span></td>
                <td className="px-3 py-2.5 text-center">
                  {mejora
                    ? <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg font-bold ${mejora.pos?"bg-green-50 text-green-600":"bg-red-50 text-red-500"}`}>
                        {mejora.pos?<TrendingUp size={10}/>:<TrendingDown size={10}/>}{mejora.pos?"+":""}{mejora.val}%
                      </span>
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Steps Editor ──────────────────────────────────────────────────────────────
function StepsEditor({ steps, onChange }) {
  const [open, setOpen] = useState(null);
  const [nt, setNt] = useState({});
  const addTask = (si) => {
    const t = nt[si]; if (!t?.nombre?.trim()) return;
    onChange(steps.map((s,i)=>i!==si?s:{...s,tareas:[...s.tareas,{nombre:t.nombre.trim(),responsable:t.responsable||"",avance:0}]}));
    setNt(p=>({...p,[si]:{nombre:"",responsable:""}}));
  };
  const delTask = (si,ti) => onChange(steps.map((s,i)=>i!==si?s:{...s,tareas:s.tareas.filter((_,j)=>j!==ti)}));
  const updTask = (si,ti,k,v) => onChange(steps.map((s,i)=>i!==si?s:{...s,tareas:s.tareas.map((t,j)=>j!==ti?t:{...t,[k]:v})}));
  return (
    <div className="space-y-1.5">
      {steps.map((s,si)=>{
        const pct=calcStepPct(s); const locked=!isUnlocked(steps,si); const isOpen=open===si;
        return (
          <div key={si} className={`border rounded-xl overflow-hidden ${locked?"border-gray-100 opacity-60":"border-gray-200"}`}>
            <button className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-left" onClick={()=>setOpen(isOpen?null:si)}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isOpen?<ChevronDown size={13} className="text-gray-400"/>:<ChevronRight size={13} className="text-gray-400"/>}
                <span className="text-xs text-gray-400 w-5">{si+1}.</span>
                <span className={`text-xs font-semibold truncate ${locked?"text-gray-400":"text-gray-700"}`}>{s.nombre}</span>
                {locked&&<Lock size={10} className="text-gray-300 ml-1 flex-shrink-0"/>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.tareas.length>0&&<span className={`text-xs font-bold ${pctColor(pct)}`}>{pct}%</span>}
                <span className="text-xs text-gray-400">{s.tareas.length} tareas</span>
              </div>
            </button>
            {isOpen&&(
              <div className="p-3 space-y-2 bg-white border-t border-gray-100">
                {s.tareas.map((t,ti)=>(
                  <div key={ti} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <input className="w-full bg-transparent text-xs font-semibold text-gray-700 focus:outline-none border-b border-transparent focus:border-gray-300" value={t.nombre} onChange={e=>updTask(si,ti,"nombre",e.target.value)}/>
                      <input className="w-full bg-transparent text-xs text-gray-400 focus:outline-none mt-0.5" value={t.responsable} onChange={e=>updTask(si,ti,"responsable",e.target.value)} placeholder="Responsable"/>
                    </div>
                    <input type="number" min="0" max="100" value={t.avance} onChange={e=>updTask(si,ti,"avance",Math.min(100,Math.max(0,+e.target.value)))} className="border rounded-lg w-14 text-xs text-center py-0.5 font-bold"/>
                    <span className="text-xs text-gray-400">%</span>
                    <button onClick={()=>delTask(si,ti)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                  </div>
                ))}
                <div className="flex gap-1.5 pt-1">
                  <input className="border rounded-lg px-2 py-1 text-xs flex-1" value={nt[si]?.nombre||""} onChange={e=>setNt(p=>({...p,[si]:{...p[si],nombre:e.target.value}}))} onKeyDown={e=>e.key==="Enter"&&addTask(si)} placeholder="Nueva tarea..."/>
                  <input className="border rounded-lg px-2 py-1 text-xs w-28" value={nt[si]?.responsable||""} onChange={e=>setNt(p=>({...p,[si]:{...p[si],responsable:e.target.value}}))} placeholder="Responsable"/>
                  <button onClick={()=>addTask(si)} className="bg-gray-700 text-white px-2 rounded-lg text-xs"><Plus size={12}/></button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function Modal({ kaizen, onSave, onClose }) {
  const [f, setF] = useState(kaizen);
  const [tab, setTab] = useState("general");
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">{f.id?"Editar Kaizen":"Nuevo Kaizen"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="flex border-b px-5">
          {[["general","General"],["kpis","KPIs"],["steps","Pasos & Tareas"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} className={`text-xs px-4 py-2.5 font-semibold border-b-2 transition-colors ${tab===k?"border-blue-500 text-blue-600":"border-transparent text-gray-400 hover:text-gray-600"}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {tab==="general"&&(
            <div className="grid grid-cols-2 gap-3">
              {[["nombre","Nombre"],["area","Área"],["responsable","Responsable"]].map(([k,l])=>(
                <div key={k} className={k==="responsable"?"col-span-2":""}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">{l}</label>
                  <input className="border rounded-xl px-3 py-2 text-sm w-full" value={f[k]} onChange={e=>set(k,e.target.value)}/>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Fecha Inicio</label>
                <input type="month" className="border rounded-xl px-3 py-2 text-sm w-full" value={f.fechaInicio} onChange={e=>set("fechaInicio",e.target.value)}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Fecha Fin</label>
                <input type="month" className="border rounded-xl px-3 py-2 text-sm w-full" value={f.fechaFin} onChange={e=>set("fechaFin",e.target.value)}/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Estatus</label>
                <select className="border rounded-xl px-3 py-2 text-sm w-full" value={f.estatus} onChange={e=>set("estatus",e.target.value)}>
                  {["En Progreso","Completado","Pausado","Programado"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}
          {tab==="kpis"&&<KpiTableEdit kpis={f.kpis} onChange={v=>set("kpis",v)}/>}
          {tab==="steps"&&<StepsEditor steps={f.steps} onChange={v=>set("steps",v)}/>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={()=>onSave(f)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 font-semibold">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Kaizen Detail ─────────────────────────────────────────────────────────────
function KaizenDetail({ kaizen: k, isAdmin, onEdit, onDelete, onClose, onUpdateTask }) {
  const [openSteps, setOpenSteps] = useState({});
  const pct  = calcKaizenPct(k.steps, k.estatus==="Completado");
  const done = k.estatus==="Completado";
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-3">
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-5xl font-black text-gray-800 tracking-tight leading-none mb-2">{k.nombre}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><MapPin size={10}/>{k.area}</span>
            <span className="flex items-center gap-1"><Calendar size={10}/>{formatYM(k.fechaInicio)} – {formatYM(k.fechaFin)}</span>
            <span className="flex items-center gap-1"><User size={10}/>{k.responsable}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin&&<button onClick={()=>onEdit({...k})} className="text-xs border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 flex items-center gap-1.5 text-gray-600 font-medium"><Edit3 size={12}/> Editar</button>}
          {isAdmin&&<button onClick={()=>onDelete(k.id)} className="text-xs border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 flex items-center gap-1.5 text-red-500 font-medium"><Trash2 size={12}/> Eliminar</button>}
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 ml-1"><X size={18}/></button>
        </div>
      </div>

      <div className={`rounded-2xl p-5 mb-5 ${done?"bg-green-50":"bg-gray-50"}`}>
        <div className="flex justify-between items-end mb-2">
          <p className="text-xs font-semibold text-gray-500">Avance del Kaizen</p>
          <span className={`text-5xl font-black tracking-tight ${done?"text-green-600":pctColor(pct)}`}>{pct}%</span>
        </div>
        <Bar pct={pct} h="h-4"/>
        <p className={`text-xs mt-1.5 font-semibold ${done?"text-green-600":"text-gray-500"}`}>{k.estatus}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3"><BarChart2 size={14} className="text-gray-400"/><h3 className="text-sm font-bold text-gray-700">KPIs — Actual vs Objetivo</h3></div>
        <KpiDisplay kpis={k.kpis}/>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3"><Layers size={14} className="text-gray-400"/><h3 className="text-sm font-bold text-gray-700">Pasos del Kaizen</h3></div>
        <div className="space-y-1.5">
          {k.steps.map((s,si)=>{
            const spct=calcStepPct(s); const locked=!isUnlocked(k.steps,si); const isOpen=openSteps[si];
            return (
              <div key={si} className={`border rounded-xl overflow-hidden ${locked?"border-gray-100 opacity-50":"border-gray-200"}`}>
                <button disabled={locked} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 disabled:hover:bg-transparent transition-colors"
                  onClick={()=>!locked&&setOpenSteps(p=>({...p,[si]:!p[si]}))}>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {locked?<Lock size={12} className="text-gray-300 flex-shrink-0"/>:isOpen?<ChevronDown size={13} className="text-gray-400 flex-shrink-0"/>:<ChevronRight size={13} className="text-gray-400 flex-shrink-0"/>}
                    <span className="text-xs text-gray-400 w-5 flex-shrink-0">{si+1}.</span>
                    <span className={`text-xs font-semibold truncate ${locked?"text-gray-400":"text-gray-700"}`}>{s.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {s.tareas.length>0?(
                      <><div className="w-20 bg-gray-100 rounded-full h-1.5 hidden sm:block"><div className={`h-1.5 rounded-full ${barColor(spct)}`} style={{width:`${spct}%`}}/></div><span className={`text-xs font-bold w-8 text-right ${pctColor(spct)}`}>{spct}%</span></>
                    ):<span className="text-xs text-gray-300 w-8 text-right">—</span>}
                    <span className="text-xs text-gray-400 w-16 text-right">{s.tareas.length} tarea{s.tareas.length!==1?"s":""}</span>
                  </div>
                </button>
                {isOpen&&!locked&&(
                  <div className="px-4 pb-3 pt-2 bg-gray-50 border-t border-gray-100 space-y-2">
                    {s.tareas.length===0
                      ? <p className="text-xs text-gray-400 italic py-1">Sin tareas. Usa Editar para agregar.</p>
                      : s.tareas.map((t,ti)=>(
                          <div key={ti} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-xs font-semibold text-gray-700">{t.nombre}</p>
                                {t.responsable&&<p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><User size={9}/>{t.responsable}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isAdmin
                                  ? <input type="number" min="0" max="100" value={t.avance}
                                      onChange={e=>onUpdateTask(k.id,si,ti,Math.min(100,Math.max(0,+e.target.value)))}
                                      onClick={e=>e.stopPropagation()}
                                      className="border rounded-lg w-14 text-xs text-center py-1 font-bold"/>
                                  : <span className={`text-xs font-black w-14 text-center ${pctColor(t.avance)}`}>{t.avance}%</span>
                                }
                                {isAdmin&&<span className="text-xs text-gray-400">%</span>}
                              </div>
                            </div>
                            <Bar pct={t.avance} h="h-1.5"/>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Gantt ─────────────────────────────────────────────────────────────────────
function GanttTimeline({ kaizens }) {
  const dated = kaizens.filter(k=>k.fechaInicio&&k.fechaFin);
  if (!dated.length) return null;
  const allMs       = dated.flatMap(k=>[ymToMs(k.fechaInicio),ymToMs(k.fechaFin)]);
  const globalStart = Math.min(...allMs);
  const lastEnd     = new Date(Math.max(...allMs));
  const globalEnd   = new Date(lastEnd.getFullYear(), lastEnd.getMonth()+2, 1).getTime();
  const totalMs     = globalEnd - globalStart;
  const months = [];
  const cur = new Date(globalStart);
  while(cur.getTime()<globalEnd){ months.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`); cur.setMonth(cur.getMonth()+1); }
  const leftPct  = ym => ((ymToMs(ym)-globalStart)/totalMs*100);
  const widthPct = (s,e) => { const eMs=new Date(ymToMs(e)); const ePlus=new Date(eMs.getFullYear(),eMs.getMonth()+1,1).getTime(); return ((ePlus-ymToMs(s))/totalMs*100); };
  const colors = ["bg-indigo-500","bg-violet-500","bg-purple-500","bg-fuchsia-500","bg-blue-500"];
  return (
    <div className="overflow-x-auto">
      <div style={{minWidth:"520px"}}>
        <div className="relative h-6 border-b border-gray-100 mb-2">
          {months.map((ym,i)=><span key={i} className="absolute text-xs text-gray-400 font-medium" style={{left:`${leftPct(ym)}%`}}>{formatYM(ym)}</span>)}
        </div>
        <div className="relative space-y-2 pt-1">
          {months.map((ym,i)=><div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{left:`${leftPct(ym)}%`}}/>)}
          {dated.map((k,i)=>(
            <div key={k.id} className="relative h-8">
              <div className="absolute h-full rounded-lg flex items-center overflow-hidden shadow-sm"
                style={{left:`${leftPct(k.fechaInicio)}%`,width:`${widthPct(k.fechaInicio,k.fechaFin)}%`}}>
                <div className={`w-full h-full ${colors[i%colors.length]} flex items-center px-3`}>
                  <span className="text-xs font-bold text-white truncate">{k.nombre}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [items,       setItems]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [selectedId,  setSelectedId] = useState(null);
  const [modal,       setModal]      = useState(null);
  const [isAdmin,     setIsAdmin]    = useState(false);
  const [showPin,     setShowPin]    = useState(false);

  const selectedKaizen = items.find(k=>k.id===selectedId)||null;

  // ── Firestore: seed if empty, then real-time listener ──
  useEffect(() => {
    const colRef = collection(db, COL);
    getDocs(colRef).then(async (snap) => {
      if (snap.empty) {
        for (const k of seedData) {
          await setDoc(doc(db, COL, String(k.id)), k);
        }
      }
    });
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, {numeric:true}));
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Firestore writes ──
  const save = async (form) => {
    const id = form.id || String(Date.now());
    await setDoc(doc(db, COL, String(id)), { ...form, id: String(id) });
    setModal(null);
  };

  const del = async (id) => {
    await deleteDoc(doc(db, COL, String(id)));
    setSelectedId(null);
  };

  const updTask = async (kid, si, ti, val) => {
    if (!isAdmin) return;
    const kaizen = items.find(k=>k.id===kid);
    if (!kaizen) return;
    const updSteps = kaizen.steps.map((s,i)=>i!==si?s:{
      ...s, tareas: s.tareas.map((t,j)=>j!==ti?t:{...t,avance:val})
    });
    await setDoc(doc(db, COL, String(kid)), { ...kaizen, steps: updSteps });
  };

  const toggleSelect = (id) => setSelectedId(p=>p===id?null:id);

  const current = items.filter(k=>k.estatus==="En Progreso"||k.estatus==="Pausado");
  const past    = items.filter(k=>k.estatus==="Completado");
  const future  = items.filter(k=>k.estatus==="Programado"||k.estatus==="Pendiente");

  const SectionHeader = ({color, title, count, onAdd, addLabel}) => (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-6 ${color} rounded-full`}/>
        <h2 className="text-base font-black text-gray-800 uppercase tracking-widest">{title}</h2>
        {count>0&&<span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{count}</span>}
      </div>
      {isAdmin&&<button onClick={onAdd} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 font-medium"><Plus size={12}/>{addLabel}</button>}
    </div>
  );

  // Loading screen
  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader size={28} className="text-gray-400 animate-spin mx-auto mb-4"/>
        <h1 className="text-3xl font-black text-white tracking-tight">KAIKAKU</h1>
        <p className="text-gray-500 text-xs tracking-widest mt-1 uppercase">Mexicali</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <div className="bg-gray-900 px-8 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-end flex-wrap gap-4">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">Mejora Continua</p>
            <h1 className="text-6xl font-black text-white tracking-tight leading-none">KAIKAKU</h1>
            <p className="text-gray-400 text-base font-light tracking-[0.4em] mt-1 uppercase">Mexicali</p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-sm font-semibold text-gray-300">{items.length} Proyectos Registrados</p>
            <p className="text-xs text-gray-500">Área de Ensamble de Válvulas</p>
            <p className="text-xs text-gray-400 capitalize">
              {new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase())}
            </p>
            <div className="flex justify-end pt-1">
              {isAdmin
                ? <button onClick={()=>setIsAdmin(false)} className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors">
                    <Lock size={11}/> Modo Admin — Cerrar Sesión
                  </button>
                : <button onClick={()=>setShowPin(true)} className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-xl font-medium transition-colors">
                    <Lock size={11}/> Admin
                  </button>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-12">

        {/* Kaizen Actual */}
        <section>
          <SectionHeader color="bg-blue-500" title="Kaizen Actual" count={0} onAdd={()=>setModal({...emptyForm,estatus:"En Progreso"})} addLabel="Nuevo"/>
          {current.length===0?(
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Clock size={28} className="text-gray-300 mx-auto mb-3"/>
              <p className="text-gray-400 text-sm font-medium">No hay kaizens en progreso actualmente.</p>
              {isAdmin&&<button onClick={()=>setModal({...emptyForm,estatus:"En Progreso"})} className="mt-3 text-xs text-blue-600 hover:underline font-semibold">+ Agregar kaizen actual</button>}
            </div>
          ):(
            <div className="space-y-3">
              {current.map(k=>{
                const pct=calcKaizenPct(k.steps,false);
                return (
                  <div key={k.id}>
                    <div onClick={()=>toggleSelect(k.id)} className={`bg-white rounded-2xl border-2 p-6 cursor-pointer hover:shadow-md transition-all ${selectedId===k.id?"border-blue-400 shadow-md":"border-gray-200"}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-4xl font-black text-gray-800 tracking-tight leading-none">{k.nombre}</h3>
                          <div className="flex gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><MapPin size={10}/>{k.area}</span>
                            <span className="flex items-center gap-1"><Calendar size={10}/>{formatYM(k.fechaInicio)} – {formatYM(k.fechaFin)}</span>
                            <span className="flex items-center gap-1"><User size={10}/>{k.responsable}</span>
                          </div>
                        </div>
                        <span className={`text-4xl font-black ${pctColor(pct)}`}>{pct}%</span>
                      </div>
                      <Bar pct={pct} h="h-3"/>
                      <p className="text-xs text-blue-600 font-semibold mt-2 flex items-center gap-1"><Clock size={10}/>{k.estatus}</p>
                    </div>
                    {selectedKaizen?.id===k.id&&(
                      <KaizenDetail kaizen={selectedKaizen} isAdmin={isAdmin} onEdit={setModal} onDelete={del} onClose={()=>setSelectedId(null)} onUpdateTask={updTask}/>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Kaizens Anteriores */}
        <section>
          <SectionHeader color="bg-green-500" title="Kaizens Anteriores" count={past.length} onAdd={()=>setModal({...emptyForm,estatus:"Completado"})} addLabel="Agregar"/>
          {past.length===0?(
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">Sin kaizens completados aún.</p>
            </div>
          ):(
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {past.map(k=>(
                  <div key={k.id} onClick={()=>toggleSelect(k.id)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${selectedId===k.id?"border-green-400 shadow-md":"border-gray-200"}`}>
                    <h3 className="text-3xl font-black text-gray-800 tracking-tight leading-none mb-2">{k.nombre}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-3"><Calendar size={9}/>{formatYM(k.fechaInicio)} – {formatYM(k.fechaFin)}</p>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle size={10}/>Completado</span>
                      <span className="text-sm font-black text-green-600">100%</span>
                    </div>
                    <Bar pct={100} h="h-2"/>
                  </div>
                ))}
              </div>
              {selectedKaizen&&past.find(k=>k.id===selectedKaizen.id)&&(
                <KaizenDetail kaizen={selectedKaizen} isAdmin={isAdmin} onEdit={setModal} onDelete={del} onClose={()=>setSelectedId(null)} onUpdateTask={updTask}/>
              )}
            </div>
          )}
        </section>

        {/* Kaizens Futuros */}
        <section>
          <SectionHeader color="bg-violet-500" title="Kaizens Futuros" count={future.length} onAdd={()=>setModal({...emptyForm,estatus:"Programado"})} addLabel="Programar"/>
          {future.length===0?(
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <Flag size={26} className="text-gray-300 mx-auto mb-3"/>
              <p className="text-gray-400 text-sm font-medium">Sin kaizens programados.</p>
              {isAdmin&&<button onClick={()=>setModal({...emptyForm,estatus:"Programado"})} className="mt-2 text-xs text-violet-600 hover:underline font-semibold">+ Programar kaizen</button>}
            </div>
          ):(
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 w-8">#</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Área</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Responsable</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Fecha Estimada</th>
                    <th className="w-16"/>
                  </tr>
                </thead>
                <tbody>
                  {future.map((k,i)=>(
                    <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-semibold">{i+1}</td>
                      <td className="px-4 py-3 font-black text-gray-800 text-sm">{k.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">{k.area}</td>
                      <td className="px-4 py-3 text-gray-500">{k.responsable}</td>
                      <td className="px-4 py-3 text-gray-500">{formatYM(k.fechaInicio)} – {formatYM(k.fechaFin)}</td>
                      <td className="px-4 py-3">
                        {isAdmin&&<div className="flex gap-2">
                          <button onClick={()=>setModal({...k})} className="text-gray-400 hover:text-gray-600"><Edit3 size={13}/></button>
                          <button onClick={()=>del(k.id)} className="text-red-300 hover:text-red-500"><Trash2 size={13}/></button>
                        </div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-100 p-5">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Cronograma</p>
                <GanttTimeline kaizens={future}/>
              </div>
            </div>
          )}
        </section>

      </div>

      {modal&&isAdmin&&<Modal kaizen={modal} onSave={save} onClose={()=>setModal(null)}/>}
      {showPin&&<PinModal onSuccess={()=>{setIsAdmin(true);setShowPin(false);}} onClose={()=>setShowPin(false)}/>}
    </div>
  );
}
