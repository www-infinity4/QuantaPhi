import {BRAND_PRODUCT_CARDS,validBrandProduct,createBrandProductCard} from './brand-product-cards.mjs';

const root=document.getElementById('productQuickCard');
const requested=new URLSearchParams(location.search).get('card')||'';
const card=BRAND_PRODUCT_CARDS.find(item=>item.id===requested&&validBrandProduct(item));

if(root){
 root.replaceChildren();
 if(!card){
  const message=document.createElement('p');
  message.textContent='That product card is unavailable. Choose a product from the Infinity Quick Cards.';
  root.append(message);
 }else{
  document.title=card.brand+' '+card.title+' · Infinity Product Quick Card';
  root.append(createBrandProductCard(card));
 }
}
