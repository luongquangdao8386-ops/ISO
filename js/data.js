// Dữ liệu đã tải trên máy: đọc nhanh theo loại, tra theo ID, quyền phía client (chỉ để ẩn/hiện nút — máy chủ vẫn kiểm lại),
// phạm vi bộ phận, ngày theo máy chủ, tiện ích danh mục (tình trạng ○ ◐ ● ✕, nơi làm, kỳ hồ sơ)
import { session, todayVN, nameText } from './core.js';
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

export async function depts() {
  return (await recs('DEPT')).slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
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
