import React from 'react';
export function Card({inset=false,padding=24,radius=20,shadow='sm',children,style,...rest}){
  return <div style={{background:inset?'var(--surface-subtle)':'var(--surface-card)',borderRadius:radius,padding,boxShadow:inset?'none':`var(--shadow-${shadow})`,border:inset?'1px solid var(--gray-100)':'none',fontFamily:'var(--font-ui)',...style}} {...rest}>{children}</div>;
}
