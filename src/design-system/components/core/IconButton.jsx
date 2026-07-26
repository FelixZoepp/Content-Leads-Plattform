import React from 'react';
export function IconButton({size='md',active=false,children,style,...rest}){
  const d={sm:32,md:40,lg:48}[size];
  return <button style={{width:d,height:d,borderRadius:'var(--radius-sm)',border:active?'1px solid var(--gold-200)':'1px solid transparent',background:active?'var(--ds-accent-soft)':'transparent',color:active?'var(--gold-600)':'var(--text-secondary)',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background var(--dur-fast) var(--ease-out)',...style}}
    onMouseEnter={e=>{if(!active)e.currentTarget.style.background='var(--gray-050)'}}
    onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}
    {...rest}>{children}</button>;
}
