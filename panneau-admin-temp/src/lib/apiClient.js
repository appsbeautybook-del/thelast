import { supabase } from '@/api/supabaseClient';
export const apiClient = {
  async request(endpoint, options={}) {
    const {data:{session}}=await supabase.auth.getSession();
    const base=(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/,'').replace(/\/api$/,'');
    const path=endpoint.startsWith('/api/') ? endpoint : '/api'+endpoint;
    const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{}),...options.headers},signal:AbortSignal.timeout(30000)});
    const body=await response.json().catch(()=>({error:'Réponse serveur invalide.'}));
    if(!response.ok || body.success===false || body.error) { const error=new Error(body.error || 'Opération refusée.'); error.code=body.code; error.status=response.status; window.dispatchEvent(new CustomEvent('bb:api-error',{detail:error.message})); throw error; }
    return body;
  },
  get(path){return this.request(path);},
  post(path,data){return this.request(path,{method:'POST',body:JSON.stringify(data)});},
  put(path,data){return this.request(path,{method:'PUT',body:JSON.stringify(data)});},
  delete(path){return this.request(path,{method:'DELETE'});},
  async callFunction(name,payload={}){
    if(name==='adminCreateService'){
      const {action,id,...input}=payload;
      const operation=action==='delete'?'delete':id?'update':'create';
      const result=await this.post('/admin/entities',{table:'Service',operation,id,data:input.data||input});
      return {data:{success:true,service:result.result}};
    }
    throw new Error('Cette action doit utiliser son API administrative dédiée.');
  },
};
export default apiClient;
