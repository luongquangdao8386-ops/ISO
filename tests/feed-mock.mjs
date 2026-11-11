// App M&E và Checksheet giả cho test: cửa đọc feed.isoEvidence đúng hợp đồng (phiên 2a) — khóa kết nối, since, app_id.
// Link /exec và mã kết nối ở đây chỉ là chuỗi giả cho test.
export const ME_URL = 'https://script.google.com/macros/s/TESTONLY_fake_me_deployment_000/exec';
export const CS_URL = 'https://script.google.com/macros/s/TESTONLY_fake_cs_deployment_000/exec';
export const ME_KEY = 'meKey_' + 'x'.repeat(30);
export const CS_KEY = 'csKey_' + 'y'.repeat(30);

/**
 * Gắn hai app giả vào UrlFetchApp của máy chủ giả lập. data: {ME: [{form_code, date, count}], CS: [...]} (sửa được sau khi gắn).
 * Trả {calls, mode}: mode = 'redirect' giả lập chặng chuyển hướng của Google biến POST thành GET (mất phản hồi).
 */
export function fakeApps(env, data) {
  const st = { calls: [], mode: '' };
  env.urlFetch.handler = (url, o) => {
    const body = JSON.parse(o.payload);
    st.calls.push({ url, body });
    if (st.mode === 'redirect') return { ok: false, code: 'NOT_FOUND', via: 'GET' };
    const src = url === ME_URL ? 'ME' : url === CS_URL ? 'CS' : '';
    if (!src) return '<html>Không tìm thấy</html>';
    if (body.action !== 'feed.isoEvidence' || body.payload.key !== (src === 'ME' ? ME_KEY : CS_KEY)) return { ok: false, code: 'FORBIDDEN' };
    const items = (data[src] || []).filter((x) => x.date >= body.payload.since);
    return { ok: true, code: 'OK', data: { app_id: src, items, server_time: '2026-11-11T08:00:00+07:00' } };
  };
  return st;
}

/** Các ngày từ from tới to (YYYY-MM-DD) */
export function daysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to; d = new Date(Date.parse(d + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)) out.push(d);
  return out;
}
