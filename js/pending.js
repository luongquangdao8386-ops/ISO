// "Chờ bạn xử lý" (trang chủ) và số đỏ trên nút Trang chủ: tính từ dữ liệu đã đồng bộ trên máy.
// Phiên 1b: phiên bản chờ tôi duyệt, chờ ban hành, bị trả lại, nháp của tôi; biểu ● chưa có tệp; tài liệu sắp/quá hạn rà soát.
// Phiên 1c: hồ sơ của tôi bị trả lại (chưa nộp lại kỳ đó, trong 60 ngày).
// Phiên 1d: biểu có kỳ gần nhất quá hạn hồ sơ mà tôi nộp được; tài liệu tôi phụ trách sắp/quá hạn rà soát; thao tác gửi không được.
// Phiên 2d: phiếu đề nghị chờ tôi xem xét, phiếu đã chấp thuận chờ thực hiện (Thư ký ISO; người đề nghị soạn phiên bản theo phiếu),
// phiếu của tôi không được chấp thuận (30 ngày), bản in cần thu hồi (Thư ký ISO).
// Phiên 3a: hành động khắc phục của tôi đến hạn trong 7 ngày / quá hạn; phiếu chờ tôi kiểm tra hiệu lực (hạn trong 7 ngày / quá hạn);
// phiếu tôi phụ trách chưa có hành động đang mở (cần lập kế hoạch, hoặc đã xong hành động — gửi kiểm tra hiệu lực).
// Phiên 3c: sản phẩm không phù hợp chờ tôi quyết định xử lý; phiếu tôi phụ trách đang xử lý đến hạn trong 7 ngày / quá hạn; phiếu cần
// phiếu khắc phục mà chưa lập (tôi sửa được phiếu).
import { session } from './core.js';
import { recs, items, isSecretary, canApprove, versionEditable, reviewSoon, today, addDaysIso, canSeeRecords, canSubmitRecord, recordCheck,
  recordStatusMap, recordsOn, canDecideReq, distDue, distOverdue, canVerifyCapa, capaIsParty, canDecideNcr, canEditNcr } from './data.js';
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
  const reqs = (await recs('DOCREQ')).filter((r) => !r.archived_at);
  const cut30 = addDaysIso(today(), -30);
  out.req_review = reqs.filter((r) => canDecideReq(r));
  out.req_todo = reqs.filter((r) => r.state === 'APPROVED' && (sec || (r.submitted_by === uid && r.req_type !== 'CANCEL' && !r.version_id)));
  out.req_rejected = reqs.filter((r) => r.state === 'REJECTED' && r.submitted_by === uid && String(r.decided_at).slice(0, 10) >= cut30);
  const dists = sec ? (await recs('DIST')).filter((d) => d.state === 'ACTIVE' && distDue(d, byId.get(d.item_id))) : [];
  out.dist_due = dists;
  out.dist_overdue = dists.filter((d) => distOverdue(d, byId.get(d.item_id)));
  const capas = (await recs('CAPA')).filter((c) => !c.archived_at);
  const capaActs = (await recs('CAPA_ACT')).filter((a) => !a.archived_at);
  const soon = addDaysIso(today(), 7);
  const openCapa = new Set(capas.filter((c) => c.state === 'OPEN').map((c) => c.capa_id));
  out.capa_acts = capaActs.filter((a) => a.state === 'OPEN' && a.owner_user_id === uid && openCapa.has(a.capa_id) && a.due_date && a.due_date <= soon);
  out.capa_verify = capas.filter((c) => c.state === 'VERIFYING' && canVerifyCapa(c) && (!c.verify_due || c.verify_due <= soon));
  out.capa_owner = capas.filter((c) => c.state === 'OPEN' && c.owner_user_id === uid && !capaActs.some((a) => a.capa_id === c.capa_id && a.state === 'OPEN'));
  // Khiếu nại / SCAR (3b) của tôi chưa phản hồi, hạn phản hồi trong 7 ngày hoặc đã quá
  out.capa_reply = capas.filter((c) => capaIsParty(c) && (c.state === 'OPEN' || c.state === 'VERIFYING') && c.owner_user_id === uid && !c.reply_date && c.reply_due && c.reply_due <= soon);
  // Sản phẩm không phù hợp (3c)
  const ncrs = (await recs('NCR')).filter((n) => !n.archived_at);
  const liveCapa = new Set(capas.filter((c) => c.state !== 'CANCELLED').map((c) => c.capa_id));
  out.ncr_decide = ncrs.filter((n) => n.state === 'OPEN' && canDecideNcr(n));
  out.ncr_due = ncrs.filter((n) => n.state === 'DECIDED' && n.owner_user_id === uid && n.exec_due && n.exec_due <= soon);
  out.ncr_capa = ncrs.filter((n) => n.state === 'DECIDED' && n.need_capa === 'YES' && !(n.capa_id && liveCapa.has(n.capa_id)) && canEditNcr(n));
  out.total = out.ncr_decide.length + out.ncr_due.length + out.ncr_capa.length + out.review.length + out.issue.length + out.returned.length + out.rec_returned.length + out.send_problems.length +
    out.req_review.length + out.req_todo.length + out.req_rejected.length + out.capa_acts.length + out.capa_verify.length + out.capa_owner.length + out.capa_reply.length +
    (out.nofile.length ? 1 : 0) + (out.review_due.length ? 1 : 0) + (out.rec_late.length ? 1 : 0) + (out.dist_due.length ? 1 : 0);
  return out;
}
