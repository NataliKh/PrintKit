/* Private, device-local snapshots of editor settings. No generated HTML or PDF is stored. */
const savedKitStore=(()=>{
 const KEY="printkit.saved.v1";
 const LIMIT=12;
 const NAME_LIMIT=48;
 function nameOf(value){
  return typeof value==="string"?value.replace(/\s+/g," ").trim():"";
 }
 function allowedValues(mode,input,configs){
  if(!input||typeof input!=="object"||Array.isArray(input)||!configs[mode])return null;
  const result={};
  for(const [key,,type,choices] of configs[mode]){
   if(!Object.hasOwn(input,key))continue;
   const value=input[key];
   if(typeof value!=="string")continue;
   const max=type==="textarea"?8000:type==="number"?40:200;
   if(value.length>max)return null; // Never silently truncate a saved project.
   if(type==="select"&&!choices.split("|").includes(value))continue;
   result[key]=value;
  }
  return result;
 }
 function read(storage,modes,configs){
  try{
   const parsed=JSON.parse(storage.getItem(KEY)||"null");
   if(!parsed||parsed.version!==1||!Array.isArray(parsed.items))return [];
   const ids=new Set(),items=[];
   for(const entry of parsed.items.slice(0,100)){
    if(!entry||typeof entry!=="object"||!modes.includes(entry.mode))continue;
    if(typeof entry.id!=="string"||!/^[a-zA-Z0-9_-]{1,90}$/.test(entry.id)||ids.has(entry.id))continue;
    const name=nameOf(entry.name);
    if(!name||name.length>NAME_LIMIT)continue;
    const values=allowedValues(entry.mode,entry.values,configs);
    if(!values||!Object.keys(values).length)continue;
    const savedAt=Number(entry.savedAt);
    if(!Number.isFinite(savedAt)||savedAt<=0)continue;
    ids.add(entry.id);
    items.push({id:entry.id,mode:entry.mode,name,values,savedAt});
    if(items.length===LIMIT)break;
   }
   return items;
  }catch{return []}
 }
 function write(storage,items){
  try{
   storage.setItem(KEY,JSON.stringify({version:1,items}));
   return {ok:true};
  }catch{
   return {ok:false,code:"storage"};
  }
 }
 function add(storage,modes,configs,mode,name,values){
  const cleanName=nameOf(name);
  if(!cleanName||cleanName.length>NAME_LIMIT)return {ok:false,code:"name"};
  if(!modes.includes(mode))return {ok:false,code:"mode"};
  const cleanValues=allowedValues(mode,values,configs);
  if(!cleanValues||!Object.keys(cleanValues).length)return {ok:false,code:"values"};
  const items=read(storage,modes,configs);
  if(items.length>=LIMIT)return {ok:false,code:"limit"};
  const id=globalThis.crypto?.randomUUID?.().replace(/-/g,"")||
   Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12);
  const entry={id,mode,name:cleanName,values:cleanValues,savedAt:Date.now()};
  const saved=write(storage,[entry,...items]);
  return saved.ok?{ok:true,entry}:saved;
 }
 function remove(storage,modes,configs,id){
  const items=read(storage,modes,configs);
  if(!items.some(item=>item.id===id))return {ok:false,code:"missing"};
  return write(storage,items.filter(item=>item.id!==id));
 }
 return {KEY,LIMIT,NAME_LIMIT,read,add,remove};
})();
