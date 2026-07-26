import React from 'react';
import {Button} from '../core/Button.jsx';
import {Badge} from '../core/Badge.jsx';
import {Select} from '../core/Select.jsx';
export function PricingCard({name,price,period='/Monat',band,bandTone='accent',current=false,creditsOptions,highlights=[],highlightsTitle='Paket-Highlights:',cta='Paket wählen',ctaVariant,onCta,style}){
  const bands={accent:{background:'var(--accent-grad)',color:'#fff'},offer:{background:'linear-gradient(180deg,#7BE0A8,#4ECE8B)',color:'#0E4A2B'}};
  return <div style={{width:300,background:'var(--surface-card)',borderRadius:'var(--radius-xl)',boxShadow:'var(--shadow-md)',overflow:'hidden',fontFamily:'var(--font-ui)',display:'flex',flexDirection:'column',...style}}>
    {band&&<div style={{textAlign:'center',padding:'12px 16px',fontSize:15,fontWeight:600,...bands[bandTone]}}>{band}</div>}
    <div style={{padding:28,display:'flex',flexDirection:'column',gap:18,flex:1}}>
      <div style={{display:'flex',alignItems:'center',gap:10,fontSize:20,fontWeight:600}}>{name}{current&&<Badge tone="accent">Aktuell</Badge>}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:6}}><span style={{fontSize:44,fontWeight:700,letterSpacing:'-0.02em'}}>{price}</span><span style={{fontSize:17,color:'var(--text-secondary)'}}>{period}</span></div>
      <Button variant={ctaVariant||(band?'primary':'secondary')} disabled={current} onClick={onCta} style={{width:'100%'}}>{current?'Aktuelles Paket':cta}</Button>
      {creditsOptions&&<Select options={creditsOptions} style={{width:'100%'}}/>}
      {highlights.length>0&&<div style={{borderTop:'1px solid var(--gray-100)',paddingTop:16,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{fontSize:15,fontWeight:600}}>{highlightsTitle}</div>
        {highlights.map((h,i)=><div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:15,color:'var(--text-primary)'}}>
          <span style={{width:20,height:20,borderRadius:'50%',background:'var(--success-soft)',color:'var(--green-500)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>{h}
        </div>)}
      </div>}
    </div>
  </div>;
}
