import React from 'react';
import {Button} from '../core/Button.jsx';
export function GetStartedCard({title,description,preview,cta,disabled=false,onCta,style}){
  return <div style={{width:300,background:'var(--surface-subtle)',border:'1px solid var(--gray-100)',borderRadius:'var(--radius-xl)',padding:20,display:'flex',flexDirection:'column',gap:12,boxShadow:'var(--shadow-sm)',fontFamily:'var(--font-ui)',...style}}>
    <div style={{fontSize:17,fontWeight:600,letterSpacing:'-0.01em'}}>{title}</div>
    <div style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.4,minHeight:38,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{description}</div>
    <div style={{background:'var(--surface-card)',borderRadius:16,height:170,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'var(--shadow-xs)'}}>{preview||<span style={{fontSize:12,color:'var(--text-tertiary)'}}>Vorschau</span>}</div>
    <Button disabled={disabled} onClick={onCta} style={{width:'100%'}}>{disabled?'Bald verfügbar':cta}</Button>
  </div>;
}
