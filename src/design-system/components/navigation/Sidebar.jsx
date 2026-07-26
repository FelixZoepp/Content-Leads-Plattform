import React from 'react';
export function Sidebar({brand='CL',brandLabel='Content-Leads',items=[],activeId,onSelect,footer,promo,width=250,style}){
  return <div style={{width,background:'var(--surface-card)',borderRight:'1px solid var(--gray-100)',display:'flex',flexDirection:'column',padding:'16px 12px',boxSizing:'border-box',fontFamily:'var(--font-ui)',...style}}>
    {brandLabel&&<div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 16px',borderBottom:'1px solid var(--gray-100)',marginBottom:12}}>
      <div style={{width:34,height:34,borderRadius:10,background:'var(--ds-accent-grad)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:15,color:'#fff',boxShadow:'var(--shadow-accent)'}}>{brand}</div>
      <div style={{fontSize:15,fontWeight:600,letterSpacing:'-0.01em',flex:1}}>{brandLabel}</div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>}
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      {items.map(it=>{
        const active=it.id===activeId;
        return <button key={it.id} onClick={()=>onSelect&&onSelect(it.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:'var(--radius-md)',border:active?'1px solid var(--gold-200)':'1px solid transparent',background:active?'var(--ds-accent-soft)':'transparent',color:active?'var(--gold-600)':'var(--text-primary)',font:'500 15px var(--font-ui)',letterSpacing:'-0.01em',cursor:'pointer',textAlign:'left',transition:'background var(--dur-fast) var(--ease-out)'}}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background='var(--gray-050)'}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>
          {it.icon&&<span style={{display:'flex',color:active?'var(--gold-500)':'var(--text-secondary)'}}>{it.icon}</span>}{it.label}
        </button>;
      })}
    </div>
    <div style={{flex:1}}></div>
    {promo}
    {footer}
  </div>;
}
