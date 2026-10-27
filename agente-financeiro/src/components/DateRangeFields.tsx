"use client";
import {useId,useState} from "react";
export default function DateRangeFields({from,to,all=false,allowAll=false}:{from:string;to:string;all?:boolean;allowAll?:boolean}) {
 const [start,setStart]=useState(from),[end,setEnd]=useState(to),[unlimited,setUnlimited]=useState(all);const id=useId();
 return <fieldset className="date-range-fields"><legend>Período desejado</legend><div className="date-range-inputs">
 <label>Data inicial<input type="date" name="start" value={start} min="1900-01-01" max={end||"9998-12-31"} required={!unlimited} disabled={unlimited} aria-describedby={id} onChange={e=>setStart(e.target.value)}/></label>
 <label>Data final<input type="date" name="end" value={end} min={start||"1900-01-01"} max="9998-12-31" required={!unlimited} disabled={unlimited} aria-describedby={id} onChange={e=>setEnd(e.target.value)}/></label></div>
 <small id={id} className="field-hint">Inclui a data inicial e todo o dia final.</small>
 {allowAll&&<label className="range-all"><input type="checkbox" name="all" value="1" checked={unlimited} onChange={e=>setUnlimited(e.target.checked)}/>Todos os períodos</label>}</fieldset>;
}
