/**
 * sfnt-name.mjs — rewrite the `name` table of an SFNT (TrueType/OpenType) font and rebuild the file.
 *
 * Why: the shipped webfont chunks are *modified* versions (subsets) of an OFL-1.1 font whose
 * family name is a Reserved Font Name. OFL 1.1 condition 3 says a modified version must not use
 * the reserved name, so the build renames the internal family to "Renewal Sans" (the family the
 * site's CSS already uses). Copyright (0), trademark (7), manufacturer (8), designer (9),
 * description (10), URLs (11, 12) and licence (13, 14) records are kept verbatim — they are the
 * attribution the licence requires us to keep.
 *
 * The file is rebuilt from scratch: tables sorted by tag, 4-byte aligned, per-table checksums
 * recomputed and head.checkSumAdjustment set so the whole-font checksum is 0xB1B0AFBA.
 */

const KEEP = new Set([0, 7, 8, 9, 10, 11, 12, 13, 14]);

function u16(buf, o) {
  return buf.readUInt16BE(o);
}
function u32(buf, o) {
  return buf.readUInt32BE(o);
}

/** Parse the table directory. */
export function readTables(buf) {
  const numTables = u16(buf, 4);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    const tag = buf.toString("latin1", o, o + 4);
    const offset = u32(buf, o + 8);
    const length = u32(buf, o + 12);
    tables.push({ tag, data: Buffer.from(buf.subarray(offset, offset + length)) });
  }
  return { flavor: u32(buf, 0), tables };
}

function decode(pid, raw) {
  if (pid === 1) return raw.toString("latin1");
  let s = "";
  for (let k = 0; k + 1 < raw.length; k += 2) s += String.fromCharCode(raw.readUInt16BE(k));
  return s;
}
function encode(pid, s) {
  if (pid === 1) return Buffer.from(s, "latin1");
  const b = Buffer.alloc(s.length * 2);
  for (let k = 0; k < s.length; k++) b.writeUInt16BE(s.charCodeAt(k), k * 2);
  return b;
}

/** Decode every name record: [{pid, eid, lid, nid, value}] (format 0 records only). */
export function readNames(nameTable) {
  const count = u16(nameTable, 2);
  const strOff = u16(nameTable, 4);
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    const pid = u16(nameTable, r);
    const eid = u16(nameTable, r + 2);
    const lid = u16(nameTable, r + 4);
    const nid = u16(nameTable, r + 6);
    const len = u16(nameTable, r + 8);
    const off = u16(nameTable, r + 10);
    out.push({ pid, eid, lid, nid, value: decode(pid, nameTable.subarray(strOff + off, strOff + off + len)) });
  }
  return out;
}

function buildNameTable(records) {
  // sort per spec: platformID, encodingID, languageID, nameID
  const recs = [...records].sort((a, b) => a.pid - b.pid || a.eid - b.eid || a.lid - b.lid || a.nid - b.nid);
  const strings = [];
  const pool = new Map();
  let poolLen = 0;
  const entries = recs.map((r) => {
    const bytes = encode(r.pid, r.value);
    const key = bytes.toString("hex");
    let off = pool.get(key);
    if (off === undefined) {
      off = poolLen;
      pool.set(key, off);
      strings.push(bytes);
      poolLen += bytes.length;
    }
    return { ...r, len: bytes.length, off };
  });
  const head = Buffer.alloc(6 + entries.length * 12);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(entries.length, 2);
  head.writeUInt16BE(head.length, 4);
  entries.forEach((e, i) => {
    const r = 6 + i * 12;
    head.writeUInt16BE(e.pid, r);
    head.writeUInt16BE(e.eid, r + 2);
    head.writeUInt16BE(e.lid, r + 4);
    head.writeUInt16BE(e.nid, r + 6);
    head.writeUInt16BE(e.len, r + 8);
    head.writeUInt16BE(e.off, r + 10);
  });
  return Buffer.concat([head, ...strings]);
}

function checksum(buf) {
  const padded = buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf;
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

/** Assemble an SFNT from tables (head.checkSumAdjustment recomputed). */
export function writeSfnt(flavor, tables) {
  const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const n = sorted.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  const header = Buffer.alloc(12 + n * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(log, 8);
  header.writeUInt16BE(n * 16 - pow * 16, 10);
  const head = sorted.find((t) => t.tag === "head");
  if (head) head.data.writeUInt32BE(0, 8); // checkSumAdjustment = 0 while summing
  let offset = header.length;
  const chunks = [];
  sorted.forEach((t, i) => {
    const o = 12 + i * 16;
    header.write(t.tag, o, 4, "latin1");
    header.writeUInt32BE(checksum(t.data), o + 4);
    header.writeUInt32BE(offset, o + 8);
    header.writeUInt32BE(t.data.length, o + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    chunks.push(t.data, Buffer.alloc(pad));
    offset += t.data.length + pad;
  });
  const font = Buffer.concat([header, ...chunks]);
  if (head) {
    const adj = (0xb1b0afba - checksum(font)) >>> 0;
    const headEntry = sorted.findIndex((t) => t.tag === "head");
    const headOff = font.readUInt32BE(12 + headEntry * 16 + 8);
    font.writeUInt32BE(adj, headOff + 8);
  }
  return font;
}

/**
 * Rename the family inside an SFNT buffer.
 * @param {Buffer} sfnt
 * @param {{ from: string, family: string, psFamily: string, uniqueSuffix: string }} opts
 */
export function renameFamily(sfnt, { from, family, psFamily, uniqueSuffix }) {
  const { flavor, tables } = readTables(sfnt);
  const nameT = tables.find((t) => t.tag === "name");
  if (!nameT) throw new Error("font has no name table");
  if (u16(nameT.data, 0) !== 0 && u16(nameT.data, 0) !== 1) throw new Error("unsupported name table format");
  const fromPs = from.replace(/\s+/g, "");
  const records = readNames(nameT.data)
    .filter((r) => r.lid < 0x8000) // drop format-1 language-tag records (none expected)
    .map((r) => {
      if (KEEP.has(r.nid)) return r;
      let value = r.value;
      if (r.nid === 1 || r.nid === 4 || r.nid === 16) value = family;
      else if (r.nid === 3) value = `${value.split(";")[0]};${psFamily}-${uniqueSuffix}`;
      else if (r.nid === 6) value = value.includes("-") ? `${psFamily}-${value.split("-").pop()}` : psFamily;
      else if (r.nid === 25) value = psFamily;
      else if (value.includes(fromPs)) value = value.split(fromPs).join(psFamily);
      if (value.includes(from)) value = value.split(from).join(family);
      return { ...r, value };
    });
  nameT.data = buildNameTable(records);
  return writeSfnt(flavor, tables);
}

/** Names (non-attribution records) that still carry the reserved name — must be empty. */
export function reservedNameLeft(sfnt, from) {
  const { tables } = readTables(sfnt);
  const nameT = tables.find((t) => t.tag === "name");
  return readNames(nameT.data).filter((r) => !KEEP.has(r.nid) && r.value.includes(from));
}

export function hasTable(sfnt, tag) {
  return readTables(sfnt).tables.some((t) => t.tag === tag);
}
