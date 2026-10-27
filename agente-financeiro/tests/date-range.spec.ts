import {describe,it,expect} from 'vitest';
import {dateRange,validCalendarDate,rangeBuckets} from '../src/lib/date-range';
describe('calendar intervals',()=>{
 it('includes the complete final day, even for a single-day range',()=>{const r=dateRange({start:'2026-10-20',end:'2026-10-20'});expect(r.start.toISOString()).toBe('2026-10-20T00:00:00.000Z');expect(r.end.toISOString()).toBe('2026-10-21T00:00:00.000Z');});
 it('validates calendar dates and leap years',()=>{expect(validCalendarDate('2024-02-29')).toBe(true);for(const d of ['2026-02-29','2026-04-31','x','2026-13-01','9999-01-01'])expect(validCalendarDate(d)).toBe(false);});
 it('rejects reversed and incomplete ranges',()=>{expect(dateRange({start:'2026-10-20',end:'2026-10-01'}).error).toBeTruthy();expect(dateRange({start:'2026-10-01'}).error).toBeTruthy();});
 it('supports legacy month links and explicit unlimited lists',()=>{expect(dateRange({month:'2026-02'}).to).toBe('2026-02-28');expect(dateRange({all:'1'},true).all).toBe(true);expect(dateRange({all:'1'}).all).toBe(false);});
 it('preserves dates in navigation',()=>{expect(dateRange({start:'2025-12-30',end:'2026-01-02'}).search).toBe('start=2025-12-30&end=2026-01-02');});
 it('covers ranges with no gaps or overlaps and at most twelve buckets',()=>{for(const [start,end] of [['2026-10-20','2026-10-20'],['2025-12-30','2026-02-04'],['1900-01-01','9998-12-31']]){const r=dateRange({start,end}),b=rangeBuckets(r);expect(b.length).toBeLessThanOrEqual(12);expect(+b[0].start).toBe(+r.start);expect(+b.at(-1)!.end).toBe(+r.end);b.forEach((x,i)=>{expect(+x.end).toBeGreaterThan(+x.start);if(i)expect(+x.start).toBe(+b[i-1].end);});}});
});
