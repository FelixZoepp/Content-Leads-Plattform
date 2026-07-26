import React from 'react';
export function Badge({tone='accent',children,style}){
  const tones={
    accent:{background:'var(--gold-500)',color:'#fff'},
    softAccent:{background:'var(--ds-accent-soft)',color:'var(--gold-600)'},
    success:{background:'var(--success-soft)',color:'var(--green-700)'},
    neutral:{background:'var(--gray-100)',color:'var(--text-secondary)'},
    outline:{background:'#fff',color:'var(--text-secondary)',border:'1px solid var(--gray-200)'}
  };
  return <span style={{display:'inline-flex',alignItems:'center',borderRadius:'var(--radius-pill)',padding:'4px 12px',fontSize:13,fontWeight:500,fontFamily:'var(--font-ui)',letterSpacing:'-0.01em',...tones[tone],...style}}>{children}</span>;
}
