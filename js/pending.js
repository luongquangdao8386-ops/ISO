// "Chờ bạn xử lý" (trang chủ) và số đỏ trên nút Trang chủ: tính từ dữ liệu đã đồng bộ trên máy.
// Phiên 1b: phiên bản chờ tôi duyệt, chờ ban hành, bị trả lại, nháp của tôi; biểu ● chưa có tệp; tài liệu sắp/quá hạn rà soát.
// Phiên 1c: hồ sơ của tôi bị trả lại (chưa nộp lại kỳ đó, trong 60 ngày).
// Phiên 1d: biểu có kỳ gần nhất quá hạn hồ sơ mà tôi nộp được; tài liệu tôi phụ trách sắp/quá hạn rà soát; thao tác gửi không được.
import { session } from './core.js';
import { recs, items, isSecretary, canApprove, versionEditable, reviewSoon, today, addDaysIso, canSeeRecords, canSubmitRecord, recordCheck,
  recordStatusMap, recordsOn } from './data.js';
import { queueItems } from './sync.js';
import { covers } from './periods.js';

/** Hồ sơ của tôi bị trả lại mà chưa có hồ sơ nộp sau phủ cùng khoảng ngày (nộp lại rồi thì thôi nhắc); trả lại quá 60 ngày thì thôi */
function returnedRecords(all, uid, byId) {
  const cut = addDaysIso(today(), -60);
  return all.filter((r) => r.status === 'RETURNED' && r.submitted_by === uid && byId.has(r.item_id) && String(r.returned_at).slice(0, 10) >= cut &&
    !all.some((x) => x.item_id === r.item_id && x.status === 'SUBMITTED' && String(x.created_at) > String(r.created_at) && covers(x, { from: r.period_from, to: r.period_to })));
}

/**
 * {review, issue, returned, drafts, nofile, review_due, rec_returned, rec_late, send_problems, total} — mỗi phần là danh sách để màn
 * Phiên bản / Hồ sơ / Danh mục lọc theo. total (số đỏ trên nút Trang chủ): mỗi việc cụ thể đếm 1; "biểu ● chưa có tệp",
 * "sắp/quá hạn rà soát", "hồ sơ quá hạn" mỗi nhóm đếm 1.
 */
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
    review_due: list.filter((x) => (sec || (uid && x.owner_user_id === uid)) && reviewSoon(x, today()))
  };
  out.rec_returned = returnedRecords(await recs('RECORD'), uid, byId);
  out.rec_late = [];
  if (canSeeRecords() && await recordsOn()) {
    const sm = await recordStatusMap();
    out.rec_late = list.filter((x) => sm.get(x.item_id) && sm.get(x.item_id).overdue && canSubmitRecord(x) && !recordCheck(x));
  }
  out.send_problems = (await queueItems().catch(() => [])).filter((o) => o.user_id === uid && o.dataset_epoch === session.epoch && (o.state === 'CONFLICT' || o.state === 'REJECTED'));
  out.total = out.review.length + out.issue.length + out.returned.length + out.rec_returned.length + out.send_problems.length +
    (out.nofile.length ? 1 : 0) + (out.review_due.length ? 1 : 0) + (out.rec_late.length ? 1 : 0);
  return out;
}
