import React from 'react';
import {Button} from '../core/Button.jsx';
import {FeatureRow} from './FeatureRow.jsx';
import {TrustPill} from './TrustPill.jsx';
export function Modal({title,subtitle,features=[],ctaLabel='Jetzt upgraden',onCta,trust=true,children,style}){
  return <div style={{width:480,background:'var(--surface-card)',borderRadius:'var(--radius-2xl)',padding:32,boxShadow:'var(--shadow-lg)',display:'flex',flexDirection:'column',gap:16,alignItems:'center',fontFamily:'var(--font-ui)',...style}}>
    {trust&&<TrustPill/>}
    {title&&<div style={{fontSize:34,fontWeight:700,letterSpacing:'-0.02em',textAlign:'center'}}>{title}</div>}
    {subtitle&&<div style={{fontSize:17,color:'var(--text-secondary)',textAlign:'center',marginTop:-8,lineHeight:1.4}}>{subtitle}</div>}
    {features.length>0&&<div style={{display:'flex',flexDirection:'column',gap:10,alignSelf:'stretch',background:'var(--surface-subtle)',borderRadius:16,padding:12}}>
      {features.map((f,i)=><FeatureRow key={i}>{f}</FeatureRow>)}
    </div>}
    {children}
    {ctaLabel&&<Button size="xl" onClick={onCta} style={{alignSelf:'stretch'}}>{ctaLabel}</Button>}
  </div>;
}
