// Dữ liệu đã tải trên máy: đọc nhanh theo loại, tra theo ID, quyền phía client (chỉ để ẩn/hiện nút — máy chủ vẫn kiểm lại),
// phạm vi bộ phận, ngày theo máy chủ, tiện ích danh mục (tình trạng ○ ◐ ● ✕, nơi làm, kỳ hồ sơ)
import { session, todayVN, nameText } from './core.js';
import { getRecords, getMeta, KEY } from './sync.js';

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
