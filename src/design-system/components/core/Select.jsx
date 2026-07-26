import React from 'react';
export function Select({options=[],value,onChange,style}){
  return <div style={{position:'relative',display:'inline-flex',alignItems:'center',...style}}>
    <select value={value} onChange={e=>onChange&&onChange(e.target.value)} style={{appearance:'none',WebkitAppearance:'none',width:'100%',height:44,background:'var(--surface-card)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-md)',padding:'0 40px 0 16px',font:'500 15px var(--font-ui)',letterSpacing:'-0.01em',color:'var(--text-primary)',cursor:'pointer',boxShadow:'var(--shadow-xs)'}}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
    <svg style={{position:'absolute',right:14,pointerEvents:'none'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  </div>;
}
