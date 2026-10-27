import { parseBRDate, parseBRMoney, formatBRMoney } from "./input-format";
export type ImportRow={kind:"PAYMENT"|"RECEIPT";name:string;amount:string;date:string;done:boolean;actualDate:string;category:string;selected:boolean};
const clean=(s:string)=>s.replace(/&#x20;/g," ").replace(/\*\*/g,"").trim();
const key=(s:string)=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function readDelimited(text:string):string[][] {
 const first=text.split(/\r?\n/).find(s=>s.trim())??"";
 const sep=first.includes("\t")?"\t":first.trim().startsWith("|")?"|":first.includes(";")?";":",";
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===sep||c==='\n')){row.push(clean(cell));cell="";if(c==='\n'){rows.push(sep==='|'?row.slice(1,-1):row);row=[];}}else if(c!=='\r')cell+=c;}
 if(quoted)throw new Error("Há aspas sem fechamento no arquivo.");
 if(cell||row.length){row.push(clean(cell));rows.push(sep==='|'?row.slice(1,-1):row);}
 return rows.filter(r=>r.some(Boolean));
}
function dateValue(raw:string,month:string){const value=clean(raw);if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const parsed=parseBRDate(value);if(parsed)return parsed;const m=/^(?:dia\s*)?(\d{1,2})$/i.exec(value);return m?`${month}-${m[1].padStart(2,"0")}`:"";}
export function parseSheet(text:string,month:string,defaultKind:"PAYMENT"|"RECEIPT"="PAYMENT"):ImportRow[]{
 if(text.length>300000)throw new Error("Use até 300 KB por importação.");
 const matrix=readDelimited(text);const result:ImportRow[]=[];
 const headerIndex=matrix.findIndex(r=>r.some(c=>["descricao","nome","conta"].includes(key(c)))&&r.some(c=>["valor","amount"].includes(key(c))));
 const make=(name:string,rawAmount:string,date:string,status:string,kind:ImportRow["kind"],actualDate="",category="Outros")=>{
  const value=parseBRMoney(clean(rawAmount));result.push({kind,name:clean(name),amount:value===null?clean(rawAmount):formatBRMoney(value),date:dateValue(date,month),done:["pago","paga","recebido","recebida","paid","received"].includes(key(status)),actualDate:dateValue(actualDate,month),category:category||"Outros",selected:true});
 };
 if(headerIndex>=0){const headers=matrix[headerIndex].map(key);const col=(r:string[],names:string[])=>r[headers.findIndex(h=>names.includes(h))]??"";
  for(const r of matrix.slice(headerIndex+1)){const name=col(r,["descricao","nome","conta"]);if(!name)continue;make(name,col(r,["valor","amount"]),col(r,["data","vencimento","data prevista"]),col(r,["status","situacao"]),["receita","renda","entrada","receipt"].includes(key(col(r,["tipo"])))?"RECEIPT":col(r,["tipo"])?"PAYMENT":defaultKind,col(r,["data efetiva","data pagamento","data recebimento"]),col(r,["categoria"]));}
 }else{
  const skip=/^(financeiro|detalhamentos?|contas?|davi|pai|temos|sobra|renda total|gastos total|total|pendente|pago|paga|recebido|recebida)$/;
  let section=defaultKind;
  for(const r of matrix){if(r.some(c=>/^detalhamentos?|^contas?$/.test(key(c)))){section="PAYMENT";continue;}
   const status=r.find(c=>/^(pago|paga|pendente|recebido|recebida)$/i.test(c))??"";
   const date=r.find(c=>/^dia\s*\d+/i.test(c)||/^\d{2}\/\d{2}\/\d{4}$/.test(c))??"";
   for(let i=0;i<r.length-1;i++){const name=r[i];if(!name||skip.test(key(name))||/^[\s:—-]+$/.test(name)||/^R\$|^\d|^dia\s/i.test(name))continue;
    const next=r[i+1];if(!next||parseBRMoney(next)!==null){make(name,next,date,status,/renda|salario|extras/.test(key(name))?"RECEIPT":section);i++;}
   }
  }
 }
 if(!result.length)throw new Error("Nenhum lançamento identificado. Use as colunas do modelo ou cole as células da planilha.");
 if(result.length>200)throw new Error("Importe até 200 lançamentos por vez.");
 return result;
}
