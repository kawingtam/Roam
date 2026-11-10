export const overviewColors=['#568e4d','#8cb67d','#b2cea5','#d4e3cc','#6b9e61','#a1c093','#c5dab9','#e4eddf'];
export default function OverviewChart({segments,total,currency}:{segments:{name:string,amount:number}[],total:number,currency:string}){
 let offset=0;const stops=segments.map((s,i)=>{const from=offset;offset+=total?s.amount/total*100:0;return `${overviewColors[i%overviewColors.length]} ${from}% ${offset}%`;});
 const formatted=new Intl.NumberFormat('en',{style:'currency',currency,currencyDisplay:'narrowSymbol'}).format(total/10**(new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits??2));
 return <div className="overview-chart" role="img" aria-label={`Trip total ${currency} ${formatted}. ${segments.map(s=>`${s.name}: ${total?Math.round(s.amount/total*100):0}%`).join(', ')}`} style={{background:total?`conic-gradient(${stops.join(',')})`:'#edf2e9'}}><div className="donut-center"><svg className="chart-total" viewBox="0 0 200 42" aria-hidden="true"><text x="100" y="32" textAnchor="middle" fontSize={Math.min(34,320/formatted.length)}>{formatted}</text></svg><span>Total</span><small>{currency}</small></div></div>;
}
