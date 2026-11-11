// "Chờ bạn xử lý" (trang chủ) và số đỏ trên nút Trang chủ: tính từ dữ liệu đã đồng bộ trên máy.
// Phiên 1b: phiên bản chờ tôi duyệt, chờ ban hành, bị trả lại, nháp của tôi; biểu ● chưa có tệp; tài liệu sắp/quá hạn rà soát.
// Phiên 1c: hồ sơ của tôi bị trả lại (chưa nộp lại kỳ đó, trong 60 ngày).
import { session } from './core.js';
import { recs, items, isSecretary, canApprove, versionEditable, reviewSoon, today, addDaysIso } from './data.js';
import { covers } from './periods.js';

/** Hồ sơ của tôi bị trả lại mà chưa có hồ sơ nộp sau phủ cùng khoảng ngày (nộp lại rồi thì thôi nhắc); trả lại quá 60 ngày thì thôi */
function returnedRecords(all, uid, byId) {
  const cut = addDaysIso(today(), -60);
  return all.filter((r) => r.status === 'RETURNED' && r.submitted_by === uid && byId.has(r.item_id) && String(r.returned_at).slice(0, 10) >= cut &&
    !all.some((x) => x.item_id === r.item_id && x.status === 'SUBMITTED' && String(x.created_at) > String(r.created_at) && covers(x, { from: r.period_from, to: r.period_to })));
}

/** {review, issue, returned, drafts, nofile, review_due, rec_returned, total} — mỗi phần là danh sách để màn Phiên bản / Hồ sơ lọc theo */
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
  out.rec_returned = returnedRecords(await recs('RECORD'), uid, byId);
  out.total = out.review.length + out.issue.length + out.returned.length + out.rec_returned.length + (out.nofile.length ? 1 : 0) + (out.review_due.length ? 1 : 0);
  return out;
}
