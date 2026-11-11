import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowUpRight, Building2, Check, ChevronDown, CircleDot, ClipboardList, Clock3, Filter, LogOut, Plus, Search, ShieldCheck, Sparkles, Wrench, X } from "lucide-react";

const API = "/api";
const initialForm = { title:"", description:"", building:"", location:"", category:"HVAC", priority:"Medium", status:"Open", assignee:"", dueDate:"" };
const dateLabel = (v) => v ? new Date(v).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "No deadline";
const shortId = (id) => String(id || "").slice(-6).toUpperCase();

export default function App() {
  const [token,setToken] = useState(localStorage.getItem("fixflow_token") || "");
  const [password,setPassword] = useState("");
  const [tickets,setTickets] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("All");
  const [selected,setSelected] = useState(null);
  const [form,setForm] = useState(initialForm);
  const [editing,setEditing] = useState(false);
  const [saving,setSaving] = useState(false);

  const request = async (url, options={}) => {
    const res = await fetch(url,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...options.headers}});
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
  };
  const load = async () => { setLoading(true); setError(""); try { setTickets(await request(`${API}/tickets`)); } catch(e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(()=>{ if(token) load(); },[token]);
  const logout = () => { localStorage.removeItem("fixflow_token"); setToken(""); setTickets([]); };
  const login = async (e) => { e.preventDefault(); setError(""); try { const r=await fetch(`${API}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})}); const d=await r.json(); if(!r.ok) throw new Error(d.error); localStorage.setItem("fixflow_token",d.token); setToken(d.token); } catch(e) { setError(e.message); } };
  const stats = useMemo(()=>({ total:tickets.length, open:tickets.filter(t=>t.status==="Open").length, progress:tickets.filter(t=>t.status==="In progress").length, urgent:tickets.filter(t=>["High","Urgent"].includes(t.priority)&&t.status!=="Resolved").length }),[tickets]);
  const visible = tickets.filter(t => (filter==="All" || t.status===filter) && `${t.title} ${t.building} ${t.assignee} ${t.location}`.toLowerCase().includes(query.toLowerCase()));
  const openNew = () => { setSelected(null); setForm(initialForm); setEditing(true); };
  const openEdit = (t) => { setSelected(t); setForm({...t,dueDate:t.dueDate?new Date(t.dueDate).toISOString().slice(0,10):""}); setEditing(true); };
  const save = async (e) => { e.preventDefault(); setSaving(true); setError(""); try { const payload={...form,dueDate:form.dueDate || null}; if(selected) await request(`${API}/tickets/${selected._id}`,{method:"PATCH",body:JSON.stringify(payload)}); else await request(`${API}/tickets`,{method:"POST",body:JSON.stringify(payload)}); setEditing(false); await load(); } catch(e) { setError(e.message); } finally { setSaving(false); } };
  const remove = async (id) => { if(!confirm("Delete this maintenance ticket?")) return; try { await request(`${API}/tickets/${id}`,{method:"DELETE"}); setEditing(false); await load(); } catch(e) { setError(e.message); } };

  if(!token) return <div className="login-page"><div className="login-card"><div className="brand-mark"><Wrench size={22}/></div><p className="eyebrow">MAINTENANCE OPERATIONS</p><h1>FixFlow</h1><p className="muted">Keep every building issue moving.</p><form onSubmit={login}><label>Workspace access password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter demo password" required/><button className="primary full">Open workspace <ArrowUpRight size={16}/></button></form>{error&&<p className="error">{error}</p>}<p className="login-note"><ShieldCheck size={14}/> Private demo workspace</p></div></div>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Wrench size={19}/></div><span>fixflow</span><span className="brand-beta">BETA</span></div><div className="workspace"><div className="workspace-icon"><Building2 size={17}/></div><div><strong>Northstar Facilities</strong><small>Demo workspace</small></div><ChevronDown size={15}/></div><p className="nav-label">WORKSPACE</p><div className="nav-item active"><ClipboardList size={17}/> Maintenance tickets <span>{tickets.length}</span></div><div className="nav-item"><Activity size={17}/> Activity overview</div><div className="sidebar-bottom"><div className="claude-note"><Sparkles size={16}/><div><strong>Claude connected?</strong><p>Create and update tickets directly from Claude using FixFlow MCP.</p></div></div><button className="nav-item logout" onClick={logout}><LogOut size={16}/> Sign out</button></div></aside>
    <main className="main"><header className="topbar"><div><span className="crumb">Workspace</span><span className="slash">/</span><strong>Maintenance tickets</strong></div><div className="top-right"><span className="live-dot"/> All changes saved <div className="avatar">NA</div></div></header>
      <section className="content"><div className="page-heading"><div><p className="eyebrow">OPERATIONS / TICKETS</p><h1>Maintenance tickets</h1><p className="muted">A clear view of what needs attention across your properties.</p></div><button className="primary" onClick={openNew}><Plus size={17}/> New ticket</button></div>
      {error&&<div className="alert"><AlertCircle size={16}/>{error}<button onClick={()=>setError("")}><X size={14}/></button></div>}
      <div className="stats-grid"><Stat icon={<ClipboardList/>} label="Total tickets" value={stats.total} tone="blue"/><Stat icon={<CircleDot/>} label="Open" value={stats.open} tone="orange"/><Stat icon={<Clock3/>} label="In progress" value={stats.progress} tone="purple"/><Stat icon={<AlertCircle/>} label="High priority" value={stats.urgent} tone="red"/></div>
      <div className="panel"><div className="panel-head"><div><h2>All tickets</h2><p className="muted">Track, assign and resolve maintenance issues.</p></div><button className="icon-btn" onClick={load} title="Refresh"><Activity size={17}/></button></div>
        <div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Search tickets, buildings, assignees..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="filter-wrap"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Open</option><option>In progress</option><option>Resolved</option></select></div></div>
        <div className="table-wrap"><table><thead><tr><th>ISSUE</th><th>LOCATION</th><th>ASSIGNEE</th><th>PRIORITY</th><th>STATUS</th><th>DUE DATE</th><th></th></tr></thead><tbody>
        {loading?<tr><td colSpan="7" className="empty">Loading tickets…</td></tr>:visible.length===0?<tr><td colSpan="7" className="empty"><div className="empty-icon"><ClipboardList/></div><strong>No tickets found</strong><p>Create a ticket here or ask Claude to create one through FixFlow.</p><button className="secondary" onClick={openNew}><Plus size={15}/> Create first ticket</button></td></tr>:visible.map(t=><tr key={t._id} onClick={()=>openEdit(t)} className="ticket-row"><td><div className="issue-title">{t.title}</div><div className="issue-sub">#{shortId(t._id)} · {t.category||"General"}</div></td><td><strong>{t.building}</strong><small>{t.location||"Location not set"}</small></td><td>{t.assignee||"Unassigned"}</td><td><Priority value={t.priority}/></td><td><Status value={t.status}/></td><td>{dateLabel(t.dueDate)}</td><td><button className="row-more" onClick={e=>{e.stopPropagation();openEdit(t)}}>···</button></td></tr>)}</tbody></table></div>
        <div className="panel-foot"><span>Showing {visible.length} of {tickets.length} tickets</span><span className="powered"><Sparkles size={13}/> Create from Claude with MCP</span></div>
      </div>
      <div className="bottom-callout"><div className="callout-icon"><Sparkles size={19}/></div><div><strong>Work from Claude. Stay in control.</strong><p>Ask Claude to log an issue, assign a technician or update a ticket. Your team can review and edit everything here.</p></div><a href="https://modelcontextprotocol.io/" target="_blank" rel="noreferrer">About MCP <ArrowUpRight size={14}/></a></div>
      <footer>© 2026 FixFlow <span>Maintenance operations, made manageable.</span></footer>
      </section>
    </main>
    {editing&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(false)}}><div className="modal"><div className="modal-head"><div><p className="eyebrow">{selected?"TICKET DETAILS":"NEW TICKET"}</p><h2>{selected?"Edit maintenance ticket":"Create a ticket"}</h2></div><button className="icon-btn" onClick={()=>setEditing(false)}><X size={18}/></button></div><form onSubmit={save}><label>Issue title *</label><input required minLength="3" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. AC not cooling on third floor"/><label>Description</label><textarea rows="3" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the issue and any useful context..."/><div className="form-grid"><div><label>Building *</label><input required value={form.building} onChange={e=>setForm({...form,building:e.target.value})} placeholder="Building A"/></div><div><label>Specific location</label><input value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Third floor"/></div><div><label>Category</label><select value={form.category||"General"} onChange={e=>setForm({...form,category:e.target.value})}>{["HVAC","Electrical","Plumbing","Cleaning","Safety","General"].map(x=><option key={x}>{x}</option>)}</select></div><div><label>Assigned to</label><input value={form.assignee||""} onChange={e=>setForm({...form,assignee:e.target.value})} placeholder="Technician name"/></div><div><label>Priority</label><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{["Low","Medium","High","Urgent"].map(x=><option key={x}>{x}</option>)}</select></div><div><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{["Open","In progress","Resolved"].map(x=><option key={x}>{x}</option>)}</select></div><div className="span-2"><label>Due date</label><input type="date" value={form.dueDate||""} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div></div><div className="modal-actions">{selected&&<button type="button" className="danger-text" onClick={()=>remove(selected._id)}>Delete ticket</button>}<div/><button type="button" className="secondary" onClick={()=>setEditing(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":selected?"Save changes":"Create ticket"}</button></div></form></div></div>}
  </div>;
}
function Stat({icon,label,value,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong></div></div>; }
function Priority({value}) { return <span className={`pill priority ${String(value).toLowerCase()}`}><i/>{value}</span>; }
function Status({value}) { return <span className={`pill status ${value==="Resolved"?"resolved":value==="In progress"?"progress":"open"}`}>{value}</span>; }