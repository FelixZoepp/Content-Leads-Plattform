import React from 'react';
export function Input({icon,size='md',pill=false,style,wrapStyle,...rest}){
  const h={md:44,lg:56}[size];
  return <div style={{display:'flex',alignItems:'center',gap:10,height:h,background:'var(--surface-card)',border:'1px solid var(--gray-200)',borderRadius:pill?'var(--radius-pill)':'var(--radius-md)',padding:'0 16px',boxShadow:'var(--shadow-xs)',...wrapStyle}}>
    {icon&&<span style={{color:'var(--text-tertiary)',display:'flex'}}>{icon}</span>}
    <input style={{flex:1,border:'none',outline:'none',background:'transparent',font:`${size==='lg'?17:15}px var(--font-ui)`,color:'var(--text-primary)',letterSpacing:'-0.01em',...style}} {...rest}/>
  </div>;
}
