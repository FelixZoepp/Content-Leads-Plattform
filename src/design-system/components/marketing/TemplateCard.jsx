import React from 'react';
export function TemplateCard({title,description,thumbnail,overlayTitle=true,onClick,style}){
  const [hover,setHover]=React.useState(false);
  return <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{width:320,background:'var(--surface-subtle)',border:'1px solid var(--gray-100)',borderRadius:'var(--radius-xl)',padding:16,display:'flex',flexDirection:'column',gap:12,boxShadow:hover?'var(--shadow-md)':'var(--shadow-sm)',cursor:'pointer',transition:'box-shadow var(--dur-med) var(--ease-out)',fontFamily:'var(--font-ui)',...style}}>
    <div style={{position:'relative',borderRadius:14,height:190,overflow:'hidden',background:'var(--gray-100)'}}>
      {thumbnail}
      {overlayTitle&&<div style={{position:'absolute',left:14,bottom:12,color:'#fff',fontSize:17,fontWeight:600,textShadow:'0 1px 8px rgba(0,0,0,.35)'}}>{title}</div>}
    </div>
    {!overlayTitle&&<div style={{fontSize:18,fontWeight:600}}>{title}</div>}
    {description&&<div style={{fontSize:14,color:'var(--text-secondary)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical'}}>{description}</div>}
  </div>;
}
