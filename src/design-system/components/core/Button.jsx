import React from 'react';
export function Button({variant='primary',size='md',pill=false,glow=false,disabled=false,children,style,...rest}){
  const h={sm:'32px',md:'40px',lg:'48px',xl:'56px'}[size];
  const fs={sm:13,md:15,lg:15,xl:17}[size];
  const pad={sm:'0 14px',md:'0 20px',lg:'0 26px',xl:'0 32px'}[size];
  const base={height:h,padding:pad,fontSize:fs,fontWeight:500,fontFamily:'var(--font-ui)',border:'none',borderRadius:pill?'var(--radius-pill)':'var(--radius-md)',cursor:disabled?'default':'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,letterSpacing:'-0.01em',transition:'background var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out)',whiteSpace:'nowrap'};
  const variants={
    primary:{background:'var(--ds-accent-grad)',color:'var(--text-on-accent)',boxShadow:'var(--shadow-accent)'},
    secondary:{background:'var(--surface-card)',color:'var(--text-primary)',boxShadow:'var(--shadow-sm)',border:'1px solid var(--gray-200)'},
    soft:{background:'var(--ds-accent-soft)',color:'var(--gold-600)'},
    ghost:{background:'transparent',color:'var(--text-secondary)'},
    disabledSoft:{background:'var(--gold-200)',color:'#fff',opacity:.9}
  };
  const v=disabled&&variant==='primary'?variants.disabledSoft:variants[variant]||variants.primary;
  const s={...base,...v,...(disabled?{opacity:variant==='primary'?.85:.5,pointerEvents:'none'}:{}),...style};
  if(glow) return <span style={{display:'inline-block',borderRadius:s.borderRadius,padding:2,background:'var(--promo-glow)'}}><button style={{...s,margin:0}} disabled={disabled} {...rest}>{children}</button></span>;
  return <button style={s} disabled={disabled}
    onMouseEnter={e=>{if(variant==='primary')e.currentTarget.style.background='var(--ds-accent-grad-hover)';if(variant==='secondary'||variant==='ghost')e.currentTarget.style.background='var(--gray-050)'}}
    onMouseLeave={e=>{e.currentTarget.style.background=v.background}}
    {...rest}>{children}</button>;
}
