// Phủ điều khoản (phiên 1d, nghiệm thu Đợt 1 mục 7): đếm GIỐNG HỆT hai trang Phủ của file Excel tổng trên cùng dữ liệu.
// Không import gì (Node test chạy thẳng; js/catalog-xlsx.js dùng chung cho cột "Biểu liên quan" khi xuất).
//
// ISO 9001 (chỉ đếm cột G — iso9001): biểu thuộc điều khoản X khi một mã trong G BẮT ĐẦU bằng X.
//   Excel: AA = ";"&SUBSTITUTE(G," ","")&";" rồi COUNTIF(AA, "*;"&X&"*") → 9.2 đếm cả 9.2.2.
// BRCGS: biểu thuộc chủ đề khi cột K (brc_topics) CHỨA khóa chủ đề (cột H của sheet Phủ BRCGS); COUNTIF không phân biệt hoa thường.
// Đã ban hành = T là ●; In từ app = R bắt đầu bằng "M&E" hoặc "Checksheet" (không tính Một phần / Đề xuất) = nơi làm ME, CS.
// Trạng thái ISO: 0 biểu → MISSING "Thiếu biểu – bắt buộc" (nếu bắt buộc lưu hồ sơ) hoặc NONE "Chưa có biểu"; có biểu, 0 ● →
// NOT_ISSUED "Có biểu, chưa ban hành"; còn lại OK "Đã có". BRCGS dùng NONE, NOT_ISSUED, OK.

export const COV_STATES = { ISO9001: ['MISSING', 'NONE', 'NOT_ISSUED', 'OK'], BRC: ['NONE', 'NOT_ISSUED', 'OK'] };

/** Khóa ISO 9001 của biểu như cột AA của Excel: ";7.5.3;8.5.2;" */
export function isoKeyOf(it) { return ';' + String((it && it.iso9001) || '').replace(/ /g, '') + ';'; }
/** Biểu thuộc điều khoản ISO 9001 `key` (mã trong cột G bắt đầu bằng key) */
export function isoMatch(it, key) { return !!key && isoKeyOf(it).includes(';' + String(key)); }
/** Biểu thuộc chủ đề BRCGS `key` (cột K chứa khóa, không phân biệt hoa thường) */
export function brcMatch(it, key) { return !!key && String((it && it.brc_topics) || '').toLowerCase().includes(String(key).toLowerCase()); }
/** Biểu thuộc điều khoản/chủ đề của chuẩn std */
export function clauseMatch(std, it, key) { return std === 'BRC' ? brcMatch(it, key) : isoMatch(it, key); }
/** In từ app (M&E, Checksheet) */
export function fromApp(it) { return !!it && (it.where === 'ME' || it.where === 'CS'); }

/** Điều khoản đang dùng của một chuẩn, theo thứ tự trong file */
export function clausesOf(clauses, std) {
  return (clauses || []).filter((c) => c.std === std && c.active !== false)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.key).localeCompare(String(b.key)));
}

/** Trạng thái một dòng phủ */
export function covState(std, mandatory, n, issued) {
  if (!n) return std === 'ISO9001' && mandatory ? 'MISSING' : 'NONE';
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
    const mandatory = std === 'ISO9001' && !!c.mandatory_record;
    return { clause: c, key: c.key, items: hit, n: hit.length, issued, app: hit.filter(fromApp).length, mandatory, state: covState(std, mandatory, hit.length, issued) };
  });
}

/** Đếm theo trạng thái: {total, mandatory, MISSING, NONE, NOT_ISSUED, OK} */
export function coverageSummary(rows) {
  const out = { total: rows.length, mandatory: rows.filter((r) => r.mandatory).length, MISSING: 0, NONE: 0, NOT_ISSUED: 0, OK: 0 };
  rows.forEach((r) => { out[r.state]++; });
  return out;
}

/** Điều khoản ISO 9001 bắt buộc lưu hồ sơ mà chưa có biểu (ô "Điều khoản ISO 9001 bắt buộc chưa có biểu" của trang Tổng hợp) */
export function missingMandatory(items, clauses) {
  return coverageRows(items, clauses, 'ISO9001').filter((r) => r.state === 'MISSING').length;
}
