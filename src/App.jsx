import { useState, useEffect } from "react";

// ── EmailJS Configuration ─────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "service_5ma6m2k";
const EMAILJS_TEMPLATE_ID = "template_b424pud";
const EMAILJS_PUBLIC_KEY  = "-NjYMzVFvY3u6f0kR";

// Sends booking notification to all 3 team members
async function sendBookingEmails({ clientName, clientEmail, service, date, time, ref, notes }){
  const recipients = [
    "dawwcreations@gmail.com",
    "lamseeabiola@gmail.com",
    "janellesterlinggeorge@gmail.com",
    clientEmail, // also send confirmation to the client
  ];
  const sends = recipients.map(to_email =>
    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email,
      client_name:  clientName,
      client_email: clientEmail,
      service,
      date,
      time,
      ref,
      notes: notes || "None",
    })
  );
  return Promise.allSettled(sends);
}

// ── Google Calendar Configuration ────────────────────────────────────────────
const GOOGLE_CLIENT_ID     = "61741228979-bb67p6oup5qv7n4vr25qt0tu40m301en.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const GOOGLE_SCOPES        = "https://www.googleapis.com/auth/calendar.events";

// Loads the Google API script once
function loadGoogleApi(){
  return new Promise((resolve)=>{
    if(window.gapi){ resolve(); return; }
    const s=document.createElement("script");
    s.src="https://apis.google.com/js/api.js";
    s.onload=()=>{
      window.gapi.load("client:auth2",async()=>{
        await window.gapi.client.init({
          clientId: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPES,
          discoveryDocs:["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        });
        resolve();
      });
    };
    document.head.appendChild(s);
  });
}

// Signs in via Google OAuth popup and adds event to the signed-in user's calendar
async function addToGoogleCalendar({ clientName, service, date, time, hour, notes, ref }){
  try{
    await loadGoogleApi();
    const authInstance = window.gapi.auth2.getAuthInstance();
    if(!authInstance.isSignedIn.get()){
      await authInstance.signIn();
    }
    // Build start/end times
    const start = new Date(date+"T"+String(hour).padStart(2,"0")+":00:00");
    const end   = new Date(start.getTime() + 60*60*1000);
    const fmt   = d => d.toISOString();

    const event = {
      summary:     `DAWW Creations — ${service}`,
      description: `Client: ${clientName}\nService: ${service}\nRef: #${ref}\nNotes: ${notes||"None"}`,
      start:       { dateTime: fmt(start), timeZone: "America/Port_of_Spain" },
      end:         { dateTime: fmt(end),   timeZone: "America/Port_of_Spain" },
      reminders:   { useDefault:false, overrides:[{method:"email",minutes:60},{method:"popup",minutes:30}] },
    };

    await window.gapi.client.calendar.events.insert({ calendarId:"primary", resource:event });
    return "success";
  } catch(e){
    console.error("Google Calendar error:",e);
    return "failed";
  }
}

// ── Brand & Team ─────────────────────────────────────────────────────────────
const TEAM = [
  { id:"ceo",   role:"CEO",               name:"DAWW Creations",          email:"dawwcreations@gmail.com",         icon:"👑", initials:"DC" },
  { id:"pa",    role:"Personal Assistant", name:"Lamsee Abiola",           email:"lamseeabiola@gmail.com",          icon:"📎", initials:"LA" },
  { id:"mgr",   role:"Manager",            name:"Janelle Sterling-George", email:"janellesterlinggeorge@gmail.com", icon:"💼", initials:"JS" },
];

const COLORS = {
  dark:    "#3A3530",
  red:     "#9B1C1C",
  cream:   "#FAF9F7",
  taupe:   "#7A736B",
  mist:    "#F0EDE8",
  mistDark:"#E2DDD6",
  text:    "#2E2A26",
  sub:     "#8C8075",
};

const DAYS      = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYS_FULL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SERVICE_TYPES = [
  { id:"consultation", label:"Initial Consultation",     color:"#5C5249" },
  { id:"fitting",      label:"Fitting Session",          color:"#9B1C1C" },
  { id:"delivery",     label:"Delivery & Final Fitting", color:"#7A736B" },
  { id:"alteration",   label:"Alteration Review",        color:"#3A3530" },
  { id:"measurement",  label:"Measurement Session",      color:"#9A9188" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n){ return String(n).padStart(2,"0"); }
function genId(){ return Math.random().toString(36).slice(2,9).toUpperCase(); }
function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fmtTime(h){ const ap=h<12?"AM":"PM"; const h12=h===0?12:h>12?h-12:h; return `${h12}:00 ${ap}`; }
function fmtDate(str){ const d=new Date(str+"T12:00:00"); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function getDayName(str){ return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(str+"T12:00:00").getDay()]; }
function getDayFull(str){ const dn=getDayName(str); const i=DAYS.indexOf(dn); return i>=0?DAYS_FULL[i]:""; }

// ── Default Availability ──────────────────────────────────────────────────────
function defaultAvail(){
  const a={};
  DAYS.forEach((d,i)=>{ a[d]=i<5?{enabled:true,start:9,end:17}:{enabled:false,start:9,end:17}; });
  return a;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
function seedAppts(){
  const now=new Date();
  const make=(offset,h,type,name,email,notes="")=>{
    const d=new Date(now); d.setDate(d.getDate()+offset);
    return { id:genId(),date:dateKey(d),hour:h,type,clientName:name,clientEmail:email,notes,status:"confirmed",createdAt:new Date().toISOString() };
  };
  return [
    make(0,10,"fitting","James Hartwell","james@example.com","Suit jacket sleeve adjustment"),
    make(0,14,"delivery","Sophia Amara","sophia@example.com","Final delivery - charcoal two-piece"),
    make(1,9,"consultation","Marcus Chen","marcus@example.com","Full wardrobe planning"),
    make(1,11,"measurement","Priya Nair","priya@example.com","Wedding suit measurements"),
    make(2,13,"alteration","Thomas Osei","thomas@example.com","Trouser hem revision"),
    make(3,10,"fitting","Elena Vasquez","elena@example.com","Dinner jacket fitting"),
  ];
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const inputSt = { width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1.5px solid #E2DDD6",borderRadius:9,fontSize:13,color:"#2E2A26",outline:"none",fontFamily:"inherit",background:"#fff" };
const labelSt = { display:"block",fontSize:11,fontWeight:700,color:"#8C8075",marginBottom:5,letterSpacing:0.5 };
const btnPrimary = { background:"#3A3530",color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" };
const btnRed     = { ...btnPrimary,background:"#9B1C1C" };
const btnGhost   = { ...btnPrimary,background:"transparent",color:"#7A736B",border:"1.5px solid #E2DDD6" };

// ── Logo ──────────────────────────────────────────────────────────────────────
function DawwLogo({size=44}){
  return(
    <svg width={size} height={size} viewBox="0 0 100 90" fill="none">
      <polyline points="5,5 30,62 50,22 70,62 95,5" stroke="#B8AFA6" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
      <polygon points="50,26 66,52 50,70 34,52" fill="#9B1C1C"/>
    </svg>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast(){
  const [toasts,setToasts]=useState([]);
  const push=(msg,type="success")=>{ const id=Date.now(); setToasts(p=>[...p,{id,msg,type}]); setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3800); };
  return {toasts,push};
}
function Toast({toasts}){
  return(
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:t.type==="success"?"#4A7B5C":t.type==="error"?"#9B1C1C":"#7A736B",color:"#fff",padding:"12px 18px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.25)",maxWidth:340}}>
          {t.type==="success"?"✓ ":t.type==="error"?"✕ ":"ℹ "}{t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({selected,onSelect,appointments,availability}){
  const [view,setView]=useState(new Date());
  const y=view.getFullYear(),m=view.getMonth();
  const firstDow=(new Date(y,m,1).getDay()+6)%7;
  const dim=new Date(y,m+1,0).getDate();
  const cells=[...Array(firstDow).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
  const apptDates=new Set(appointments.map(a=>a.date));
  const today=todayStr();

  return(
    <div style={{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={()=>setView(new Date(y,m-1,1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:COLORS.taupe,padding:"0 4px"}}>‹</button>
        <span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:14,color:COLORS.dark}}>{MONTHS[m]} {y}</span>
        <button onClick={()=>setView(new Date(y,m+1,1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:COLORS.taupe,padding:"0 4px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:COLORS.sub}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const key=`${y}-${pad(m+1)}-${pad(d)}`;
          const sel=selected===key,isToday=key===today,hasA=apptDates.has(key);
          const avEnabled=availability?.[getDayName(key)]?.enabled;
          return(
            <button key={i} onClick={()=>onSelect(key)} style={{borderRadius:7,border:"none",cursor:"pointer",padding:"5px 2px",fontSize:11,fontWeight:sel||isToday?700:400,background:sel?COLORS.dark:isToday?"rgba(155,28,28,0.12)":"transparent",color:sel?"#fff":isToday?COLORS.red:COLORS.text,position:"relative"}}>
              {d}
              {hasA&&!sel&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:COLORS.red,display:"block"}}/>}
              {avEnabled&&!hasA&&!sel&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#9A9188",display:"block"}}/>}
            </button>
          );
        })}
      </div>
      <div style={{marginTop:8,display:"flex",gap:12,fontSize:10,color:COLORS.sub}}>
        <span>🔴 Booked &nbsp;⚫ Open</span>
      </div>
    </div>
  );
}

// ── Hourly Slot Grid ──────────────────────────────────────────────────────────
function HourlySlotGrid({dateStr,appointments,availability,onSelect,selected}){
  const dn=getDayName(dateStr);
  const avail=availability[dn]||{enabled:false};
  const bookedHours=new Set(appointments.filter(a=>a.date===dateStr).map(a=>a.hour));
  const slots=[];
  if(avail.enabled){ for(let h=avail.start;h<avail.end;h++) slots.push(h); }

  if(!avail.enabled) return(
    <div style={{textAlign:"center",padding:"32px 16px",background:"#fff",borderRadius:14,boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
      <div style={{fontSize:36,marginBottom:8}}>🚫</div>
      <div style={{fontWeight:700,color:COLORS.dark,marginBottom:4}}>{getDayFull(dateStr)}</div>
      <div style={{fontSize:13,color:COLORS.sub}}>Not available on this day.<br/>Please choose another date.</div>
    </div>
  );

  if(slots.length===0) return(
    <div style={{textAlign:"center",padding:"32px 16px",background:"#fff",borderRadius:14}}>
      <div style={{fontSize:36,marginBottom:8}}>📅</div>
      <div style={{fontSize:13,color:COLORS.sub}}>All slots are taken on this day.<br/>Please choose another date.</div>
    </div>
  );

  const available=slots.filter(h=>!bookedHours.has(h));
  const taken=slots.filter(h=>bookedHours.has(h));

  return(
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:14,color:COLORS.dark,marginBottom:12}}>
        {getDayFull(dateStr)} — {fmtDate(dateStr)}
      </div>
      <div style={{fontSize:11,color:COLORS.sub,marginBottom:12,fontWeight:600}}>
        {available.length} slot{available.length!==1?"s":""} available · Each slot is 1 hour · One client per slot
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {slots.map(h=>{
          const booked=bookedHours.has(h);
          const isSel=selected===h;
          return(
            <button key={h} disabled={booked} onClick={()=>!booked&&onSelect(h)} style={{
              border:`2px solid ${isSel?COLORS.dark:booked?COLORS.mistDark:COLORS.mistDark}`,
              borderRadius:12,padding:"16px 10px",cursor:booked?"not-allowed":"pointer",
              background:isSel?COLORS.dark:booked?COLORS.mist:"#fff",
              color:isSel?"#fff":booked?COLORS.sub:COLORS.text,
              fontWeight:700,fontSize:15,fontFamily:"inherit",
              transition:"all 0.15s",position:"relative",
              boxShadow:isSel?"0 4px 14px rgba(58,53,48,0.25)":"0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {fmtTime(h)}
              {booked&&<div style={{position:"absolute",top:5,right:8,fontSize:9,fontWeight:700,color:COLORS.sub,letterSpacing:0.5,textTransform:"uppercase"}}>Taken</div>}
              {!booked&&!isSel&&<div style={{position:"absolute",top:5,right:8,fontSize:9,fontWeight:700,color:"#4A7B5C",letterSpacing:0.5,textTransform:"uppercase"}}>Open</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Availability Panel ────────────────────────────────────────────────────────
function AvailabilityPanel({availability,onChange}){
  return(
    <div style={{background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
      <h3 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:18,margin:"0 0 6px"}}>Set Available Days & Hours</h3>
      <p style={{fontSize:12,color:COLORS.sub,marginBottom:20}}>Toggle each day on/off and set the start and end time. Clients will only see open hourly slots within these hours.</p>
      {DAYS.map(day=>{
        const av=availability[day];
        return(
          <div key={day} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:`1px solid ${COLORS.mist}`}}>
            <div style={{position:"relative",width:42,height:23,flexShrink:0}}>
              <input type="checkbox" checked={av.enabled} onChange={e=>onChange(day,"enabled",e.target.checked)}
                style={{opacity:0,position:"absolute",inset:0,cursor:"pointer",zIndex:1,margin:0}}/>
              <div style={{position:"absolute",inset:0,borderRadius:12,background:av.enabled?COLORS.red:"#ccc",transition:"background 0.2s"}}/>
              <div style={{position:"absolute",top:3,left:av.enabled?21:3,width:17,height:17,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
            </div>
            <div style={{width:32,fontSize:12,fontWeight:700,color:av.enabled?COLORS.dark:COLORS.sub}}>{day}</div>
            {av.enabled?(
              <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:COLORS.sub,fontWeight:700,marginBottom:3}}>FROM</div>
                  <select value={av.start} onChange={e=>onChange(day,"start",+e.target.value)} style={{...inputSt,padding:"7px 10px"}}>
                    {Array.from({length:14},(_,i)=>i+7).map(h=><option key={h} value={h}>{fmtTime(h)}</option>)}
                  </select>
                </div>
                <div style={{paddingTop:16,color:COLORS.sub,fontWeight:700,fontSize:16}}>→</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:COLORS.sub,fontWeight:700,marginBottom:3}}>TO</div>
                  <select value={av.end} onChange={e=>onChange(day,"end",+e.target.value)} style={{...inputSt,padding:"7px 10px"}}>
                    {Array.from({length:14},(_,i)=>i+7).map(h=><option key={h} value={h}>{fmtTime(h)}</option>)}
                  </select>
                </div>
                <div style={{paddingTop:16,fontSize:12,fontWeight:700,color:"#4A7B5C",minWidth:52}}>
                  {av.end-av.start} slot{av.end-av.start!==1?"s":""}
                </div>
              </div>
            ):(
              <span style={{fontSize:12,color:COLORS.sub,fontStyle:"italic"}}>Closed — clients cannot book this day</span>
            )}
          </div>
        );
      })}
      <div style={{marginTop:16,padding:14,background:COLORS.mist,borderRadius:10}}>
        <div style={{fontSize:11,fontWeight:700,color:COLORS.sub,marginBottom:8}}>OPEN DAYS SUMMARY</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {DAYS.filter(d=>availability[d]?.enabled).map(d=>(
            <span key={d} style={{background:COLORS.dark,color:"#fff",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>
              {d} · {fmtTime(availability[d].start)} – {fmtTime(availability[d].end)}
            </span>
          ))}
          {!DAYS.some(d=>availability[d]?.enabled)&&<span style={{fontSize:12,color:COLORS.sub}}>No days enabled yet.</span>}
        </div>
      </div>
    </div>
  );
}

// ── Appointment Modal ─────────────────────────────────────────────────────────
function ApptModal({appt,mode,onClose,onSave,onDelete}){
  const [form,setForm]=useState(appt||{clientName:"",clientEmail:"",type:"consultation",date:todayStr(),hour:9,notes:"",status:"confirmed"});
  const [tab,setTab]=useState(mode);
  const typeInfo=SERVICE_TYPES.find(t=>t.id===form.type);

  const handleSave=()=>{
    if(!form.clientName||!form.clientEmail) return;
    onSave({...form,id:appt?.id||genId(),createdAt:appt?.createdAt||new Date().toISOString()});
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(58,53,48,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.35)"}}>
        <div style={{background:COLORS.dark,borderRadius:"20px 20px 0 0",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:"#B8AFA6",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>
              {tab==="view"?"Appointment Details":tab==="edit"?"Edit Appointment":"New Appointment"}
            </div>
            {typeInfo&&<div style={{color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700}}>{typeInfo.label}</div>}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{padding:24}}>
          {tab==="view"&&appt&&!appt.empty?(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
                {[["👤","Client",appt.clientName],["✉️","Email",appt.clientEmail],["📅","Date",fmtDate(appt.date)],["🕐","Time",fmtTime(appt.hour)],
                  ["📋","Service",SERVICE_TYPES.find(t=>t.id===appt.type)?.label],["✅","Status",appt.status]].map(([ic,lbl,val])=>(
                  <div key={lbl} style={{background:COLORS.mist,borderRadius:10,padding:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:COLORS.sub,marginBottom:4}}>{ic} {lbl}</div>
                    <div style={{fontSize:13,fontWeight:600,color:COLORS.text}}>{val||"—"}</div>
                  </div>
                ))}
              </div>
              {appt.notes&&<div style={{background:COLORS.mist,borderRadius:10,padding:14,marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:COLORS.sub,marginBottom:4}}>NOTES</div>
                <div style={{fontSize:13,color:COLORS.text}}>{appt.notes}</div>
              </div>}
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setTab("edit")} style={btnPrimary}>Edit</button>
                <button onClick={()=>onDelete(appt.id)} style={btnRed}>Cancel Appointment</button>
              </div>
            </>
          ):(
            <div style={{display:"grid",gap:14}}>
              {[["Full Name *","clientName","text","Full name"],["Email *","clientEmail","email","client@email.com"]].map(([lbl,key,type,ph])=>(
                <div key={key}>
                  <label style={labelSt}>{lbl}</label>
                  <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} type={type} style={inputSt}/>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={labelSt}>Date</label>
                  <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inputSt}/>
                </div>
                <div>
                  <label style={labelSt}>Time Slot</label>
                  <select value={form.hour} onChange={e=>setForm(p=>({...p,hour:+e.target.value}))} style={inputSt}>
                    {Array.from({length:11},(_,i)=>i+8).map(h=><option key={h} value={h}>{fmtTime(h)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelSt}>Service Type</label>
                <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inputSt}>
                  {SERVICE_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Additional notes…" rows={3} style={{...inputSt,resize:"vertical"}}/>
              </div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button onClick={handleSave} style={btnPrimary}>Save Appointment</button>
                <button onClick={onClose} style={btnGhost}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Day Timeline (admin calendar) ─────────────────────────────────────────────
function DayTimeline({dateStr,appointments,availability,onSlotClick}){
  const dn=getDayName(dateStr);
  const avail=availability[dn]||{enabled:false,start:9,end:17};
  const apptMap={};
  appointments.forEach(a=>{ if(a.date===dateStr) apptMap[a.hour]=a; });
  const hours=Array.from({length:14},(_,i)=>i+7);

  return(
    <div style={{background:"#fff",borderRadius:14,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",flex:1}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:COLORS.dark,margin:0}}>{fmtDate(dateStr)}</h3>
        <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:6,background:avail.enabled?COLORS.mist:COLORS.mistDark,color:avail.enabled?"#4A7B5C":COLORS.sub}}>
          {avail.enabled?`Open: ${fmtTime(avail.start)} – ${fmtTime(avail.end)}`:"Closed"}
        </span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {hours.map(h=>{
          const appt=apptMap[h];
          const inAvail=avail.enabled&&h>=avail.start&&h<avail.end;
          const t=appt?SERVICE_TYPES.find(x=>x.id===appt.type):null;
          return(
            <div key={h} style={{display:"flex",gap:10,alignItems:"stretch",minHeight:46}}>
              <div style={{width:56,fontSize:11,fontWeight:600,color:COLORS.sub,paddingTop:14,flexShrink:0}}>{fmtTime(h)}</div>
              <div style={{flex:1}}>
                {appt?(
                  <div onClick={()=>onSlotClick(appt)} style={{background:t?.color||COLORS.taupe,color:"#fff",borderRadius:10,padding:"10px 14px",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",transition:"transform 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="translateX(3px)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}
                  >
                    <div style={{fontWeight:700,fontSize:13}}>{appt.clientName}</div>
                    <div style={{fontSize:11,opacity:0.85}}>{t?.label}</div>
                  </div>
                ):inAvail?(
                  <div onClick={()=>onSlotClick({date:dateStr,hour:h,empty:true})} style={{border:`1.5px dashed ${COLORS.red}`,borderRadius:10,minHeight:42,cursor:"pointer",background:"rgba(155,28,28,0.03)",transition:"background 0.15s",display:"flex",alignItems:"center",paddingLeft:12}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(155,28,28,0.08)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(155,28,28,0.03)"}
                  >
                    <span style={{fontSize:11,color:COLORS.red,fontWeight:600}}>+ Book this slot</span>
                  </div>
                ):(
                  <div style={{borderRadius:10,minHeight:42,background:"rgba(0,0,0,0.015)"}}/>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda View ───────────────────────────────────────────────────────────────
function AgendaView({appointments}){
  const sorted=[...appointments].sort((a,b)=>a.date.localeCompare(b.date)||a.hour-b.hour);
  const grouped={};
  sorted.forEach(a=>{ if(!grouped[a.date]) grouped[a.date]=[]; grouped[a.date].push(a); });
  const today=todayStr();
  return(
    <div style={{display:"grid",gap:20}}>
      {Object.entries(grouped).map(([date,appts])=>(
        <div key={date} style={{opacity:date<today?0.6:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:date===today?COLORS.red:COLORS.dark}}>
              {date===today?"Today — ":""}{fmtDate(date)}
            </div>
            <div style={{flex:1,height:1,background:COLORS.mist}}/>
            <div style={{fontSize:11,color:COLORS.sub,fontWeight:700}}>{appts.length} appt{appts.length!==1?"s":""}</div>
          </div>
          <div style={{display:"grid",gap:8}}>
            {appts.map(a=>{
              const t=SERVICE_TYPES.find(x=>x.id===a.type);
              return(
                <div key={a.id} style={{display:"flex",gap:14,alignItems:"center",background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderLeft:`4px solid ${t?.color||COLORS.taupe}`}}>
                  <div style={{width:60,textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:700,color:COLORS.dark}}>{fmtTime(a.hour)}</div>
                    <div style={{fontSize:10,color:COLORS.sub}}>60 min</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:COLORS.dark}}>{a.clientName}</div>
                    <div style={{fontSize:12,color:COLORS.sub}}>{t?.label}</div>
                  </div>
                  <div style={{background:`${t?.color}18`,color:t?.color,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700}}>{a.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {Object.keys(grouped).length===0&&(
        <div style={{textAlign:"center",padding:60,color:COLORS.sub}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,fontWeight:600}}>No appointments scheduled</div>
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({appointments}){
  const today=todayStr(); const week=new Date(); week.setDate(week.getDate()+7); const wStr=dateKey(week);
  const stats=[
    {label:"Today",value:appointments.filter(a=>a.date===today).length,icon:"☀️"},
    {label:"This Week",value:appointments.filter(a=>a.date>=today&&a.date<=wStr).length,icon:"📅"},
    {label:"Total",value:appointments.length,icon:"📊"},
    {label:"Upcoming",value:appointments.filter(a=>a.date>today).length,icon:"⏳"},
  ];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
      {stats.map(s=>(
        <div key={s.label} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)",borderTop:`3px solid ${COLORS.red}`}}>
          <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
          <div style={{fontSize:22,fontWeight:800,color:COLORS.dark,fontFamily:"'Playfair Display',serif"}}>{s.value}</div>
          <div style={{fontSize:11,color:COLORS.sub,fontWeight:600}}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Client Booking Flow ───────────────────────────────────────────────────────
function ClientBooking({appointments,availability,onBook}){
  const [step,setStep]=useState(1);
  const [selType,setSelType]=useState(null);
  const [selDate,setSelDate]=useState(todayStr());
  const [selHour,setSelHour]=useState(null);
  const [form,setForm]=useState({name:"",email:"",phone:"",notes:""});
  const [submitted,setSubmitted]=useState(false);
  const [sending,setSending]=useState(false);
  const [emailStatus,setEmailStatus]=useState(null);
  const [calStatus,setCalStatus]=useState(null); // "adding" | "added" | "failed"
  const [ref,setRef]=useState("");

  // Load EmailJS SDK once
  useEffect(()=>{
    if(window.emailjs) return;
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload=()=>{ window.emailjs.init(EMAILJS_PUBLIC_KEY); };
    document.head.appendChild(script);
  },[]);

  const handleSubmit=async()=>{
    if(!form.name||!form.email||!selType||selHour===null) return;
    const r=genId(); setRef(r);
    setSending(true);
    const bookingData={
      id:r, date:selDate, hour:selHour, type:selType,
      clientName:form.name, clientEmail:form.email,
      notes:form.notes, status:"confirmed", createdAt:new Date().toISOString()
    };
    onBook(bookingData);

    // Send emails to all 3 team members + client
    try{
      const results = await sendBookingEmails({
        clientName: form.name,
        clientEmail: form.email,
        service: SERVICE_TYPES.find(t=>t.id===selType)?.label,
        date: fmtDate(selDate),
        time: fmtTime(selHour),
        ref: r,
        notes: form.notes,
      });
      const anySuccess = results.some(r=>r.status==="fulfilled");
      setEmailStatus(anySuccess?"sent":"failed");
    } catch(e){
      setEmailStatus("failed");
    }
    setSending(false);
    setSubmitted(true);
  };

  const reset=()=>{setSubmitted(false);setSending(false);setEmailStatus(null);setCalStatus(null);setStep(1);setSelType(null);setSelHour(null);setForm({name:"",email:"",phone:"",notes:""});};

  const handleAddToCalendar=async()=>{
    setCalStatus("adding");
    const result=await addToGoogleCalendar({
      clientName: form.name,
      service: SERVICE_TYPES.find(t=>t.id===selType)?.label,
      date: selDate,
      time: fmtTime(selHour),
      hour: selHour,
      notes: form.notes,
      ref,
    });
    setCalStatus(result==="success"?"added":"failed");
  };

  if(submitted) return(
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:64,marginBottom:16}}>🎉</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:26,marginBottom:10}}>Booking Confirmed!</h2>
      <p style={{color:COLORS.sub,fontSize:14,maxWidth:420,margin:"0 auto 24px"}}>
        Your appointment is secured. A confirmation has been sent to <strong>{form.email}</strong>.
      </p>
      <div style={{background:COLORS.mist,borderRadius:14,padding:20,display:"inline-block",marginBottom:20,textAlign:"left",minWidth:300}}>
        <div style={{fontSize:11,fontWeight:700,color:COLORS.sub,letterSpacing:1,marginBottom:12}}>YOUR BOOKING</div>
        {[["Ref","#"+ref],["Service",SERVICE_TYPES.find(t=>t.id===selType)?.label],["Date",fmtDate(selDate)],["Time",fmtTime(selHour)],["Duration","60 minutes"],["Name",form.name],["Email",form.email]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:`1px solid ${COLORS.mistDark}`}}>
            <span style={{color:COLORS.sub}}>{k}</span>
            <span style={{fontWeight:600,color:COLORS.dark}}>{v}</span>
          </div>
        ))}
      </div>

      {/* Email status */}
      {emailStatus==="sent"&&(
        <div style={{background:"#EEF8F2",border:"1px solid #C3E6CB",borderRadius:10,padding:14,marginBottom:16,fontSize:12,color:"#2D6A4F",maxWidth:420,margin:"0 auto 16px"}}>
          ✅ Email notifications sent to all 3 team members:<br/><br/>
          <strong>dawwcreations@gmail.com · lamseeabiola@gmail.com · janellesterlinggeorge@gmail.com</strong>
        </div>
      )}
      {emailStatus==="failed"&&(
        <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:14,marginBottom:16,fontSize:12,color:"#991B1B",maxWidth:420,margin:"0 auto 16px"}}>
          ⚠️ Booking saved but email notifications failed. Please check your EmailJS setup.
        </div>
      )}

      {/* Google Calendar button */}
      <div style={{marginBottom:24,marginTop:8}}>
        {calStatus==="added"?(
          <div style={{background:"#EEF8F2",border:"1px solid #C3E6CB",borderRadius:10,padding:14,fontSize:12,color:"#2D6A4F",maxWidth:420,margin:"0 auto"}}>
            ✅ Successfully added to your Google Calendar with a 30-minute reminder!
          </div>
        ):calStatus==="failed"?(
          <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:14,fontSize:12,color:"#991B1B",maxWidth:420,margin:"0 auto"}}>
            ⚠️ Could not add to Google Calendar. Please make sure you are signed into your Google account and try again.
          </div>
        ):(
          <button onClick={handleAddToCalendar} disabled={calStatus==="adding"} style={{
            display:"inline-flex",alignItems:"center",gap:10,
            background:"#fff",color:COLORS.dark,
            border:`2px solid ${COLORS.mistDark}`,borderRadius:10,
            padding:"12px 22px",fontSize:13,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#fff"/><path d="M34 6H14A8 8 0 006 14v20a8 8 0 008 8h20a8 8 0 008-8V14a8 8 0 00-8-8z" fill="#4285F4"/><rect x="6" y="20" width="36" height="14" rx="0" fill="#fff"/><path d="M14 6h20v14H14z" fill="#EA4335"/><circle cx="16" cy="6" r="3" fill="#B71C1C"/><circle cx="32" cy="6" r="3" fill="#B71C1C"/><text x="24" y="36" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#4285F4">+ Cal</text></svg>
            {calStatus==="adding"?"Adding to Calendar…":"Add to Google Calendar"}
          </button>
        )}
      </div>

      <button onClick={reset} style={btnPrimary}>Book Another Appointment</button>
    </div>
  );

  const steps=["Choose Service","Date & Time Slot","Your Details"];

  return(
    <div style={{maxWidth:720,margin:"0 auto"}}>
      {/* Progress bar */}
      <div style={{display:"flex",marginBottom:32,borderRadius:12,overflow:"hidden",border:`1.5px solid ${COLORS.mistDark}`}}>
        {steps.map((s,i)=>(
          <div key={i} onClick={()=>i+1<step&&setStep(i+1)} style={{flex:1,padding:"13px 8px",textAlign:"center",fontSize:12,fontWeight:700,cursor:i+1<step?"pointer":"default",background:step===i+1?COLORS.dark:i+1<step?"#5C5249":"#fff",color:step===i+1||i+1<step?"#fff":COLORS.sub,transition:"all 0.25s"}}>
            {i+1<step?"✓ ":""}{s}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step===1&&(
        <div>
          <h3 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:22,marginBottom:6}}>Select a Service</h3>
          <p style={{color:COLORS.sub,fontSize:13,marginBottom:24}}>All sessions are 60 minutes · One client per time slot · Your slot is exclusively yours</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {SERVICE_TYPES.map(t=>(
              <div key={t.id} onClick={()=>setSelType(t.id)} style={{border:`2px solid ${selType===t.id?t.color:COLORS.mistDark}`,borderRadius:14,padding:18,cursor:"pointer",background:selType===t.id?`${t.color}12`:"#fff",transition:"all 0.2s"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:t.color,marginBottom:10}}/>
                <div style={{fontWeight:700,fontSize:14,color:COLORS.dark,marginBottom:4}}>{t.label}</div>
                <div style={{fontSize:11,color:COLORS.sub}}>60 min · 1 client per hourly slot</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:24}}>
            <button onClick={()=>selType&&setStep(2)} style={{...btnPrimary,opacity:selType?1:0.4}}>Next — Choose Date & Time →</button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2&&(
        <div style={{display:"grid",gridTemplateColumns:"250px 1fr",gap:24}}>
          <div>
            <h3 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:17,margin:"0 0 14px"}}>📅 Pick a Date</h3>
            <MiniCalendar selected={selDate} onSelect={k=>{setSelDate(k);setSelHour(null);}} appointments={appointments} availability={availability}/>
          </div>
          <div>
            <h3 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:17,margin:"0 0 14px"}}>🕐 Pick a Time Slot</h3>
            <HourlySlotGrid dateStr={selDate} appointments={appointments} availability={availability} onSelect={setSelHour} selected={selHour}/>
          </div>
          <div style={{gridColumn:"1/-1",display:"flex",gap:10,paddingTop:4}}>
            <button onClick={()=>setStep(1)} style={btnGhost}>← Back</button>
            <button onClick={()=>selHour!==null&&setStep(3)} style={{...btnPrimary,opacity:selHour!==null?1:0.4}}>
              {selHour!==null?`Continue with ${fmtTime(selHour)} →`:"Select a time slot to continue"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step===3&&(
        <div>
          <h3 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:22,marginBottom:20}}>Your Details</h3>
          <div style={{background:COLORS.mist,borderRadius:12,padding:16,marginBottom:24,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["📋","Service",SERVICE_TYPES.find(t=>t.id===selType)?.label],["📅","Date",fmtDate(selDate)],["🕐","Time",fmtTime(selHour)],["⏱","Duration","60 minutes"]].map(([ic,lbl,val])=>(
              <div key={lbl} style={{background:"#fff",borderRadius:10,padding:12}}>
                <div style={{fontSize:10,fontWeight:700,color:COLORS.sub,marginBottom:4}}>{ic} {lbl}</div>
                <div style={{fontSize:13,fontWeight:700,color:COLORS.dark}}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gap:14,marginBottom:20}}>
            {[["Full Name *","name","text","Your full name"],["Email Address *","email","email","your@email.com"],["Phone (optional)","phone","tel","+1 (000) 000-0000"]].map(([lbl,key,type,ph])=>(
              <div key={key}>
                <label style={labelSt}>{lbl}</label>
                <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} type={type} style={inputSt}/>
              </div>
            ))}
            <div>
              <label style={labelSt}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any special requests or information…" rows={3} style={{...inputSt,resize:"vertical"}}/>
            </div>
          </div>
          <div style={{background:"#EEF8F2",border:"1px solid #C3E6CB",borderRadius:10,padding:12,marginBottom:20,fontSize:12,color:"#2D6A4F"}}>
            📧 On confirmation, all 3 team members are notified automatically:<br/>
            <strong>dawwcreations@gmail.com · lamseeabiola@gmail.com · janellesterlinggeorge@gmail.com</strong>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={btnGhost}>← Back</button>
            <button onClick={handleSubmit} disabled={sending} style={{...btnPrimary,opacity:(form.name&&form.email&&!sending)?1:0.5}}>
              {sending?"⏳ Sending confirmation emails...":"Confirm My Booking ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const [view,setView]=useState("admin");
  const [adminTab,setAdminTab]=useState("calendar");
  const [activeMember,setActiveMember]=useState("ceo");
  const [appointments,setAppointments]=useState(seedAppts);
  const [selectedDate,setSelectedDate]=useState(todayStr());
  const [modal,setModal]=useState(null);
  const {toasts,push}=useToast();

  // Each team member controls their own availability independently
  const [availabilities,setAvailabilities]=useState({
    ceo: defaultAvail(),
    pa:  defaultAvail(),
    mgr: defaultAvail(),
  });

  // Merged for client: widest window across all 3
  const mergedAvail=()=>{
    const merged={};
    DAYS.forEach(d=>{
      const members=Object.values(availabilities).filter(a=>a[d]?.enabled);
      if(members.length===0){ merged[d]={enabled:false,start:9,end:17}; return; }
      merged[d]={enabled:true,start:Math.min(...members.map(a=>a[d].start)),end:Math.max(...members.map(a=>a[d].end))};
    });
    return merged;
  };

  const handleSlotClick=(slot)=>{
    if(slot.empty) setModal({appt:{date:slot.date,hour:slot.hour,clientName:"",clientEmail:"",type:"consultation",notes:"",status:"confirmed"},mode:"new"});
    else setModal({appt:slot,mode:"view"});
  };

  const handleSave=(appt)=>{
    setAppointments(p=>{ const idx=p.findIndex(a=>a.id===appt.id); if(idx>=0){const n=[...p];n[idx]=appt;return n;} return [...p,appt]; });
    setModal(null);
    push(`Appointment saved for ${appt.clientName||"client"}!`);
  };

  const handleDelete=(id)=>{ setAppointments(p=>p.filter(a=>a.id!==id)); setModal(null); push("Appointment cancelled","error"); };

  const handleClientBook=(appt)=>{
    setAppointments(p=>[...p,appt]);
    push(`New booking from ${appt.clientName}! All 3 team members notified.`);
  };

  const updateAvail=(memberId,day,field,val)=>{
    setAvailabilities(p=>({...p,[memberId]:{...p[memberId],[day]:{...p[memberId][day],[field]:val}}}));
    push(`${TEAM.find(t=>t.id===memberId)?.role} availability updated`);
  };

  const adminTabs=[
    {id:"calendar",label:"Calendar",icon:"📅"},
    {id:"agenda",label:"Schedule",icon:"📋"},
    {id:"availability",label:"Availability",icon:"⚙️"},
    {id:"team",label:"Team",icon:"👥"},
  ];

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#FAF9F7;}
        select,input,textarea{font-family:'DM Sans',sans-serif;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-thumb{background:#E2DDD6;border-radius:3px;}
      `}</style>

      {/* Header */}
      <header style={{background:COLORS.dark,padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:70,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <DawwLogo size={46}/>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",color:"#fff",fontWeight:800,fontSize:18,letterSpacing:2}}>DAWW CREATIONS</div>
            <div style={{color:"#B8AFA6",fontSize:10,fontWeight:600,letterSpacing:1.5,marginTop:2}}>dawwcreations@gmail.com · SCHEDULING PLATFORM</div>
          </div>
        </div>

        <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.08)",borderRadius:12,padding:4}}>
          {[{id:"admin",label:"Admin Portal",icon:"🔐"},{id:"client",label:"Client Booking",icon:"🔗"}].map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{background:view===v.id?COLORS.red:"transparent",color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{v.icon} {v.label}</button>
          ))}
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#fff",fontSize:12,fontWeight:600}}>CEO · PA · Manager</div>
            <div style={{color:"#B8AFA6",fontSize:10}}>3-member team · All notified</div>
          </div>
          <div style={{width:38,height:38,borderRadius:"50%",background:COLORS.red,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:13}}>DC</div>
        </div>
      </header>

      <main style={{padding:28,minHeight:"calc(100vh - 70px)"}}>
        {view==="admin"?(
          <>
            <StatsBar appointments={appointments}/>

            <div style={{display:"flex",gap:4,marginBottom:24,background:"#fff",borderRadius:12,padding:4,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",width:"fit-content",flexWrap:"wrap"}}>
              {adminTabs.map(t=>(
                <button key={t.id} onClick={()=>setAdminTab(t.id)} style={{background:adminTab===t.id?COLORS.dark:"transparent",color:adminTab===t.id?"#fff":COLORS.sub,border:"none",borderRadius:9,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{t.icon} {t.label}</button>
              ))}
              <button onClick={()=>setModal({appt:{clientName:"",clientEmail:"",type:"consultation",date:todayStr(),hour:9,notes:"",status:"confirmed"},mode:"new"})}
                style={{...btnRed,marginLeft:8,fontSize:13,padding:"9px 18px"}}>+ New Appointment</button>
            </div>

            {adminTab==="calendar"&&(
              <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:20}}>
                <div>
                  <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} appointments={appointments} availability={mergedAvail()}/>
                  <div style={{marginTop:16,background:"#fff",borderRadius:14,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                    <div style={{fontSize:12,fontWeight:700,color:COLORS.sub,marginBottom:10,letterSpacing:0.5}}>SERVICE TYPES</div>
                    {SERVICE_TYPES.map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                        <div style={{fontSize:12,color:COLORS.text}}>{t.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <DayTimeline dateStr={selectedDate} appointments={appointments} availability={mergedAvail()} onSlotClick={handleSlotClick}/>
              </div>
            )}

            {adminTab==="agenda"&&<AgendaView appointments={appointments}/>}

            {adminTab==="availability"&&(
              <div>
                <div style={{marginBottom:20}}>
                  <h2 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:20,marginBottom:6}}>Team Availability</h2>
                  <p style={{fontSize:13,color:COLORS.sub,marginBottom:16}}>Each team member sets their own available days and hours. Select a team member below to edit their schedule.</p>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {TEAM.map(m=>(
                      <button key={m.id} onClick={()=>setActiveMember(m.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",borderRadius:12,border:`2px solid ${activeMember===m.id?COLORS.dark:COLORS.mistDark}`,background:activeMember===m.id?COLORS.dark:"#fff",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
                        <span style={{fontSize:20}}>{m.icon}</span>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:12,fontWeight:700,color:activeMember===m.id?"#fff":COLORS.dark}}>{m.role}</div>
                          <div style={{fontSize:10,color:activeMember===m.id?"#B8AFA6":COLORS.sub}}>{m.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{maxWidth:640}}>
                  <AvailabilityPanel availability={availabilities[activeMember]} onChange={(day,field,val)=>updateAvail(activeMember,day,field,val)}/>
                  <div style={{marginTop:12,padding:14,background:COLORS.mist,borderRadius:10,fontSize:12,color:COLORS.sub}}>
                    💡 The client booking page shows the combined open hours across all three team members. Each of you controls your own schedule independently.
                  </div>
                </div>
              </div>
            )}

            {adminTab==="team"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:18}}>
                  {TEAM.map(member=>{
                    const todayAppts=appointments.filter(a=>a.date===todayStr());
                    const avail=availabilities[member.id];
                    const openDays=DAYS.filter(d=>avail[d]?.enabled);
                    return(
                      <div key={member.id} style={{background:"#fff",borderRadius:16,padding:22,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`2px solid ${COLORS.mist}`}}>
                          <div style={{width:46,height:46,borderRadius:13,background:COLORS.dark,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{member.icon}</div>
                          <div>
                            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:COLORS.dark}}>{member.role}</div>
                            <div style={{fontSize:10,color:COLORS.sub,marginTop:2}}>{member.email}</div>
                          </div>
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color:COLORS.sub,marginBottom:6,letterSpacing:0.5}}>OPEN DAYS</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:14}}>
                          {openDays.length===0?<span style={{fontSize:11,color:COLORS.sub,fontStyle:"italic"}}>None set</span>:openDays.map(d=>(
                            <span key={d} style={{background:COLORS.mist,color:COLORS.dark,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{d}</span>
                          ))}
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color:COLORS.sub,marginBottom:8,letterSpacing:0.5}}>TODAY'S APPOINTMENTS</div>
                        {todayAppts.length===0
                          ?<p style={{color:COLORS.sub,fontSize:12,fontStyle:"italic"}}>None today</p>
                          :todayAppts.map(a=>{
                            const t=SERVICE_TYPES.find(x=>x.id===a.type);
                            return(
                              <div key={a.id} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${COLORS.mist}`}}>
                                <div style={{fontSize:11,fontWeight:700,color:COLORS.dark,width:50}}>{fmtTime(a.hour)}</div>
                                <div style={{flex:1}}>
                                  <div style={{fontWeight:600,fontSize:12,color:COLORS.text}}>{a.clientName}</div>
                                  <div style={{fontSize:10,color:COLORS.sub}}>{t?.label}</div>
                                </div>
                              </div>
                            );
                          })
                        }
                        <div style={{marginTop:12,padding:"8px 12px",background:"rgba(155,28,28,0.06)",borderRadius:8,fontSize:11,color:COLORS.red,fontWeight:700}}>
                          ✓ Email notifications active
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Booking link */}
                <div style={{background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                  <div style={{display:"flex",alignItems:"start",gap:24,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:280}}>
                      <h3 style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:18,marginBottom:6}}>Client Booking Link</h3>
                      <p style={{fontSize:12,color:COLORS.sub,marginBottom:14}}>Share this link with clients. They pick a service, choose an available hourly slot, fill in their details — and all 3 team members are notified instantly by email.</p>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <div style={{flex:1,background:COLORS.mist,borderRadius:10,padding:"11px 16px",fontSize:13,color:COLORS.dark,fontFamily:"monospace",fontWeight:600}}>
                          https://dawwcreations.app/book
                        </div>
                        <button onClick={()=>alert("In production, clicking this copies your real booking URL.\n\nShare the Client Booking tab link with clients — they access it via the 🔗 Client Booking button at the top.")} style={btnRed}>Copy Link</button>
                      </div>
                    </div>
                    <div style={{background:COLORS.mist,borderRadius:12,padding:16,minWidth:240}}>
                      <div style={{fontSize:11,fontWeight:700,color:COLORS.sub,marginBottom:10,letterSpacing:0.5}}>ALL BOOKINGS NOTIFY</div>
                      {TEAM.map(m=>(
                        <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${COLORS.mistDark}`}}>
                          <span style={{fontSize:16}}>{m.icon}</span>
                          <div>
                            <div style={{fontSize:11,fontWeight:700,color:COLORS.dark}}>{m.role}</div>
                            <div style={{fontSize:10,color:COLORS.sub}}>{m.email}</div>
                          </div>
                          <span style={{marginLeft:"auto",fontSize:10,color:"#4A7B5C",fontWeight:700}}>✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ):(
          <div style={{maxWidth:760,margin:"0 auto"}}>
            <div style={{textAlign:"center",marginBottom:40}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><DawwLogo size={72}/></div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,fontWeight:700,letterSpacing:3,color:"#9A9188",marginBottom:6}}>DAWW CREATIONS</div>
              <div style={{fontFamily:"'Playfair Display',serif",color:COLORS.dark,fontSize:28,fontWeight:800,marginBottom:8}}>Book an Appointment</div>
              <p style={{color:COLORS.sub,fontSize:14,marginBottom:6}}>Choose your service · Pick an hourly slot · We'll confirm instantly</p>
              <a href="mailto:dawwcreations@gmail.com" style={{color:COLORS.red,fontSize:12,fontWeight:700,textDecoration:"none"}}>dawwcreations@gmail.com</a>
            </div>
            <ClientBooking appointments={appointments} availability={mergedAvail()} onBook={handleClientBook}/>
          </div>
        )}
      </main>

      {modal&&<ApptModal appt={modal.appt} mode={modal.mode} onClose={()=>setModal(null)} onSave={handleSave} onDelete={handleDelete}/>}
      <Toast toasts={toasts}/>
    </>
  );
}
