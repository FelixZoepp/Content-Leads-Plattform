import React from 'react';
export function SegmentedControl({items=[],value,onChange,style}){
  return <div style={{display:'inline-flex',gap:4,background:'var(--surface-card)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-pill)',padding:4,boxShadow:'var(--shadow-xs)',...style}}>
    {items.map(it=>{
      const key=typeof it==='string'?it:it.value;
      const active=key===value;
      return <button key={key} onClick={()=>onChange&&onChange(key)} style={{border:active?'1px solid var(--gold-200)':'1px solid transparent',background:active?'var(--ds-accent-soft)':'transparent',color:active?'var(--gold-600)':'var(--text-secondary)',borderRadius:'var(--radius-pill)',padding:'8px 18px',font:'500 15px var(--font-ui)',letterSpacing:'-0.01em',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,transition:'background var(--dur-fast) var(--ease-out)'}}>
        {typeof it==='string'?it:it.label}
      </button>;
    })}
  </div>;
}
