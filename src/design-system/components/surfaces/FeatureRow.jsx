import React from 'react';
export function FeatureRow({icon,tone='success',checked=true,children,style}){
  const tile={success:{background:'var(--success-soft)',color:'var(--green-500)'},accent:{background:'var(--ds-accent-soft)',color:'var(--gold-500)'},neutral:{background:'var(--gray-100)',color:'var(--text-secondary)'}}[tone];
  return <div style={{display:'flex',alignItems:'center',gap:14,background:'var(--surface-card)',borderRadius:'var(--radius-lg)',padding:'12px 16px',boxShadow:'var(--shadow-sm)',fontFamily:'var(--font-ui)',...style}}>
    <div style={{width:38,height:38,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,...tile}}>{icon||<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}</div>
    <div style={{flex:1,fontSize:16,fontWeight:500,letterSpacing:'-0.01em'}}>{children}</div>
    {checked&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
  </div>;
}
