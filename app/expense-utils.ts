import {currencyDigits} from './money';
type Entry={amount:number,currency:string,category:string,description?:string};
export type FxSnapshot={rates:Record<string,number>,dates:Record<string,string>,fetchedAt:number};
export function isFxSnapshot(value:unknown):value is FxSnapshot{
 if(!value||typeof value!=='object')return false;const v=value as FxSnapshot;
 return !!v.rates&&typeof v.rates==='object'&&v.rates.USD===1&&Object.entries(v.rates).every(([c,r])=>/^[A-Z]{3}$/.test(c)&&typeof r==='number'&&Number.isFinite(r)&&r>0)&&!!v.dates&&typeof v.dates==='object'&&Object.values(v.dates).every(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))&&typeof v.fetchedAt==='number'&&Number.isFinite(v.fetchedAt);
}
export function matchesExpenseSearch(entry:Entry,query:string){
 const text=`${entry.category} ${entry.description||''} ${entry.currency}`.normalize('NFKC').toLowerCase();
 const amount=String(entry.amount/10**currencyDigits(entry.currency));
 return query.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean).every(term=>{
  if(text.includes(term))return true;const numeric=term.replace(/[$€£¥,]/g,'');
  return /^\d+(?:\.\d+)?$/.test(numeric)&&amount.includes(String(Number(numeric)));
 });
}
export function convertTripEntries<T extends Entry>(entries:T[],target:string,rates?:Record<string,number>){
 const missing=new Set<string>();const converted:T[]=[];
 for(const e of entries){if(e.currency===target){converted.push(e);continue;}
  const fromRate=rates?.[e.currency],toRate=rates?.[target];
  if(!fromRate||!toRate||!Number.isFinite(fromRate)||!Number.isFinite(toRate)){missing.add(e.currency);continue;}
  // Converted values are display estimates; preserve source minor units in storage.
  converted.push({...e,amount:e.amount/10**currencyDigits(e.currency)*toRate/fromRate*10**currencyDigits(target),currency:target});
 }
 return {entries:converted,missing:[...missing]};
}
