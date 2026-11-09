'use client';
import {useState} from 'react';
export const overviewColors=['#568e4d','#8cb67d','#b2cea5','#d4e3cc','#6b9e61','#a1c093','#c5dab9','#e4eddf'];
export function segmentArc(start:number,sweep:number){
 const point=(angle:number)=>{const radians=(angle-90)*Math.PI/180;return `${50+43.75*Math.cos(radians)} ${50+43.75*Math.sin(radians)}`;};
 return `M ${point(start)} A 43.75 43.75 0 0 1 ${point(start+sweep/2)} A 43.75 43.75 0 0 1 ${point(start+sweep)}`;
}
export default function OverviewChart({segments,total,currency}:{segments:{name:string,amount:number}[],total:number,currency:string}){
 const [selected,setSelected]=useState<string|null>(null);
 const active=segments.find(s=>s.name===selected);
 const money=(amount:number)=>new Intl.NumberFormat('en',{style:'currency',currency,currencyDisplay:'narrowSymbol'}).format(amount/10**(new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits??2));
 const formatted=money(active?.amount??total);let offset=0;
 return <div className="overview-chart interactive-chart" role="group" aria-label={`Trip spending in ${currency}. Hover or tap a category for details.`}>
 <svg className="chart-segments" viewBox="0 0 100 100" aria-label="Spending categories"><circle cx="50" cy="50" r="43.75" fill="none" stroke="#edf2e9" strokeWidth="12.5"/>{segments.filter(s=>s.amount>0).map((s,i)=>{const sweep=total?s.amount/total*360:0;const arc=segmentArc(offset,sweep);offset+=sweep;return <path key={s.name} d={arc} fill="none" stroke={overviewColors[i%overviewColors.length]} strokeWidth="12.5" role="button" tabIndex={0} aria-label={`${s.name}: ${currency} ${money(s.amount)}, ${total?Math.round(s.amount/total*100):0}%`} aria-pressed={selected===s.name} onPointerEnter={e=>{if(e.pointerType==='mouse')setSelected(s.name);}} onPointerLeave={e=>{if(e.pointerType==='mouse')setSelected(null);}} onFocus={()=>setSelected(s.name)} onBlur={()=>setSelected(null)} onClick={()=>setSelected(s.name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(s.name);}if(e.key==='Escape')setSelected(null);}} style={{opacity:active&&active.name!==s.name?0.4:1}}/>;})}</svg>
 <button className="donut-center" aria-label="Show total trip spending" onClick={()=>setSelected(null)}><strong className={formatted.length>10?'smaller-total':''}>{formatted}</strong><span>{active?.name||'Total'}</span><small>{active?`${total?Math.round(active.amount/total*100):0}%`:currency}</small></button>
 </div>;
}
