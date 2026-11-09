export const currencyDigits=(currency:string)=>new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits??2;
export function parseAmount(value:string,currency:string){
 const n=Number(value),scale=10**currencyDigits(currency),minor=Math.round(n*scale);
 if(!value.trim()||!Number.isFinite(n)||minor<=0||minor>999999999999||Math.abs(n*scale-minor)>0.0001)throw new Error('Enter a valid amount for this currency.');
 return minor;
}

export const currencySymbol=(currency:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency')?.value||currency;
