// "Chờ bạn xử lý" (trang chủ) và số đỏ trên nút Trang chủ: tính từ dữ liệu đã đồng bộ trên máy.
// Phiên 1b: phiên bản chờ tôi duyệt, chờ ban hành, bị trả lại, nháp của tôi; biểu ● chưa có tệp; tài liệu sắp/quá hạn rà soát.
// Phiên 1c thêm hồ sơ bị trả lại.
import { session } from './core.js';
import { recs, items, isSecretary, canApprove, versionEditable, reviewSoon, today } from './data.js';

/** {review, issue, returned, drafts, nofile, review_due, total} — mỗi phần là danh sách để màn Phiên bản lọc theo */
export async function pendingFor() {
  const uid = session.user && session.user.user_id;
  const sec = isSecretary();
  const list = await items();
  const byId = new Map(list.map((x) => [x.item_id, x]));
  const vers = (await recs('VERSION')).filter((v) => byId.has(v.item_id));
  const it = (v) => byId.get(v.item_id);
  const out = {
    review: vers.filter((v) => v.state === 'IN_REVIEW' && canApprove(it(v), v)),
    issue: sec ? vers.filter((v) => v.state === 'APPROVED') : [],
    returned: vers.filter((v) => v.state === 'DRAFT' && v.returned_at && v.author_id === uid),
    drafts: vers.filter((v) => v.state === 'DRAFT' && !v.returned_at && (v.author_id === uid || (sec && v.vtype === 'ATTACH')) && versionEditable(it(v), v)),
    nofile: sec ? list.filter((x) => x.status === 'ISSUED' && x.file_missing && !vers.some((v) => v.item_id === x.item_id && v.state === 'DRAFT')) : [],
    review_due: sec ? list.filter((x) => reviewSoon(x, today())) : []
  };
  out.total = out.review.length + out.issue.length + out.returned.length + (out.nofile.length ? 1 : 0) + (out.review_due.length ? 1 : 0);
  return out;
}
