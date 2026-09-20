import './src/config/env.js';
import fs from 'node:fs';
import {getSupabaseAdmin} from './src/config/supabase.js';
const base=process.env.SUPABASE_URL;
const response=await fetch(base+'/rest/v1/',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,Accept:'application/openapi+json'},signal:AbortSignal.timeout(15000)});
if(!response.ok){console.log(JSON.stringify({metadataAccess:false,status:response.status}));process.exit(1);}
const schema=await response.json();
const allowed=['profiles','ProfilPro','Service','Reservation','Produit','Commande','Avis','LiveSession','DemandeProV2','Notification','Panier','bb_admin_memberships','bb_seller_accounts'];
const tables=Object.fromEntries(allowed.map(name=>[name,schema.definitions?.[name]?Object.keys(schema.definitions[name].properties||{}):null]));
const columnTypes=Object.fromEntries(Object.entries(schema.definitions||{}).map(([name,definition])=>[name,Object.fromEntries(Object.entries(definition.properties||{}).map(([field,p])=>[field,{type:p.type,format:p.format,...(p.items?{items:{type:p.items.type,format:p.items.format}}:{})}]))]));
const storage=await getSupabaseAdmin().storage.listBuckets();
const report={checkedAt:new Date().toISOString(),metadataAccess:true,tables,columnTypes,storageAccessible:!storage.error,buckets:storage.data?.map(b=>({id:b.id,public:b.public}))||[]};
fs.mkdirSync('../../../docs/audit',{recursive:true});
fs.writeFileSync('../../../docs/audit/remote-schema.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({metadataAccess:true,existingTables:allowed.filter(n=>tables[n]),missingTables:allowed.filter(n=>!tables[n]),storageAccessible:report.storageAccessible,bucketCount:report.buckets.length}));
