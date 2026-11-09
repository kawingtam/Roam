import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const currencies=['USD','HKD','EUR','GBP','JPY','CAD','AUD','SGD','CNY','TWD','THB','KRW'];
export async function GET(){
 if(!await getChatGPTUser())return Response.json({error:'Sign in required.'},{status:401});
 try{
  const response=await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes='+currencies.join(','),{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Rate source unavailable');
  const rows=await response.json() as {date:string,base:string,quote:string,rate:number}[];
  if(!Array.isArray(rows))throw new Error('Invalid response');
  const rates:Record<string,number>={USD:1},dates:Record<string,string>={};
  for(const row of rows){const quote=row.quote?.toUpperCase();if(row.base?.toUpperCase()==='USD'&&currencies.includes(quote)&&typeof row.rate==='number'&&Number.isFinite(row.rate)&&row.rate>0&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)){rates[quote]=row.rate;dates[quote]=row.date;}}
  if(!rates.JPY)throw new Error('Missing yen rate');
  return Response.json({rates,dates,fetchedAt:Date.now()},{headers:{'Cache-Control':'private,max-age=3600'}});
 }catch{return Response.json({error:'Exchange rates are temporarily unavailable. Saved rates can still be used.'},{status:502});}
}
