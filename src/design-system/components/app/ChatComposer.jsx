import React from 'react';
import {Button} from '../core/Button.jsx';
export function ChatComposer({placeholder='Frag mich etwas...',hero=false,onSend,actions,style}){
  const [v,setV]=React.useState('');
  const send=()=>{if(v.trim()){onSend&&onSend(v);setV('')}};
  return <div style={{background:'var(--surface-card)',border:'1px solid var(--gray-100)',borderRadius:hero?'var(--radius-2xl)':'var(--radius-xl)',boxShadow:hero?'var(--shadow-lg)':'var(--shadow-sm)',padding:hero?'24px 28px 18px':'16px 18px 12px',display:'flex',flexDirection:'column',gap:hero?28:14,fontFamily:'var(--font-ui)',...style}}>
    <input value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={placeholder} style={{border:'none',outline:'none',font:`${hero?20:16}px var(--font-ui)`,letterSpacing:'-0.01em',color:'var(--text-primary)',background:'transparent'}}/>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <button style={{width:40,height:40,borderRadius:'50%',border:'1px solid var(--gray-200)',background:'#fff',fontSize:18,color:'var(--text-secondary)',cursor:'pointer'}}>+</button>
      {actions}
      <div style={{flex:1}}></div>
      <button style={{width:40,height:40,borderRadius:'50%',border:'1px solid var(--gray-200)',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 19v3M8 22h8M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg></button>
      <button onClick={send} style={{width:40,height:40,borderRadius:'50%',border:'none',background:'var(--accent-grad)',boxShadow:'var(--shadow-accent)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
    </div>
  </div>;
}
