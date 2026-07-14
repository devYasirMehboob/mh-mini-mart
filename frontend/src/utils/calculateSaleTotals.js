export const POS_TAX_RATE = 0;
let currency={currency_symbol:"Rs.",currency_position:"before",decimal_places:2,thousand_separator:",",decimal_separator:"."};
export function configureCurrency(settings={}){currency={...currency,...settings};}
export function calculateSaleTotals(items,discountType="fixed",discountValue=0,taxRate=POS_TAX_RATE,taxMode="after_discount"){
 const subtotal=items.reduce((sum,item)=>sum+Number(item.selling_price)*item.cartQuantity,0);
 const entered=Math.max(0,Number(discountValue)||0);const discount=discountType==="percentage"?Math.min(subtotal,subtotal*Math.min(entered,100)/100):Math.min(subtotal,entered);
 const taxable=taxMode==="before_discount"?subtotal:Math.max(0,subtotal-discount);const tax=taxable*Math.max(0,Number(taxRate)||0)/100;
 return{subtotal,discount,tax,grandTotal:Math.max(0,subtotal-discount)+tax};
}
export function formatCurrency(value){
 const places=Math.max(0,Math.min(3,Number(currency.decimal_places)||0));const amount=(Number(value)||0).toFixed(places);let[whole,fraction]=amount.split(".");
 const negative=whole.startsWith("-");if(negative)whole=whole.slice(1);whole=whole.replace(/\B(?=(\d{3})+(?!\d))/g,currency.thousand_separator??",");
 let formatted=(negative?"-":"")+whole+(places?(currency.decimal_separator??".")+fraction:"");const symbol=currency.currency_symbol||currency.currency_code||"";
 return currency.currency_position==="after"?formatted+" "+symbol:symbol+" "+formatted;
}
function parseDate(value){if(value instanceof Date)return value;return new Date(String(value||"").replace(" ","T"));}
function parts(value){const date=parseDate(value);return{day:String(date.getDate()).padStart(2,"0"),month:String(date.getMonth()+1).padStart(2,"0"),year:String(date.getFullYear())};}
export function formatDate(value){const p=parts(value);return ({'d-m-Y':p.day+"-"+p.month+"-"+p.year,'m-d-Y':p.month+"-"+p.day+"-"+p.year,'Y-m-d':p.year+"-"+p.month+"-"+p.day,'d/m/Y':p.day+"/"+p.month+"/"+p.year})[currency.date_format]||p.day+"-"+p.month+"-"+p.year;}
export function formatTime(value){const date=parseDate(value);let hour=date.getHours();const minute=String(date.getMinutes()).padStart(2,"0");if(currency.time_format==="24")return String(hour).padStart(2,"0")+":"+minute;const suffix=hour>=12?"PM":"AM";hour=hour%12||12;return hour+":"+minute+" "+suffix;}
export function formatDateTime(value){return formatDate(value)+" "+formatTime(value);}