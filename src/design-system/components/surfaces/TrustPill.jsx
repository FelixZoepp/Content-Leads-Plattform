import React from 'react';
export function TrustPill({count='50+',label='Kunden',avatars=3,style}){
  const hues=['var(--gold-300)','var(--gold-500)','var(--gold-800)'];
  return <div style={{display:'inline-flex',alignItems:'center',gap:12,background:'rgba(255,255,255,.85)',backdropFilter:'var(--blur-glass)',borderRadius:'var(--radius-pill)',padding:'8px 18px 8px 10px',boxShadow:'var(--shadow-sm)',fontFamily:'var(--font-ui)',...style}}>
    <div style={{display:'flex'}}>
      {Array.from({length:avatars}).map((_,i)=><div key={i} style={{width:32,height:32,borderRadius:'50%',background:hues[i%3],border:'2px solid #fff',marginLeft:i?-10:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:600}}>{String.fromCharCode(65+i)}</div>)}
    </div>
    <span style={{fontSize:15,fontWeight:500}}>Vertraut von <span style={{background:'linear-gradient(90deg,var(--gold-500),var(--gold-300))',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:700}}>{count}</span> {label}</span>
  </div>;
}
