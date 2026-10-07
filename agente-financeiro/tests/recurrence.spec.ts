import { describe,it,expect } from 'vitest';
import { occurrenceDates } from '../src/lib/recurrence';
import { urgency } from '../src/lib/urgency';
describe('recurrence calendar boundaries',()=>{
 it('clamps short months without drifting from the original day',()=>expect(occurrenceDates('2026-01-31','MONTHLY',3)).toEqual(['2026-01-31','2026-02-28','2026-03-31']));
 it('restores leap day in a leap year',()=>expect(occurrenceDates('2024-02-29','YEARLY',5)).toEqual(['2024-02-29','2025-02-28','2026-02-28','2027-02-28','2028-02-29']));
 it('includes the end date and excludes later occurrences',()=>expect(occurrenceDates('2026-11-15','MONTHLY',12,'2027-01-15')).toEqual(['2026-11-15','2026-12-15','2027-01-15']));
 it('rejects invalid dates and unbounded batches',()=>{expect(()=>occurrenceDates('2026-02-30','MONTHLY',2)).toThrow();expect(()=>occurrenceDates('2026-01-01','MONTHLY',61)).toThrow();expect(()=>occurrenceDates('2026-01-01','MONTHLY',3,'2025-12-31')).toThrow();});
});
describe('urgency across periods',()=>{
 const p=(due:string,status='PARTIAL')=>({dueDate:new Date(due+'T23:59:00Z'),amount:100,paidAmount:25,status});
 it('keeps prior-month partial payments overdue',()=>expect(urgency(p('2026-09-30'),'2026-10-07')).toBe('OVERDUE'));
 it('separates today and the next seven full calendar days',()=>{expect(urgency(p('2026-10-07'),'2026-10-07')).toBe('TODAY');expect(urgency(p('2026-10-14'),'2026-10-07')).toBe('UPCOMING');expect(urgency(p('2026-10-15'),'2026-10-07')).toBe('FUTURE');});
 it('does not label paid bills overdue',()=>expect(urgency(p('2026-09-01','PAID'),'2026-10-07')).toBe('PAID'));
});
