export function chooseWeighted<T extends {weight:number|string}>(entries:T[],random:number){
 const total=entries.reduce((n,e)=>n+Number(e.weight),0);
 if(!entries.length||!Number.isFinite(total)||total<=0||entries.some(e=>!Number.isFinite(Number(e.weight))||Number(e.weight)<0))throw new Error('No usable prompt chain is enabled.');
 let cursor=Math.min(Math.max(random,0),1-Number.EPSILON)*total;
 for(const entry of entries){cursor-=Number(entry.weight);if(cursor<0)return entry;}
 return entries[entries.length-1];
}
