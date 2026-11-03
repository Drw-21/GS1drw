/* Shared GS1 parsing — used by the scanner (app/) and the landing page demo. */
const GS = "\u001d";
const AI = {
  "00":{n:"SSCC",f:18},"01":{n:"GTIN",f:14},"02":{n:"Content GTIN",f:14},
  "10":{n:"Batch/Lot",v:20},"11":{n:"Manufacture date",f:6,d:1},"12":{n:"Due date",f:6,d:1},
  "13":{n:"Packaging date",f:6,d:1},"15":{n:"Best before",f:6,d:1},"16":{n:"Sell by",f:6,d:1},
  "17":{n:"Expiry date",f:6,d:1},"20":{n:"Variant",f:2},"21":{n:"Serial",v:20},"22":{n:"CPV",v:20},
  "240":{n:"Additional ID",v:30},"241":{n:"Customer part no.",v:30},"30":{n:"Count",v:8},"37":{n:"Count of units",v:8},
  "710":{n:"NHRN (DE)",v:20},"711":{n:"NHRN (FR)",v:20},"712":{n:"NHRN (ES)",v:20},"713":{n:"NHRN (BR)",v:20},"714":{n:"NHRN (PT)",v:20},"715":{n:"NHRN (US FDA)",v:20},
  "90":{n:"Internal",v:30},"91":{n:"Internal",v:90},"92":{n:"Internal",v:90},"93":{n:"Internal",v:90},"94":{n:"Internal",v:90},
  "95":{n:"Internal",v:90},"96":{n:"Internal",v:90},"97":{n:"Internal",v:90},"98":{n:"Internal",v:90},"99":{n:"Internal",v:90}
};
function findAI(s){ for (const l of [2,3,4]) if (AI[s.slice(0,l)]) return s.slice(0,l); return null; }

function cleanRaw(raw){
  let s = String(raw).replace(/\r|\n/g,"");
  s = s.replace(/<GS>|\{GS\}|\\x1d|\\u001d|~1/gi, GS);  // text stand-ins for FNC1
  s = s.replace(/^\][A-Za-z][0-9]/, "");                // symbology id ]d2 ]C1 ]Q3 ]e0
  return s.replace(new RegExp("^"+GS+"+"),"");
}

function parseGS1(raw){
  const s0 = cleanRaw(raw).trim();
  const out = {};
  if (/^\(\d{2,4}\)/.test(s0)) {                       // human-readable (01)...(17)...
    const re = /\((\d{2,4})\)([^(]*)/g; let m;
    while ((m = re.exec(s0))) out[m[1]] = m[2].replace(new RegExp(GS,"g"),"").trim();
    return Object.keys(out).length ? out : null;
  }
  let s = s0.replace(/\s+/g,"");
  while (s.length){
    s = s.replace(new RegExp("^"+GS+"+"),"");
    if (!s) break;
    const k = findAI(s); if (!k) return Object.keys(out).length ? out : null;
    const spec = AI[k]; s = s.slice(k.length);
    if (spec.f){ const val = s.slice(0,spec.f); if (val.length<spec.f) return null; out[k]=val; s=s.slice(spec.f); }
    else { let end = s.indexOf(GS); if (end<0) end = s.length; end = Math.min(end, spec.v); out[k]=s.slice(0,end); s=s.slice(end); }
  }
  return Object.keys(out).length ? out : null;
}

function gtinCheckOk(g){
  if (!/^\d{8,14}$/.test(g)) return false;
  const d = g.split("").map(Number), c = d.pop(); let sum=0;
  d.reverse().forEach((x,i)=> sum += x*(i%2===0?3:1));
  return (10 - sum%10)%10 === c;
}

/* YYMMDD -> Date. Century per GS1 GenSpecs sliding window; DD "00" = last day of month. */
function gs1Date(yymmdd, now = new Date()){
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy=+yymmdd.slice(0,2), mm=+yymmdd.slice(2,4), dd=+yymmdd.slice(4,6);
  if (mm<1||mm>12) return null;
  const cy = now.getFullYear(), cent = Math.floor(cy/100)*100, diff = yy - cy%100;
  let year = cent + yy; if (diff>=51) year -= 100; else if (diff<=-50) year += 100;
  const day = dd===0 ? new Date(year, mm, 0).getDate() : dd;
  return new Date(year, mm-1, day);
}

function classify(raw, format){
  const fmt = (format||"").toUpperCase();
  const digits = String(raw).replace(/\D/g,"");
  if (/EAN|UPC/.test(fmt) || (!fmt && /^\d{8}$|^\d{12,13}$/.test(String(raw).trim()))){
    return {kind:"Retail barcode (GTIN only)", ais:{"01":digits.padStart(14,"0")}};
  }
  const ais = parseGS1(raw);
  const looksGS1 = ais && (ais["01"]||ais["00"]||ais["17"]) &&
    (!ais["01"] || /^\d{14}$/.test(ais["01"]));
  if (looksGS1) return {kind: /DATA_MATRIX/.test(fmt)?"GS1 DataMatrix": /CODE_128/.test(fmt)?"GS1-128": /QR/.test(fmt)?"GS1 QR":"GS1 data", ais};
  return {kind:"Non-GS1 code", ais:{}, text:String(raw)};
}

function evaluate(exp, mfg, rules, now = new Date()){
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!exp) return {status:"none", label:"Enter expiry date"};
  const days = Math.round((exp - today)/864e5);
  const months = days/30.4375;
  let pct = null;
  if (mfg && exp>mfg) pct = Math.max(0, Math.min(100, (exp - today)/(exp - mfg)*100));
  let status="ok", label="Acceptable";
  if (days<0){status="bad";label="Expired";}
  else if (pct!==null && pct<rules.minPct){status="bad";label="Below min. shelf life";}
  else if (months<rules.nearMonths){status="warn";label="Near expiry";}
  return {days, months, pct, status, label};
}