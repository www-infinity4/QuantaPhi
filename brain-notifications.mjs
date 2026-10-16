// One recorded notification stays selected until the owner uses an arrow.
export class NotificationDeck {
 constructor(limit=200){this.limit=limit;this.entries=[];this.selectedId=null;}
 add(values){
  const known=new Set(this.entries.map(row=>row.id));
  for(const row of Array.isArray(values)?values:[]){
   if(!row||typeof row.id!=='string'||known.has(row.id)||!Number.isFinite(Date.parse(row.when)))continue;
   known.add(row.id);this.entries.push(row);
  }
  this.entries.sort((a,b)=>Date.parse(b.when)-Date.parse(a.when)||a.id.localeCompare(b.id));
  this.entries=this.entries.slice(0,this.limit);
  if(!this.entries.some(row=>row.id===this.selectedId))this.selectedId=this.entries[0]?.id||null;
  return this.current;
 }
 get index(){return this.entries.findIndex(row=>row.id===this.selectedId);}
 get current(){return this.entries[this.index]||null;}
 move(direction){
  const index=Math.max(0,Math.min(this.entries.length-1,this.index+direction));
  this.selectedId=this.entries[index]?.id||null;return this.current;
 }
}
