import {moneyKeys} from "./reportConfig";
import {formatCurrency} from "../../utils/calculateSaleTotals";
export function money(value){return formatCurrency(value);}
export function quantity(value){return new Intl.NumberFormat('en-PK',{maximumFractionDigits:3}).format(Number(value||0));}
export function label(key){return key.split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');}
export function display(key,value){if(value===null||value===undefined||value==='')return '-';if(moneyKeys.has(key))return money(value);if(key.includes('percentage')||key.includes('margin')||key==='contribution')return `${quantity(value)}%`;if(key.includes('date')||key.includes('movement')||key==='period_start'){const date=new Date(String(value).replace(' ','T'));return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',...(String(value).includes(':')?{timeStyle:'short'}:{})}).format(date);}if(key.includes('status')||key.includes('method')||key.includes('type'))return String(value).replaceAll('_',' ');if(typeof value==='number'||/^-?\d+(\.\d+)?$/.test(String(value)))return quantity(value);return String(value);}
