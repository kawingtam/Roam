type Entry={amount:number,currency:string,category:string,date:string};
export function tripStats(entries:Entry[],currency:string,today:string){
 const matching=entries.filter(e=>e.currency===currency);
 const categories:Record<string,number>={};let total=0,todayTotal=0;
 for(const e of matching){total+=e.amount;if(e.date===today)todayTotal+=e.amount;categories[e.category]=(categories[e.category]||0)+e.amount;}
 const top=Object.entries(categories).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 return {total,todayTotal,topCategory:top?.[0]||'',topAmount:top?.[1]||0,count:matching.length};
}
