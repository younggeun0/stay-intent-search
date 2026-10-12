import raw from "./cases.json";
import { EvalCase, type SearchConditions } from "../src/lib/schema";

export const EMPTY: SearchConditions = {
  region: null, area: null, checkIn: null, checkOut: null, dateRange: null, nights: null, weekend: null,
  guests: null, infants: null,
  pet: null, oceanView: null, minBedrooms: null, minBeds: null,
  features: [], facilities: [], needsClarification: [], unhandled: [],
};

export const cases: EvalCase[] = raw.map((c) => EvalCase.parse({ ...c, expected: { ...EMPTY, ...c.expected } }));
