import {useState} from 'react';
import {supabase} from '@/api/supabaseClient';
import {apiClient} from '@/lib/apiClient';
import {toast} from '@/components/ui/use-toast';
export function useCartSync(){
 const [adding,setAdding]=useState(null),[error,setError]=useState(''),[cartCount,setCartCount]=useState(()=>Number(localStorage.getItem('bb_cart_count')||0));
 async function addToCart(product){
  if(adding)return false;setAdding(product.id);setError('');
  try{
   if(!/^[a-f0-9-]{36}$/i.test(product.id))throw new Error('Ce produit partenaire se commande avec le bouton Acheter maintenant.');
   const {data:{session}}=await supabase.auth.getSession();let rows;
   if(session)rows=(await apiClient.post('/cart',{action:'add',item:{produit_id:product.id,quantity:1}})).panier.items;
   else{
    rows=JSON.parse(localStorage.getItem('bb_local_cart')||'[]');const found=rows.find(i=>i.produit_id===product.id);
    if(found)found.quantity+=1;else rows.push({produit_id:product.id,name:product.name,price:product.price,image_url:product.img||product.image_url||'',quantity:1});
    localStorage.setItem('bb_local_cart',JSON.stringify(rows));
   }
   setCartCount(rows.length);localStorage.setItem('bb_cart_count',String(rows.length));window.dispatchEvent(new Event('bb-cart-updated'));return true;
  }catch(e){setError(e.message);toast({variant:'destructive',title:'Ajout au panier impossible',description:e.message});return false;}finally{setAdding(null);}
 }
 return {addToCart,adding,cartCount,error};
}
