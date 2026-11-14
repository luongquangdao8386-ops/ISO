// Phủ điều khoản (phiên 1d, nghiệm thu Đợt 1 mục 7): đếm GIỐNG HỆT hai trang Phủ của file Excel tổng trên cùng dữ liệu.
// Không import gì (Node test chạy thẳng; js/catalog-xlsx.js dùng chung cho cột "Biểu liên quan" khi xuất).
//
// ISO 9001 (chỉ đếm cột G — iso9001): biểu thuộc điều khoản X khi một mã trong G BẮT ĐẦU bằng X.
//   Excel: AA = ";"&SUBSTITUTE(G," ","")&";" rồi COUNTIF(AA, "*;"&X&"*") → 9.2 đếm cả 9.2.2.
// ISO 14001 / 45001 / 50001 (14/11/2026): như ISO 9001 với cột H / I / J (khóa ẩn AB / AC / AD của Excel).
// BRCGS: biểu thuộc chủ đề khi cột K (brc_topics) CHỨA khóa chủ đề (cột H của sheet Phủ BRCGS); COUNTIF không phân biệt hoa thường.
// Đã ban hành = T là ●; In từ app = R bắt đầu bằng "M&E" hoặc "Checksheet" (không tính Một phần / Đề xuất) = nơi làm ME, CS.
// Trạng thái ISO: 0 biểu → MISSING "Thiếu biểu – bắt buộc" (nếu bắt buộc lưu hồ sơ) hoặc NONE "Chưa có biểu"; có biểu, 0 ● →
// NOT_ISSUED "Có biểu, chưa ban hành"; còn lại OK "Đã có". BRCGS dùng NONE, NOT_ISSUED, OK.

/** Chuẩn (thứ tự hiển thị), cột danh mục của từng chuẩn, tên ngắn. ISO 14001 / 45001 / 50001 thêm 14/11/2026 — đếm như ISO 9001 theo cột
 *  H / I / J (iso14001 / iso45001 / iso50001). Giống CLAUSE_STDS_, STD_FIELD_, STD_SHORT_ của máy chủ (00_config.js). */
export const STDS = ['ISO9001', 'ISO14001', 'ISO45001', 'ISO50001', 'BRC'];
export const ISO_STDS = ['ISO9001', 'ISO14001', 'ISO45001', 'ISO50001'];
export const STD_FIELD = { ISO9001: 'iso9001', ISO14001: 'iso14001', ISO45001: 'iso45001', ISO50001: 'iso50001', BRC: 'brc_topics' };
export const STD_SHORT = { ISO9001: 'ISO 9001', ISO14001: 'ISO 14001', ISO45001: 'ISO 45001', ISO50001: 'ISO 50001', BRC: 'BRCGS' };
/** Cột của Danh mục tổng (file Excel) theo chuẩn */
export const STD_COL = { ISO9001: 'G', ISO14001: 'H', ISO45001: 'I', ISO50001: 'J', BRC: 'K' };
const ISO_ST = ['MISSING', 'NONE', 'NOT_ISSUED', 'OK'];
export const COV_STATES = { ISO9001: ISO_ST, ISO14001: ISO_ST, ISO45001: ISO_ST, ISO50001: ISO_ST, BRC: ['NONE', 'NOT_ISSUED', 'OK'] };
export const isIsoStd = (std) => std !== 'BRC';

/** Khóa ISO của biểu như cột AA (9001) / AB / AC / AD của Excel: ";7.5.3;8.5.2;" */
export function isoKeyOf(it, std = 'ISO9001') { return ';' + String((it && it[STD_FIELD[std] || 'iso9001']) || '').replace(/ /g, '') + ';'; }
/** Biểu thuộc điều khoản ISO `key` của chuẩn std (mã trong cột của chuẩn bắt đầu bằng key) */
export function isoMatch(it, key, std = 'ISO9001') { return !!key && isoKeyOf(it, std).includes(';' + String(key)); }
/** Biểu thuộc chủ đề BRCGS `key` (cột K chứa khóa, không phân biệt hoa thường) */
export function brcMatch(it, key) { return !!key && String((it && it.brc_topics) || '').toLowerCase().includes(String(key).toLowerCase()); }
/** Biểu thuộc điều khoản/chủ đề của chuẩn std */
export function clauseMatch(std, it, key) { return std === 'BRC' ? brcMatch(it, key) : isoMatch(it, key, std); }
/** In từ app (M&E, Checksheet) */
export function fromApp(it) { return !!it && (it.where === 'ME' || it.where === 'CS'); }

/** Điều khoản đang dùng của một chuẩn, theo thứ tự trong file */
export function clausesOf(clauses, std) {
  return (clauses || []).filter((c) => c.std === std && c.active !== false)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key)));
}

/** Trạng thái một dòng phủ */
export function covState(std, mandatory, n, issued) {
  if (!n) return isIsoStd(std) && mandatory ? 'MISSING' : 'NONE';
  return issued ? 'OK' : 'NOT_ISSUED';
}

/**
 * Bảng phủ của một chuẩn: [{clause, key, items, n, issued, app, mandatory, state}] theo thứ tự điều khoản.
 * items: mọi biểu đưa vào đếm (kể cả ✕, như Excel đếm cả dòng ✕).
 */
export function coverageRows(items, clauses, std) {
  const list = items || [];
  return clausesOf(clauses, std).map((c) => {
    const hit = list.filter((it) => clauseMatch(std, it, c.key));
    const issued = hit.filter((it) => it.status === 'ISSUED').length;
    const mandatory = isIsoStd(std) && !!c.mandatory_record;
    return { clause: c, key: c.key, items: hit, n: hit.length, issued, app: hit.filter(fromApp).length, mandatory, state: covState(std, mandatory, hit.length, issued) };
  });
}

/** Đếm theo trạng thái: {total, mandatory, MISSING, NONE, NOT_ISSUED, OK} */
export function coverageSummary(rows) {
  const out = { total: rows.length, mandatory: rows.filter((r) => r.mandatory).length, MISSING: 0, NONE: 0, NOT_ISSUED: 0, OK: 0 };
  rows.forEach((r) => { out[r.state]++; });
  return out;
}

/** Điều khoản bắt buộc lưu hồ sơ mà chưa có biểu: một chuẩn ISO, hoặc mọi chuẩn ISO khi không ghi std (ô "Điều khoản ISO bắt buộc chưa có
 *  biểu" của trang Tổng hợp = tổng các trang Phủ ISO 9001 / 14001 / 45001 / 50001) */
export function missingMandatory(items, clauses, std) {
  return (std ? [std] : ISO_STDS).reduce((n, s) => n + coverageRows(items, clauses, s).filter((r) => r.state === 'MISSING').length, 0);
}

/** Chuẩn có điều khoản đang dùng (thứ tự STDS) */
export function stdsWithClauses(clauses) {
  return STDS.filter((s) => (clauses || []).some((c) => c.std === s && c.active !== false));
}

/** Mã của chuẩn ISO std ghi ở danh mục mà không khớp điều khoản nào (mã không bắt đầu bằng điều khoản nào) — để biết mã ghi sai hoặc
 *  danh sách điều khoản thiếu. Tách như Excel: bỏ dấu cách, tách theo ";". Trả [{code, items: [mã biểu]}] theo thứ tự mã. */
export function unmatchedCodes(items, clauses, std) {
  if (!isIsoStd(std)) return [];
  const keys = clausesOf(clauses, std).map((c) => String(c.key)).filter(Boolean);
  if (!keys.length) return [];
  const out = new Map();
  for (const it of items || []) {
    const raw = String((it && it[STD_FIELD[std]]) || '').replace(/ /g, '');
    for (const tok of raw.split(';').map((x) => x.trim()).filter(Boolean)) {
      if (keys.some((k) => tok.startsWith(k))) continue;
      if (!out.has(tok)) out.set(tok, []);
      if (!out.get(tok).includes(it.code)) out.get(tok).push(it.code);
    }
  }
  return [...out.entries()].map(([code, list]) => ({ code, items: list }))
    .sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true }));
}

/* ---------------- Đánh giá nội bộ (4a) ---------------- */

/** Trạng thái phủ của chương trình đánh giá: có đợt đánh giá · Không áp dụng (kèm lý do) · chưa có */
export const AUDIT_COV_STATES = ['MISSING', 'AUDIT', 'NA'];

/**
 * Phủ điều khoản của chương trình đánh giá nội bộ năm (giống auditCoverageSrv_ của máy chủ 35_iaudit.js — test so hai bên): mỗi điều
 * khoản / chủ đề của các chuẩn trong chương trình → [{clause, std, key, audits, na, state: AUDIT | NA | MISSING}].
 * audits: đợt của chương trình (bỏ đợt đã hủy); na: [{c: clause_id, r: lý do}].
 */
export function auditCoverage(clauses, stds, audits, na) {
  const naMap = new Map((na || []).filter((x) => x && x.c).map((x) => [x.c, x.r || '']));
  const live = (audits || []).filter((a) => a.state !== 'CANCELLED' && !a.archived_at);
  const rows = [];
  for (const std of stds) {
    for (const c of clausesOf(clauses, std).filter((x) => !x.archived_at)) {
      const hit = live.filter((a) => (a.clauses_json || []).includes(c.clause_id));
      const isNa = naMap.has(c.clause_id);
      rows.push({ clause: c, std, key: c.key, audits: hit, na: hit.length ? '' : (isNa ? naMap.get(c.clause_id) : ''), state: hit.length ? 'AUDIT' : isNa ? 'NA' : 'MISSING' });
    }
  }
  return rows;
}

/** Đếm phủ của một chuẩn: {total, audit, na, missing} */
export function auditCovCount(rows, std) {
  const list = rows.filter((r) => r.std === std);
  return { total: list.length, audit: list.filter((r) => r.state === 'AUDIT').length, na: list.filter((r) => r.state === 'NA').length, missing: list.filter((r) => r.state === 'MISSING').length };
}
