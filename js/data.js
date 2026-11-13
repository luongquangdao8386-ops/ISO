// Dữ liệu đã tải trên máy: đọc nhanh theo loại, tra theo ID, quyền phía client (chỉ để ẩn/hiện nút — máy chủ vẫn kiểm lại),
// phạm vi bộ phận, ngày theo máy chủ, tiện ích danh mục (tình trạng ○ ◐ ● ✕, nơi làm, kỳ hồ sơ)
import { session, todayVN, nameText, L, bi } from './core.js';
import { getRecords, getMeta, KEY, queueItems } from './sync.js';
import { itemRecordStatus, periodTypeFromDays, weekAgenda, mondayOf, parseSources } from './periods.js';

export { KEY };

let memo = {};
let bootMeta = null;
let usersMemo = null;

/** Xóa bộ nhớ tạm sau đồng bộ, đăng xuất */
export function invalidate() { memo = {}; bootMeta = null; usersMemo = null; }

export async function recs(type) {
  if (!memo[type]) memo[type] = await getRecords(type);
  return memo[type];
}

export async function byId(type, id) {
  if (!id) return null;
  const list = await recs(type);
  const k = KEY[type];
  return list.find((r) => r[k] === id) || null;
}

/** Bản đồ id → bản ghi */
export async function mapOf(type) {
  const k = KEY[type];
  const m = new Map();
  for (const r of await recs(type)) m.set(r[k], r);
  return m;
}

export async function boot() {
  if (!bootMeta) bootMeta = (await getMeta('bootstrap')) || {};
  return bootMeta;
}

/** Action được phép theo cấp (khối permissions của bootstrap; máy chủ vẫn kiểm lại) */
export function canSync(boot0, action) {
  const p = boot0 && boot0.permissions;
  return !!(p && Array.isArray(p.actions) && p.actions.indexOf(action) >= 0);
}
export async function can(action) { return canSync(await boot(), action); }

export function roleLevel() { return Number(session.user && session.user.role_level) || 0; }
export function isOwner() { return !!(session.user && session.user.is_system_owner && roleLevel() === 4); }
/** Thư ký ISO (cờ cộng thêm) hoặc Quản trị */
export function isSecretary() { return !!(session.user && (session.user.iso_secretary || roleLevel() === 4)); }

/** Danh bạ người dùng (mã, tên) để hiện người soạn, người phụ trách */
export async function users() {
  if (!usersMemo) {
    usersMemo = new Map();
    for (const u of (await getMeta('users')) || []) usersMemo.set(u.user_id, u);
  }
  return usersMemo;
}
export function userName(map, id) {
  const u = map && map.get(id);
  return u ? u.display_name || u.employee_code : (id === 'SYSTEM' ? 'Hệ thống' : '');
}

/** Bộ phận của người đang đăng nhập ([] = mọi bộ phận) */
export function myDepts() {
  const a = session.user && session.user.dept_codes;
  if (Array.isArray(a)) return a.filter(Boolean);
  return String(a || '').split(',').map((x) => x.trim()).filter(Boolean);
}
/** Thấy mọi bộ phận: Thư ký ISO, cấp 4, không giới hạn bộ phận */
export function seesAll() { return isSecretary() || !myDepts().length; }

/* ---------------- Ngày (giờ Việt Nam) ---------------- */

function offsetDays() { return Number(session.settings && session.settings.__today_offset_days) || 0; }
export function addDaysIso(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Hôm nay theo máy chủ (TEST_TODAY ở THỬ) nếu có, không thì theo đồng hồ máy */
export function today() {
  const off = offsetDays();
  const t = todayVN();
  return off ? addDaysIso(t, off) : t;
}
/** Thứ trong tuần: 1 = Thứ Hai … 7 = Chủ nhật */
export function weekday(iso) {
  const d = new Date(iso + 'T00:00:00Z').getUTCDay();
  return d === 0 ? 7 : d;
}
export function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/* ---------------- Danh mục ---------------- */

export const STATUS_SYMBOL = { NONE: '○', DRAFTING: '◐', ISSUED: '●', NA: '✕' };
export const STATUSES = ['NONE', 'DRAFTING', 'ISSUED', 'NA'];
export const KINDS = ['FORM', 'MANUAL', 'POLICY', 'PROCEDURE', 'WI', 'EXTERNAL'];
export const WHERES = ['MANUAL', 'ME', 'CS', 'ME_PART', 'CS_PART', 'CS_PROPOSED'];
export const PERIOD_TYPES = ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'HALF', 'YEAR', 'EVENT'];

/** Biểu chung (bộ phận ISO, sổ tay, chính sách): ai cũng xem */
export function isCommon(it) { return it && (it.dept_code === 'ISO' || it.kind === 'MANUAL' || it.kind === 'POLICY'); }

/** Biểu/tài liệu đang có trên máy (máy chủ đã lọc theo phạm vi bộ phận), sắp theo thứ tự danh mục */
export async function items() {
  if (!memo.__items) {
    memo.__items = (await recs('ITEM')).slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code).localeCompare(String(b.code)));
  }
  return memo.__items;
}

/* ---------------- Phạm vi áp dụng (2e, cài đặt scope_depts — máy chủ đã ẩn biểu ngoài phạm vi) ---------------- */

/** Mã bộ phận app quản lý ([] = toàn công ty) */
export function scopeDepts() {
  return String((session.settings || {}).scope_depts || '').split(',').map((x) => x.trim()).filter(Boolean);
}
export function inScopeDept(code) { const s = scopeDepts(); return !s.length || s.includes(code); }

/** Mọi bộ phận (Quản trị, nơi nhận bản in) */
export async function allDepts() {
  return (await recs('DEPT')).slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}
/** Bộ phận trong phạm vi áp dụng (lọc, chọn bộ phận của biểu) */
export async function depts() {
  return (await allDepts()).filter((d) => inScopeDept(d.dept_code));
}
/** Tên bộ phận của phạm vi: {vi: 'Cơ điện', zh: '机电'} (null khi toàn công ty) */
export async function scopeNames(codes = scopeDepts()) {
  if (!codes.length) return null;
  const m = new Map((await allDepts()).map((d) => [d.dept_code, d]));
  return { vi: codes.map((c) => (m.get(c) && m.get(c).name_vi) || c).join(', '), zh: codes.map((c) => (m.get(c) && (m.get(c).name_zh || m.get(c).name_vi)) || c).join('、') };
}
/** Nhãn có {D} = tên bộ phận: phần Việt điền tên Việt, phần Trung điền tên Trung */
export function scopeBi(key, names) {
  const p = L[key] || [key, ''];
  return bi([String(p[0]).split('{D}').join(names.vi), String(p[1] || '').split('{D}').join(names.zh)]);
}

/* ---------------- Kho tệp mẫu (2e) ---------------- */

/** Máy chủ đã lên bản 2e (có tpl.upload trong danh sách quyền của Thư ký ISO / cấp 4, hoặc đã có bảng TPL) */
export async function tplOn() { return (await can('tpl.upload')) || (await recs('TPL')).length > 0; }
/** Tệp mẫu đang dùng (mới nhất trước trong cùng bộ), sắp theo mã bộ */
export async function tplActive() {
  return (await recs('TPL')).filter((t) => t.state === 'ACTIVE' && !t.archived_at)
    .sort((a, b) => String(a.set_code || '~' + a.file_name).localeCompare(String(b.set_code || '~' + b.file_name)) || String(b.uploaded_at).localeCompare(String(a.uploaded_at)));
}
export function deptLabel(d, code) { return d ? nameText(d) : code || ''; }

/** Nhóm: tên Việt · 中文 (từ nhãn cột F nếu có) */
export function groupText(g, key) {
  if (!g) return key || '';
  const n = nameText(g);
  const num = String(g.group_key || '').split('-').pop();
  return n ? `${/^\d+$/.test(num) ? num + '. ' : ''}${n}` : (g.label || g.group_key);
}

/** Chỉ mục tìm kiếm của một biểu: mã, tên Việt, tên Trung, mục đích (chữ thường, bỏ dấu tiếng Việt) */
export function foldVi(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
export function itemHay(it) {
  return foldVi([it.code, it.name_vi, it.name_zh, it.purpose_vi, it.purpose_zh, it.iso9001, it.brc_topics].join(' '));
}

/** Tóm tắt danh mục: tổng biểu, số ● ✕, % ban hành = ● / (tổng − ✕) như trang Tổng hợp của file Excel */
export function catalogSummary(list) {
  const total = list.length;
  const issued = list.filter((x) => x.status === 'ISSUED').length;
  const na = list.filter((x) => x.status === 'NA').length;
  const base = total - na;
  return { total, issued, na, drafting: list.filter((x) => x.status === 'DRAFTING').length, none: list.filter((x) => x.status === 'NONE').length,
    pct: base ? Math.round((issued / base) * 1000) / 10 : 0,
    p1_open: list.filter((x) => Number(x.priority) === 1 && x.status !== 'ISSUED' && x.status !== 'NA').length,
    from_app: list.filter((x) => x.where === 'ME' || x.where === 'CS').length };
}

/* ---------------- Phiên bản (phiên 1b) — quyền phía client chỉ để ẩn/hiện nút, máy chủ kiểm lại ---------------- */

export const VERSION_STATES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ISSUED', 'SUPERSEDED', 'CANCELLED'];
export const VERSION_OPEN = new Set(['DRAFT', 'IN_REVIEW', 'APPROVED']);

function myId() { return session.user && session.user.user_id; }
/** Ghi được trong bộ phận này (cấp 1–3: chỉ bộ phận mình; Thư ký ISO, cấp 4, không giới hạn: mọi bộ phận) */
export function deptWritable(dept) { return seesAll() || myDepts().includes(dept); }

export function canCreateVersion(it, vtype = 'REVISION') {
  if (!it || it.status === 'NA') return false;
  if (vtype === 'ATTACH') return isSecretary() && it.status === 'ISSUED' && !it.current_version_id;
  return isSecretary() || (roleLevel() >= 2 && deptWritable(it.dept_code));
}
export function versionEditable(it, v) {
  if (isSecretary()) return true;
  if (!it || !deptWritable(it.dept_code)) return false;
  if (v && v.author_id === myId()) return roleLevel() >= 2;
  return roleLevel() >= 3;
}
export function canApprove(it, v) {
  const lvl = roleLevel();
  if (lvl >= 4) return v.author_id !== myId() || (session.settings || {}).admin_self_approval !== false;
  if (v.author_id === myId() || !it || it.level === 'COMPANY') return false;
  return lvl === 3 && deptWritable(it.dept_code);
}
export function canReturnVersion(it, v) {
  if (v.state === 'APPROVED' && isSecretary()) return true;
  return canApprove(it, v);
}
export function canCancelVersion(it, v) {
  if (v.state === 'APPROVED') return isSecretary();
  return versionEditable(it, v);
}

/** Phiên bản theo biểu (mới nhất trước) */
export async function versionsOf(itemId) {
  return (await recs('VERSION')).filter((v) => v.item_id === itemId)
    .sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0) || String(b.created_at).localeCompare(String(a.created_at)));
}

/** Biểu đang hiệu lực mà hạn rà soát trong review_warn_days ngày tới hoặc đã qua */
export function reviewSoon(it, t = today()) {
  if (!it || it.status !== 'ISSUED' || !it.review_due) return false;
  const warn = Number((session.settings || {}).review_warn_days || 30);
  return daysBetween(t, it.review_due) <= warn;
}

/* ---------------- Hồ sơ (phiên 1c) — quyền phía client chỉ để ẩn/hiện nút, máy chủ kiểm lại ---------------- */

/** Máy chủ đã lên bản 1c (có record.submit trong danh sách quyền) — chưa có thì app ẩn phần nộp hồ sơ */
export async function recordsOn() { return can('record.submit'); }
/** Xem hồ sơ, bảng kỳ: cấp 2+ hoặc Thư ký ISO (cấp 1 Tra cứu không xem tổng hợp) */
export function canSeeRecords() { return isSecretary() || roleLevel() >= 2; }
/** Nộp hồ sơ cho biểu: cấp 2+ trong bộ phận, Thư ký ISO */
export function canSubmitRecord(it) { return !!it && (isSecretary() || (roleLevel() >= 2 && deptWritable(it.dept_code))); }
/** Trả lại hồ sơ nộp sai: trưởng bộ phận (cấp 3 trong bộ phận), Thư ký ISO */
export function canReturnRecord(it) { return !!it && (isSecretary() || (roleLevel() >= 3 && deptWritable(it.dept_code))); }
/** Gắn thêm tệp: người nộp, trưởng bộ phận, Thư ký ISO */
export function canRecordFiles(it, r) {
  if (isSecretary()) return true;
  if (!it || !deptWritable(it.dept_code)) return false;
  return r.submitted_by === myId() ? roleLevel() >= 2 : roleLevel() >= 3;
}
/** Biểu nhận hồ sơ (như máy chủ): '' được nộp · ITEM_NO_RECORD (○ ✕) · RECORD_FROM_APP (in từ M&E / Checksheet) */
export function recordCheck(it) {
  if (!it || it.status === 'NA' || it.status === 'NONE' || !it.status) return 'ITEM_NO_RECORD';
  if (it.where === 'ME' || it.where === 'CS') return 'RECORD_FROM_APP';
  return '';
}
export function periodTypeOf(it) {
  return PERIOD_TYPES.includes(it && it.period_type) ? it.period_type : periodTypeFromDays(it && it.period_days);
}

/** Hồ sơ của tôi đang chờ gửi trong hàng chờ (record.submit chưa lên máy chủ), theo item_id */
export async function queuedRecords() {
  const uid = myId();
  const out = new Map();
  for (const o of await queueItems().catch(() => [])) {
    if (o.action !== 'record.submit' || o.user_id !== uid || o.dataset_epoch !== session.epoch || o.state === 'REJECTED') continue;
    const p = o.payload || {};
    const list = out.get(p.item_id) || [];
    list.push({ ...p, operation_id: o.operation_id, op_state: o.state, local_created_at: o.local_created_at, queued: true });
    out.set(p.item_id, list);
  }
  return out;
}

/** Hồ sơ theo biểu (mới nhất trước) */
export async function recordsOf(itemId) {
  return (await recs('RECORD')).filter((r) => r.item_id === itemId)
    .sort((a, b) => String(b.period_to).localeCompare(String(a.period_to)) || String(b.submitted_at).localeCompare(String(a.submitted_at)));
}

/**
 * Tình trạng hồ sơ 12 kỳ của các biểu (giống record.status của máy chủ — js/periods.js), cộng hồ sơ đang chờ gửi trên máy.
 * Trả Map item_id → kết quả itemRecordStatus.
 */
export async function recordStatusMap(list) {
  if (!memo.__rs) {
    const { byItem, queued, evByItem, opts } = await recordInputs();
    const m = new Map();
    for (const it of await items()) m.set(it.item_id, itemRecordStatus(it, byItem.get(it.item_id) || [], { ...opts, pending: queued.get(it.item_id) || [], evidence: evByItem.get(it.item_id) || [] }));
    memo.__rs = m;
  }
  if (!list) return memo.__rs;
  const out = new Map();
  for (const it of list) if (memo.__rs.has(it.item_id)) out.set(it.item_id, memo.__rs.get(it.item_id));
  return out;
}
/** Xóa bộ nhớ tạm tình trạng hồ sơ (vừa lưu hồ sơ vào hàng chờ) */
export function invalidateRecordStatus() { delete memo.__rs; delete memo.__ri; }

/**
 * Đầu vào tính tình trạng hồ sơ (bảng kỳ, lịch tuần): hồ sơ SUBMITTED theo biểu, hồ sơ chờ gửi, ngày có hồ sơ từ M&E / Checksheet
 * (EVIDENCE, Đợt 2) theo biểu, {today, grace, startSetting, sources}.
 */
async function recordInputs() {
  if (!memo.__ri) {
    const st = session.settings || {};
    const group = (list) => {
      const m = new Map();
      for (const r of list) { const a = m.get(r.item_id) || []; a.push(r); m.set(r.item_id, a); }
      return m;
    };
    const byItem = group((await recs('RECORD')).filter((r) => r.status === 'SUBMITTED'));
    const evByItem = group((await recs('EVIDENCE')).filter((e) => !e.archived_at && Number(e.count) > 0));
    memo.__ri = { byItem, evByItem, queued: await queuedRecords(),
      opts: { today: today(), grace: Number(st.record_grace_days ?? 3), startSetting: st.records_start_date || '', sources: st.evidence_sources || '' } };
  }
  return memo.__ri;
}

/** App đã nối để lấy ngày có hồ sơ: {ME: true, CS: true} (cài đặt evidence_sources do máy chủ đặt ở màn Kết nối) */
export function evidenceSources() { return parseSources((session.settings || {}).evidence_sources || ''); }

/** Ngày có hồ sơ từ M&E / Checksheet của một biểu (mới nhất trước) */
export async function evidenceOf(itemId) {
  return (await recs('EVIDENCE')).filter((e) => e.item_id === itemId && !e.archived_at && Number(e.count) > 0)
    .sort((a, b) => String(b.last_date).localeCompare(String(a.last_date)));
}

/** Lịch tuần hồ sơ đến hạn (trang chủ): tuần lệch `off` tuần so với tuần hiện tại (js/periods.js weekAgenda) */
export async function recordWeek(off = 0) {
  const { byItem, queued, evByItem, opts } = await recordInputs();
  const entries = (await items()).map((it) => ({ it, recs: byItem.get(it.item_id) || [], pending: queued.get(it.item_id) || [], evidence: evByItem.get(it.item_id) || [] }));
  return weekAgenda(entries, { ...opts, mon: addDaysIso(mondayOf(opts.today), 7 * off) });
}

/* ---------------- Kiểm soát tài liệu (phiên 2d) — quyền phía client chỉ để ẩn/hiện nút, máy chủ kiểm lại ---------------- */

/** Máy chủ đã lên bản 2d (có docreq.save trong danh sách quyền) — chưa có thì app ẩn phần đề nghị, phân phối */
export async function docControlOn() { return can('docreq.save'); }
export const DOCREQ_TYPES = ['NEW', 'REVISE', 'CANCEL'];
/** Đề nghị sửa / hủy: cấp 2+ / Thư ký ISO, tài liệu xem được (đề nghị là ý kiến; chủ tài liệu xem xét) */
export function canRequest(it) { return !!it && it.status !== 'NA' && (isSecretary() || roleLevel() >= 2); }
/** Xem xét phiếu (chấp thuận / không chấp thuận): như duyệt phiên bản, người đề nghị không tự xem xét (cấp 4 được) */
export function canDecideReq(r) {
  const lvl = roleLevel();
  if (!r || r.state !== 'SUBMITTED') return false;
  if (lvl >= 4) return r.submitted_by !== myId() || (session.settings || {}).admin_self_approval !== false;
  if (r.submitted_by === myId() || r.level === 'COMPANY') return false;
  return lvl === 3 && deptWritable(r.dept_code);
}
export function canEditReq(r) { return !!r && r.state === 'SUBMITTED' && (r.submitted_by === myId() || isSecretary()); }
export function canCancelReq(r) { return !!r && (r.state === 'APPROVED' ? isSecretary() : canEditReq(r)); }

/** Phiếu đề nghị theo tài liệu (mới nhất trước) */
export async function requestsOf(itemId) {
  return (await recs('DOCREQ')).filter((r) => r.item_id === itemId && !r.archived_at)
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
}

/** Lần ban hành hiện hành (● nhập từ Excel không ghi lần = 01) */
export function curRevOf(it) { return it ? String(it.current_rev || (it.status === 'ISSUED' ? '01' : '')) : ''; }
export function normRev(r) { const s = String(r || '').replace(/^0+(?=\d)/, ''); return s.length < 2 ? ('0' + s).slice(-2) : s; }
/** Dòng phân phối đang dùng mà tài liệu đã ban hành lần khác / ngừng dùng → cần thu hồi (như distDue_ của máy chủ) */
export function distDue(d, it) {
  if (!d || d.state !== 'ACTIVE' || !it) return false;
  return it.status === 'NA' || normRev(d.rev) !== normRev(curRevOf(it));
}
/** Ngày bắt đầu phải thu hồi: ngày ban hành lần hiện hành (✕: ngày đặt ✕) */
export function distDueSince(it) { return !it ? '' : it.status === 'NA' ? String(it.updated_at || '').slice(0, 10) : String(it.issued_at || ''); }
/** Cần thu hồi quá dist_recall_days ngày */
export function distOverdue(d, it, t = today()) {
  if (!distDue(d, it)) return false;
  const since = distDueSince(it);
  return !!since && addDaysIso(since, Number((session.settings || {}).dist_recall_days || 7)) < t;
}
/** Trạng thái hiển thị: ACTIVE · DUE · RECALLED · VOID */
export function distState(d, it) { return d.state === 'ACTIVE' && distDue(d, it) ? 'DUE' : d.state; }
/** Sổ phân phối theo tài liệu (bỏ dòng ghi nhầm) */
export async function distsOf(itemId) {
  return (await recs('DIST')).filter((d) => d.item_id === itemId && d.state !== 'VOID' && !d.archived_at)
    .sort((a, b) => String(b.dist_date).localeCompare(String(a.dist_date)) || String(a.dept_code).localeCompare(String(b.dept_code)));
}

/* ---------------- Khắc phục (phiên 3a) — quyền phía client chỉ để ẩn/hiện nút, máy chủ kiểm lại (32_capa.js) ---------------- */

/** Máy chủ đã lên bản 3a (có capa.save trong danh sách quyền) — chưa có thì màn Khắc phục báo cần cập nhật máy chủ */
export async function capaOn() { return can('capa.save'); }
/** Máy chủ đã lên bản 3b (khiếu nại 8D, SCAR: có capa.reply) — chưa có thì ẩn nút Tiếp nhận khiếu nại / Lập SCAR */
export async function complaintOn() { return can('capa.reply'); }
/** Nguồn của phiếu khắc phục nội bộ (3a); khiếu nại khách hàng (8D) và SCAR nhà cung cấp là phiếu có đối tác (3b) */
export const CAPA_SOURCES = ['EQUIPMENT', 'INSPECTION', 'AUDIT', 'SAFETY', 'PROCESS', 'OTHER'];
export const CAPA_PARTY_SOURCES = ['COMPLAINT', 'SUPPLIER'];
export const CAPA_SEVERITIES = ['MINOR', 'MAJOR', 'CRITICAL'];
/** Phiếu có đối tác bên ngoài (khiếu nại khách hàng / SCAR nhà cung cấp) */
export function capaIsParty(c) { return !!c && CAPA_PARTY_SOURCES.includes(c.source); }
/** Khiếu nại / SCAR chưa phản hồi mà quá hạn phản hồi (như máy chủ capaReplyLate_) */
export function capaReplyLate(c, t = today()) {
  return capaIsParty(c) && (c.state === 'OPEN' || c.state === 'VERIFYING') && !c.reply_date && !!c.reply_due && String(c.reply_due) < t;
}
/** Mẫu in mặc định: khiếu nại → báo cáo 8D, SCAR → SCAR, còn lại → phiếu khắc phục */
export function capaDefaultForm(c) { return c && c.source === 'COMPLAINT' ? 'D8' : c && c.source === 'SUPPLIER' ? 'SCAR' : 'CAR'; }
/** Mẫu in dùng được cho phiếu (theo thứ tự hiện nút) */
export function capaForms(c) { return c && c.source === 'COMPLAINT' ? ['RECEIPT', 'D8', 'CAR'] : c && c.source === 'SUPPLIER' ? ['SCAR', 'CAR'] : ['CAR']; }
/** Cài đặt mã biểu của mẫu in */
export const CAPA_FORM_SETTING = { CAR: 'capa_form_code', RECEIPT: 'complaint_form_code', D8: 'd8_form_code', SCAR: 'scar_form_code' };
/** Lập phiếu cho bộ phận: cấp 2+ trong bộ phận, Thư ký ISO */
export function canCreateCapa(dept) { return inScopeDept(dept) && (isSecretary() || (roleLevel() >= 2 && deptWritable(dept))); }
/** Sửa phiếu, hành động, gửi kiểm tra hiệu lực: Thư ký ISO, trưởng bộ phận, người phụ trách phiếu, người lập */
export function canEditCapa(c) {
  if (!c || !inScopeDept(c.dept_code)) return false;
  if (isSecretary()) return true;
  if (roleLevel() >= 3 && deptWritable(c.dept_code)) return true;
  return roleLevel() >= 2 && (c.owner_user_id === myId() || c.created_by === myId());
}
/** Báo xong hành động: người sửa được phiếu, người phụ trách hành động */
export function canDoCapaAction(c, a) { return canEditCapa(c) || (roleLevel() >= 2 && !!a.owner_user_id && a.owner_user_id === myId()); }
/** Kiểm tra hiệu lực: Thư ký ISO, trưởng bộ phận; không phải người phụ trách phiếu (cấp 4 được khi admin_self_approval) */
export function canVerifyCapa(c) {
  if (!c || c.state !== 'VERIFYING' || !inScopeDept(c.dept_code)) return false;
  const lvl = roleLevel();
  if (lvl >= 4) return c.owner_user_id !== myId() || (session.settings || {}).admin_self_approval !== false;
  if (c.owner_user_id === myId()) return false;
  return isSecretary() || (lvl === 3 && deptWritable(c.dept_code));
}
/** Hủy phiếu: Thư ký ISO, người lập */
export function canCancelCapa(c) { return !!c && inScopeDept(c.dept_code) && (isSecretary() || (roleLevel() >= 2 && c.created_by === myId())); }
/** Gắn ảnh / tệp: người sửa được phiếu, người kiểm tra hiệu lực, người phụ trách một hành động */
export function canCapaFiles(c, acts) {
  if (!c || (c.state !== 'OPEN' && c.state !== 'VERIFYING')) return false;
  return canEditCapa(c) || canVerifyCapa(c) || (roleLevel() >= 2 && acts.some((a) => a.state !== 'CANCELLED' && a.owner_user_id === myId()));
}
/** Phiếu quá hạn (như máy chủ): đang xử lý mà quá hạn phiếu hoặc có hành động đang mở quá hạn; chờ kiểm tra hiệu lực mà quá hạn kiểm tra;
 *  khiếu nại / SCAR chưa phản hồi mà quá hạn phản hồi */
export function capaOverdue(c, acts, t = today()) {
  if (!c) return false;
  if (capaReplyLate(c, t)) return true;
  if (c.state === 'OPEN') return (!!c.due_date && c.due_date < t) || (acts || []).some((a) => a.state === 'OPEN' && a.due_date && a.due_date < t);
  return c.state === 'VERIFYING' && !!c.verify_due && c.verify_due < t;
}
/** Hành động của phiếu theo thứ tự */
export async function capaActsOf(capaId) {
  return (await recs('CAPA_ACT')).filter((a) => a.capa_id === capaId && !a.archived_at).sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

/* ---------------- Sản phẩm không phù hợp (phiên 3c) — quyền phía client chỉ để ẩn/hiện nút, máy chủ kiểm lại (34_ncr.js) ---------------- */

/** Máy chủ đã lên bản 3c (có ncr.save trong danh sách quyền) — chưa có thì màn Sản phẩm không phù hợp báo cần cập nhật máy chủ */
export async function ncrOn() { return can('ncr.save'); }
/** Nơi phát hiện */
export const NCR_STAGES = ['INCOMING', 'PROCESS', 'FINAL', 'STORAGE', 'CUSTOMER', 'OTHER'];
/** Cách xử lý; nhân nhượng / hủy bỏ chỉ cấp 4 quyết định; làm lại / sửa chữa / hạ cấp phải kiểm tra lại Đạt mới đóng */
export const NCR_DISPOSITIONS = ['REWORK', 'REPAIR', 'REGRADE', 'CONCESSION', 'RETURN', 'SCRAP'];
export const NCR_TOP_DISPOSITIONS = ['CONCESSION', 'SCRAP'];
export const NCR_RECHECK_DISPOSITIONS = ['REWORK', 'REPAIR', 'REGRADE'];
/** Lập phiếu cho bộ phận: cấp 2+ trong bộ phận, Thư ký ISO */
export function canCreateNcr(dept) { return canCreateCapa(dept); }
/** Sửa phiếu (chờ quyết định / đang xử lý): Thư ký ISO, trưởng bộ phận, người phụ trách, người lập */
export function canEditNcr(n) {
  if (!n || !inScopeDept(n.dept_code)) return false;
  if (isSecretary()) return true;
  if (roleLevel() >= 3 && deptWritable(n.dept_code)) return true;
  return roleLevel() >= 2 && (n.owner_user_id === myId() || n.created_by === myId());
}
/** Quyết định xử lý: trưởng bộ phận (cấp 3 trong bộ phận), Quản trị (cấp 4); người lập không tự quyết định (cấp 4 được khi admin_self_approval) */
export function canDecideNcr(n) {
  if (!n || !inScopeDept(n.dept_code)) return false;
  const lvl = roleLevel();
  if (lvl >= 4) return n.created_by !== myId() || (session.settings || {}).admin_self_approval !== false;
  return lvl === 3 && deptWritable(n.dept_code) && n.created_by !== myId();
}
/** Được chọn nhân nhượng / hủy bỏ */
export function canDecideTop() { return roleLevel() >= 4; }
/** Xác nhận xong xử lý (đóng): người sửa được phiếu, người quyết định được */
export function canCloseNcr(n) { return canEditNcr(n) || canDecideNcr(n); }
/** Hủy phiếu: Thư ký ISO, người lập */
export function canCancelNcr(n) { return !!n && inScopeDept(n.dept_code) && (isSecretary() || (roleLevel() >= 2 && n.created_by === myId())); }
/** Gắn ảnh / tệp: phiếu chờ quyết định / đang xử lý; người sửa được phiếu, người quyết định */
export function canNcrFiles(n) { return !!n && (n.state === 'OPEN' || n.state === 'DECIDED') && (canEditNcr(n) || canDecideNcr(n)); }
/** Phiếu quá hạn (như máy chủ ncrOverdue_): chờ quyết định quá hạn quyết định; đang xử lý quá hạn thực hiện */
export function ncrOverdue(n, t = today()) {
  if (!n) return false;
  if (n.state === 'OPEN') return !!n.decide_due && String(n.decide_due) < t;
  if (n.state === 'DECIDED') return !!n.exec_due && String(n.exec_due) < t;
  return false;
}
/** Cần kiểm tra lại Đạt trước khi đóng (có làm lại / sửa chữa / hạ cấp) */
export function ncrNeedsRecheck(n) { return (n && n.decision_json || []).some((l) => NCR_RECHECK_DISPOSITIONS.includes(l.d)); }

/* ---------------- Đánh giá nội bộ (phiên 4a) — quyền phía client chỉ để ẩn/hiện nút, máy chủ kiểm lại (35_iaudit.js) ---------------- */

/** Máy chủ đã lên bản 4a (có iaudit.save trong danh sách quyền) — chưa có thì màn Đánh giá nội bộ báo cần cập nhật máy chủ */
export async function auditOn() { return can('iaudit.save'); }
export const AUDIT_STDS = ['ISO9001', 'BRC'];
export const AUDIT_RESULTS = ['C', 'NC', 'OBS', 'NA'];
/** Đánh giá viên (cờ cộng thêm ở Quản trị → Người dùng) */
export function isAuditor() { return !!(session.user && session.user.auditor); }
/** Xem đánh giá nội bộ: cấp 2+, Thư ký ISO, Đánh giá viên */
export function canSeeAudits() { return isSecretary() || roleLevel() >= 2 || isAuditor(); }
/** Chuẩn của chương trình (ISO9001, BRC) */
export function programStds(pg) {
  const s = String((pg && pg.stds) || '').split(',').map((x) => x.trim()).filter((x) => AUDIT_STDS.includes(x));
  return s.length ? AUDIT_STDS.filter((x) => s.includes(x)) : AUDIT_STDS.slice();
}
export function auditTeam(a) { return Array.isArray(a && a.team_json) ? a.team_json : []; }
export function auditLead(a) { return auditTeam(a).find((t) => t && t.r === 'L') || null; }
export function isAuditMember(a) { const id = myId(); return !!id && auditTeam(a).some((t) => t && t.u === id); }
/** Lập kế hoạch đợt, checklist, chốt kế hoạch: Thư ký ISO, trưởng đoàn */
export function canPlanAudit(a) { return isSecretary() || (!!a && !!a.lead_user_id && a.lead_user_id === myId()); }
/** Ghi kết quả checklist, bắt đầu đánh giá: Thư ký ISO, trưởng đoàn, người trong đoàn */
export function canRecordAudit(a) { return canPlanAudit(a) || isAuditMember(a); }
/** Thêm / sửa câu hỏi: chưa đánh giá — người lập kế hoạch; đang đánh giá — cả người trong đoàn */
export function canEditChecks(a) {
  if (!a) return false;
  if (a.state === 'PLANNED' || a.state === 'READY') return canPlanAudit(a);
  return a.state === 'IN_PROGRESS' && canRecordAudit(a);
}
/** Duyệt / trả lại chương trình: Quản trị; người gửi duyệt không tự duyệt (được khi admin_self_approval) */
export function canApproveProgram(pg) {
  return roleLevel() >= 4 && !!pg && (pg.submitted_by !== myId() || (session.settings || {}).admin_self_approval !== false);
}
/** Đợt trễ kế hoạch (như máy chủ auditLate_): chưa đánh giá mà ngày đánh giá đã qua, hoặc chưa có ngày mà tháng dự kiến đã qua */
export function auditLate(a, t = today()) {
  if (!a || (a.state !== 'PLANNED' && a.state !== 'READY')) return false;
  if (a.audit_date) return String(a.audit_date) < t;
  return !!a.plan_month && String(a.plan_month) < t.slice(0, 7);
}
/** Đợt của chương trình (bỏ đợt đã bỏ khỏi nháp), theo tháng rồi mã */
export async function auditsOf(programId) {
  return (await recs('AUDIT')).filter((a) => a.program_id === programId && !a.archived_at)
    .sort((a, b) => String(a.plan_month).localeCompare(String(b.plan_month)) || String(a.code || '~').localeCompare(String(b.code || '~')) || String(a.created_at).localeCompare(String(b.created_at)));
}
/** Câu hỏi checklist của đợt theo thứ tự */
export async function checksOf(auditId) {
  return (await recs('AUD_CHK')).filter((c) => c.audit_id === auditId && !c.archived_at).sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

/* ---------------- Phát hiện đánh giá, báo cáo, đóng đợt (phiên 4b) — như máy chủ 36_finding.js ---------------- */

/** Máy chủ đã lên bản 4b (có iaudit.finding.save trong danh sách quyền) */
export async function findingOn() { return can('iaudit.finding.save'); }
/** MAJOR không phù hợp lớn · MINOR không phù hợp nhỏ (bắt buộc phiếu khắc phục) · OBS cần cải tiến */
export const AUDIT_FINDING_TYPES = ['MAJOR', 'MINOR', 'OBS'];
export const AUDIT_FINDING_NC = ['MAJOR', 'MINOR'];
export function findingIsNc(f) { return !!f && AUDIT_FINDING_NC.includes(f.ftype); }
/** Kết quả câu checklist hợp với loại phát hiện: Không phù hợp → lớn / nhỏ; Cần cải tiến → cần cải tiến */
export function findingTypeFits(result, ftype) { return result === 'NC' ? AUDIT_FINDING_NC.includes(ftype) : result === 'OBS' ? ftype === 'OBS' : false; }
/** Phát hiện của đợt theo số thứ tự */
export async function findingsOf(auditId) {
  return (await recs('AUD_FND')).filter((f) => f.audit_id === auditId && !f.archived_at).sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}
/** Phiếu khắc phục còn hiệu lực của phát hiện (capaMap: Map capa_id → phiếu); null khi chưa có / đã hủy / không xem được */
export function findingCapa(f, capaMap) {
  const c = f && f.capa_id && capaMap ? capaMap.get(f.capa_id) : null;
  return c && !c.archived_at && c.state !== 'CANCELLED' ? c : null;
}
/** Gửi báo cáo đánh giá, rút báo cáo: Thư ký ISO, trưởng đoàn */
export function canReportAudit(a) { return canPlanAudit(a); }
/** Đóng đợt: Thư ký ISO */
export function canCloseAudit() { return isSecretary(); }
/** Điều kiện gửi báo cáo (như máy chủ auditReportErrors_): câu chưa ghi kết quả; câu Không phù hợp / Cần cải tiến chưa có phát hiện đúng loại */
export function auditReportGaps(checks, findings) {
  const byCheck = new Map(findings.filter((f) => f.check_id).map((f) => [f.check_id, f]));
  return {
    unrecorded: checks.filter((c) => !c.result),
    missing: checks.filter((c) => (c.result === 'NC' || c.result === 'OBS') && !(byCheck.has(c.check_id) && findingTypeFits(c.result, byCheck.get(c.check_id).ftype)))
  };
}
/** Điều kiện đóng đợt (như máy chủ auditCloseErrors_): phát hiện không phù hợp chưa có phiếu; phiếu khắc phục chưa đóng
 *  (Thư ký ISO xem được mọi phiếu nên tính đúng; người khác chỉ để hiện gợi ý) */
export function auditCloseGaps(findings, capaMap) {
  const noCapa = [], open = [];
  for (const f of findings) {
    const c = findingCapa(f, capaMap);
    if (!c) { if (findingIsNc(f)) noCapa.push(f); continue; }
    if (c.state !== 'CLOSED') open.push(f);
  }
  return { noCapa, open };
}

/* ---------------- Xem xét lãnh đạo (phiên 4c) — như máy chủ 37_mreview.js ---------------- */

/** Máy chủ đã lên bản 4c (có mreview.stats trong danh sách quyền) */
export async function mreviewOn() { return can('mreview.stats'); }
/** Đầu vào theo ISO 9001 điều 9.3.2 (a, b, c1…c7, d, e, f) */
export const MR_INPUTS = ['prev', 'context', 'satisfaction', 'objectives', 'process', 'capa', 'monitoring', 'audit', 'supplier', 'resources', 'risks', 'improve'];
/** Mục chỉ ghi tay (không có số liệu tự gom) */
export const MR_MANUAL = ['context', 'objectives', 'resources', 'risks', 'improve'];
export const MR_DECISION_KINDS = ['IMPROVE', 'CHANGE', 'RESOURCE'];
export function mrDecisions(r) { return Array.isArray(r && r.decisions_json) ? r.decisions_json : []; }
/** Xem cuộc xem xét: Thư ký ISO, cấp 3+, người phụ trách một quyết định */
export function canSeeMreview(r) {
  if (isSecretary() || roleLevel() >= 3) return true;
  const id = myId();
  return !!r && !!id && mrDecisions(r).some((d) => d.owner_user_id === id);
}
/** Lập / sửa / ghi Đã họp / hủy: Thư ký ISO, cấp 4 */
export function canEditMreview() { return isSecretary(); }
/** Báo xong / mở lại quyết định: Thư ký ISO, người phụ trách */
export function canDoDecision(d) { return isSecretary() || (!!d && !!d.owner_user_id && d.owner_user_id === myId() && d.state !== 'CANCELLED'); }
export function mrDecisionLate(d, t = today()) { return !!d && (d.state || 'OPEN') === 'OPEN' && !!d.due && String(d.due) < t; }
