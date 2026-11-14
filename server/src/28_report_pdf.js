/* 28_report_pdf: bố cục báo cáo và PDF (phiên 2c).
 * reportLayout_(snap): một bố cục chung từ bản chụp số liệu (27_reports.js) — tiêu đề hai thứ tiếng, thông tin hai cột (bộ lọc | số
 * báo cáo, ngày lập, người lập), ô số tóm tắt, các phần (bảng hoặc nhãn – giá trị), chú thích, khối ký Người lập / Người duyệt. App
 * vẽ bản xem trước và dựng Excel từ đúng bố cục này (report.run / report.save trả kèm) → màn hình, PDF, Excel cùng chữ, cùng số.
 * PDF dựng bằng Google Docs tạm (bộ dựng của Checksheet / M&E d4.11): A4 ngang, logo công ty ở đầu trang (Quản trị tải lên),
 * chân trang có mã báo cáo; xong đổi sang PDF rồi bỏ tài liệu tạm vào thùng rác. */

var PDF_C_ = {
  navy: '#17324F', ink: '#1F2933', muted: '#5B6875', line: '#C9D3DF', head: '#E6ECF3', zebra: '#F7F9FC', tile: '#F1F5F9', white: '#FFFFFF',
  good: '#1E7B4A', bad: '#B42318', warn: '#B54708'
};
var PDF_TONE_ = { green: PDF_C_.good, red: PDF_C_.bad, amber: PDF_C_.warn, muted: PDF_C_.muted, navy: PDF_C_.navy };
var PDF_STYLE_BUDGET_MS_ = 20000;
var PDF_LOGO_PX_H_ = 56;   // chiều cao logo đầu trang (Docs tính px ≈ 0,75 pt → khoảng 42 pt, 1,5 cm)
var PDF_MARGIN_ = 40;

/* ---------------- Bố cục chung ---------------- */

/** Nhãn hai dòng (Việt xuống dòng Trung) cho tiêu đề cột hẹp */
function labNl_(key, vars) {
  return lab_(key, vars).replace(' · ', '\n');
}
/** Chữ hai thứ tiếng của một bản ghi (tên Việt, xuống dòng tên Trung) */
function biNl_(vi, zh) {
  return [vi, zh].filter(function (x) { return x; }).join('\n');
}
function dmy_(iso) { return iso ? fmtDateVN_(iso) : ''; }
/** Mã kỳ tháng/quý → nhãn cột: 2026-11 → 11/2026; 2026-Q4 → Q4/2026 */
function reportColLabel_(grain, key) {
  return grain === 'MONTH' ? key.slice(5, 7) + '/' + key.slice(0, 4) : key.slice(5) + '/' + key.slice(0, 4);
}
function reportPctText_(v) { return v === null || v === undefined ? '—' : String(v).replace('.', ',') + ' %'; }

/** Bộ lọc → các dòng thông tin bên trái [[nhãn, giá trị]] */
function reportMetaLeft_(snap) {
  var f = snap.filters || {}, d = snap.data || {};
  var out = [];
  if (snap.kind === 'CAPA' && d.one) {
    out.push([lab_('rpt.f.capa'), d.one.code]);
    out.push([lab_('rpt.f.dept'), d.one.dept_code]);
    if (d.one.party_name) out.push([lab_('capa.party.' + d.one.source), d.one.party_name]);
    return out;
  }
  if (snap.kind === 'AUDIT') {
    if (d.one) {
      out.push([lab_('rpt.f.audit'), d.one.code || '—']);
      out.push([lab_('rpt.f.dept'), d.one.dept_code]);
      if (d.one.program && d.one.program.code) out.push([lab_('aud.program'), d.one.program.code]);
    } else if (d.prog) {
      out.push([lab_('rpt.f.year'), String(d.prog.year)]);
      out.push([lab_('aud.program'), d.prog.code]);
    }
    if (snap.scope_depts) out.push([lab_('rpt.f.scope_depts'), snap.scope_depts]);
    return out;
  }
  if (snap.kind === 'MREVIEW' && d.one) {
    out.push([lab_('rpt.f.mreview'), d.one.code]);
    out.push([lab_('mr.period'), dmy_(d.one.period_from) + ' – ' + dmy_(d.one.period_to)]);
    if (d.st && d.st.data && d.st.data.scope) out.push([lab_('rpt.f.scope_depts'), d.st.data.scope]);
    return out;
  }
  if (snap.kind === 'NCR' && d.one) {
    out.push([lab_('rpt.f.ncr'), d.one.code]);
    out.push([lab_('rpt.f.dept'), d.one.dept_code]);
    if (d.one.product_text) out.push([lab_('ncr.product'), d.one.product_text]);
    return out;
  }
  if (snap.kind === 'DOCREQ' && d.one) {
    out.push([lab_('rpt.f.req'), d.one.code]);
    out.push([lab_('rpt.f.dept'), d.one.dept_code]);
    return out;
  }
  if (snap.kind === 'VERSIONS') {
    var it = d.item || {};
    out.push([lab_('rpt.f.item'), it.code + ' · ' + (it.name_vi || it.name_zh || '')]);
    out.push([lab_('rpt.f.dept'), it.dept_code + ' · ' + it.dept_vi + (it.dept_zh ? ' · ' + it.dept_zh : '')]);
  } else {
    out.push([lab_('rpt.f.dept'), snap.dept_label || lab_('rpt.all_depts')]);
  }
  if (snap.kind === 'CATALOG') out.push([lab_('rpt.f.scope'), lab_('rpt.scope.' + f.scope)]);
  if (snap.kind === 'RECORDS') {
    var cols = d.cols || [];
    out.push([lab_('rpt.f.period'), (cols.length ? reportColLabel_(d.grain, cols[0].key) + ' – ' + reportColLabel_(d.grain, cols[cols.length - 1].key) : '') +
      ' (' + lab_('rpt.grain.' + d.grain) + ')']);
  }
  if (snap.kind === 'COVERAGE') out.push([lab_('rpt.f.std'), lab_('rpt.std.' + f.std)]);
  if (snap.kind === 'DIST') out.push([lab_('rpt.f.dist_state'), lab_('rpt.dist_state.' + f.state)]);
  if (snap.kind === 'DOCREQ') { out.push([lab_('rpt.f.year'), String(f.year)]); out.push([lab_('rpt.f.req_state'), lab_('rpt.req_state.' + f.state)]); }
  if (snap.kind === 'CAPA') {
    out.push([lab_('rpt.f.year'), String(f.year)]);
    out.push([lab_('rpt.f.capa_state'), lab_('rpt.capa_state.' + f.state)]);
    if (f.source && f.source !== 'ALL') out.push([lab_('rpt.f.capa_source'), lab_('rpt.capa_source.' + f.source)]);
  }
  if (snap.kind === 'NCR') {
    out.push([lab_('rpt.f.year'), String(f.year)]);
    out.push([lab_('rpt.f.ncr_state'), lab_('rpt.ncr_state.' + f.state)]);
  }
  if (snap.scope_depts) out.push([lab_('rpt.f.scope_depts'), snap.scope_depts]);
  return out;
}

function reportMetaRight_(snap) {
  var out = [];
  if (snap.form_code) out.push([lab_('rpt.form_code'), snap.form_code + (snap.form_rev ? ' · ' + lab_('rpt.rev_n', { N: snap.form_rev }) : '')]);
  out.push([lab_('rpt.number'), snap.code || lab_('rpt.no_code')]);
  out.push([lab_('rpt.generated_at'), dmy_(snap.generated_at) + ' ' + String(snap.generated_at || '').slice(11, 16)]);
  out.push([lab_('rpt.prepared_by'), snap.generated_by_name || '']);
  return out;
}

/** Bảng: {head: [chữ], types: [code | text | num | date | mid], rows: [[chữ]], tones: [[màu]] | null, widths?: [tỷ lệ]} */
function rptTable_(head, types, rows, tones) {
  return { head: head, types: types, rows: rows, tones: tones || null };
}

function layoutCatalog_(snap) {
  var d = snap.data, all = snap.filters.scope === 'ALL';
  var secs = [];
  var head = [labNl_('rpt.col.code'), labNl_('rpt.col.name'), labNl_('rpt.col.kind'), labNl_('rpt.col.rev'), labNl_('rpt.col.issued_at'),
    labNl_('rpt.col.effective'), labNl_('rpt.col.review_due')].concat(all ? [labNl_('rpt.col.status')] : []).concat([labNl_('rpt.col.note')]);
  var types = ['code', 'text', 'text', 'mid', 'date', 'date', 'date'].concat(all ? ['text'] : []).concat(['text']);
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r) {
      var notes = [];
      if (r.review_state === 'OVERDUE') notes.push(lab_('rpt.note.review_overdue'));
      if (r.review_state === 'SOON') notes.push(lab_('rpt.note.review_soon'));
      if (r.file_missing) notes.push(lab_('rpt.note.file_missing'));
      var t = ['', '', '', '', '', '', r.review_state === 'OVERDUE' ? 'red' : (r.review_state === 'SOON' ? 'amber' : '')];
      if (all) t.push(r.status === 'ISSUED' ? 'green' : (r.status === 'DRAFTING' ? 'amber' : 'muted'));
      t.push(r.review_state === 'OVERDUE' ? 'red' : (r.file_missing || r.review_state === 'SOON' ? 'amber' : ''));
      tones.push(t);
      return [r.code, biNl_(r.name_vi, r.name_zh), labNl_('kind.' + r.kind), r.rev, dmy_(r.issued_at), dmy_(r.effective_date), dmy_(r.review_due)]
        .concat(all ? [STATUS_SYMBOL_[r.status] + ' ' + labNl_('status.' + r.status)] : []).concat([notes.join('\n')]);
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.items_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs.length) secs.push({ table: rptTable_(head, types, [], null) });
  var notes = [];
  if (d.counts.na) notes.push(lab_('rpt.note.catalog_na', { N: d.counts.na }));
  if (d.counts.file_missing) notes.push(lab_('rpt.note.catalog_nofile', { N: d.counts.file_missing }));
  return { sections: secs, notes: notes };
}

function biText_(vi, zh) { return [vi, zh].filter(function (x) { return x; }).join(' · '); }

function layoutRecords_(snap) {
  var d = snap.data;
  var secs = [];
  // 1. Tổng hợp theo bộ phận
  var sh = [labNl_('rpt.col.dept'), labNl_('rpt.col.tracked'), labNl_('rpt.col.periods_due'), labNl_('rpt.col.ok'), labNl_('rpt.col.late'),
    labNl_('rpt.col.rate'), labNl_('rpt.col.items_late'), labNl_('rpt.col.events')];
  var st = ['text', 'num', 'num', 'num', 'num', 'num', 'num', 'num'];
  var sumRow = function (label, s) {
    return [label, String(s.items), String(s.ok + s.late), String(s.ok), String(s.late), reportPctText_(s.rate), String(s.items_late), String(s.events)];
  };
  var sumTone = function (s) { return ['', '', '', 'green', s.late ? 'red' : '', s.late ? '' : 'green', s.items_late ? 'red' : '', '']; };
  var srows = d.depts.map(function (g) { return sumRow(g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh), g.sum); });
  var stones = d.depts.map(function (g) { return sumTone(g.sum); });
  if (d.depts.length > 1) { srows.push(sumRow(lab_('rpt.col.total'), d.totals)); stones.push(sumTone(d.totals)); }
  secs.push({ heading: lab_('rpt.sec.by_dept'), table: rptTable_(sh, st, srows, stones), total_row: d.depts.length > 1 });
  // 2. Từng bộ phận: biểu × tháng/quý
  var head = [labNl_('rpt.col.code'), labNl_('rpt.col.name'), labNl_('rpt.col.period_type')]
    .concat(d.cols.map(function (c) { return reportColLabel_(d.grain, c.key); }))
    .concat([labNl_('rpt.col.ok'), labNl_('rpt.col.late'), labNl_('rpt.col.rate')]);
  var types = ['code', 'text', 'text'].concat(d.cols.map(function () { return 'mid'; })).concat(['num', 'num', 'num']);
  var toneOf = { OK: 'green', LATE: 'red', DUE: 'muted', EV: 'navy', '': '' };
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r) {
      var name = biNl_(r.name_vi, r.name_zh);
      if (r.ev) name += '\n' + lab_('rpt.note.ev', { S: lab_('link.src_short.' + r.ev.src), N: r.ev.count, F: dmy_(r.ev.from), T: dmy_(r.ev.to) });
      var ev = r.type === 'EVENT';
      tones.push(['', '', ''].concat(r.cells.map(function (c) { return toneOf[c.s] || ''; })).concat(['green', r.late ? 'red' : '', ev ? '' : (r.late ? 'red' : 'green')]));
      return [r.code, name, labNl_('period.' + r.type)].concat(r.cells.map(function (c) { return c.t; }))
        .concat(ev ? ['', '', ''] : [String(r.ok), String(r.late), reportPctText_(r.rate)]);
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.items_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  var nc = d.not_counted || {};
  var notes = [lab_('rpt.legend.records', { G: d.grace })];
  if (nc.NOT_ISSUED || nc.NA || nc.FROM_APP || nc.NO_START) {
    notes.push(lab_('rpt.note.not_counted', { A: nc.NOT_ISSUED || 0, B: nc.NA || 0, C: nc.FROM_APP || 0, D: nc.NO_START || 0 }));
  }
  return { sections: secs, notes: notes };
}

function layoutCoverage_(snap) {
  var d = snap.data;
  var secs = [];
  var stTone = { MISSING: 'red', NONE: 'amber', NOT_ISSUED: 'navy', OK: 'green' };
  d.stds.forEach(function (s) {
    var iso = s.std !== 'BRC';
    var head = [labNl_('rpt.col.group'), labNl_(iso ? 'rpt.col.clause' : 'rpt.col.topic'), labNl_('rpt.col.content')]
      .concat(iso ? [labNl_('rpt.col.mandatory')] : [])
      .concat([labNl_('rpt.col.items'), labNl_('rpt.col.issued'), labNl_('rpt.col.app'), labNl_('rpt.col.status')])
      .concat(d.codes ? [labNl_('rpt.col.codes')] : []);
    var types = ['text', 'code', 'text'].concat(iso ? ['mid'] : []).concat(['num', 'num', 'num', 'text']).concat(d.codes ? ['text'] : []);
    var last = null, tones = [];
    var rows = s.rows.map(function (r) {
      var g = biNl_(r.group_vi, r.group_zh);
      var gShow = g !== last ? g : '';
      last = g;
      var t = ['muted', '', ''].concat(iso ? [r.mandatory ? 'red' : ''] : []).concat(['', r.issued ? 'green' : '', '', stTone[r.state]]).concat(d.codes ? [''] : []);
      tones.push(t);
      return [gShow, r.key, biNl_(r.name_vi, r.name_zh)].concat(iso ? [r.mandatory ? lab_('cov.yes') : '–'] : [])
        .concat([String(r.n), String(r.issued), String(r.app), labNl_('cov.st.' + r.state)])
        .concat(d.codes ? [(r.codes || []).map(function (c) { return c.code + ' ' + STATUS_SYMBOL_[c.status]; }).join(', ')] : []);
    });
    var sn = STD_SHORT_[s.std] || s.std;
    secs.push({ heading: lab_(iso ? 'rpt.sec.iso' : 'rpt.sec.brc', { N: s.rows.length, S: sn }), table: rptTable_(head, types, rows, tones),
      note: lab_(iso ? 'cov.how_iso' : 'cov.how_brc', { S: sn, C: STD_COL_[s.std] || '' }) });
  });
  return { sections: secs, notes: [lab_('rpt.note.scope_items', { N: d.items })] };
}

function layoutVersions_(snap) {
  var d = snap.data, it = d.item;
  var kv = [
    [lab_('rpt.col.code'), it.code],
    [lab_('rpt.col.name'), biText_(it.name_vi, it.name_zh)],
    [lab_('rpt.col.dept'), it.dept_code + ' · ' + biText_(it.dept_vi, it.dept_zh)],
    [lab_('rpt.col.kind'), lab_('kind.' + it.kind) + ' · ' + lab_('level_doc.' + it.level)],
    [lab_('rpt.col.status'), STATUS_SYMBOL_[it.status] + ' ' + lab_('status.' + it.status)]
  ];
  if (it.status === 'ISSUED') {
    kv.push([lab_('rpt.t.current_rev'), String(it.current_rev || '01')]);
    kv.push([lab_('rpt.col.issued_at'), dmy_(it.issued_at)]);
    if (it.review_due) kv.push([lab_('rpt.col.review_due'), dmy_(it.review_due)]);
  }
  if (it.reviewed_at) kv.push([lab_('rpt.kv.reviewed'), dmy_(it.reviewed_at) + (it.reviewed_by ? ' · ' + it.reviewed_by : '')]);
  if (it.na_reason) kv.push([lab_('rpt.kv.na_reason'), it.na_reason]);
  if (it.iso9001) kv.push([lab_('rpt.kv.iso9001'), it.iso9001]);
  if (it.brc_topics) kv.push([lab_('rpt.kv.brc'), it.brc_topics]);
  if (it.flow) kv.push([lab_('rpt.kv.flow'), it.flow]);
  if (it.keep) kv.push([lab_('rpt.kv.keep'), it.keep]);
  if (it.owner) kv.push([lab_('rpt.kv.owner'), it.owner]);
  var head = [labNl_('rpt.col.rev'), labNl_('rpt.col.vtype'), labNl_('rpt.col.status'), labNl_('rpt.col.summary'), labNl_('rpt.col.author'),
    labNl_('rpt.col.submitted'), labNl_('rpt.col.approved'), labNl_('rpt.col.issued_by'), labNl_('rpt.col.effective'), labNl_('rpt.col.superseded')];
  var types = ['mid', 'text', 'text', 'text', 'text', 'date', 'text', 'text', 'date', 'date'];
  var vTone = { DRAFT: 'muted', IN_REVIEW: 'amber', APPROVED: 'navy', ISSUED: 'green', SUPERSEDED: 'muted' };
  var rows = [], tones = [];
  if (d.imported) {
    rows.push([d.imported.rev, labNl_('rpt.note.imported'), labNl_('vstate.ISSUED'), d.imported.file_missing ? lab_('rpt.note.file_missing') : '', '', '', '', dmy_(d.imported.issued_at), dmy_(d.imported.issued_at), '']);
    tones.push(['', '', 'green', d.imported.file_missing ? 'red' : '', '', '', '', '', '', '']);
  }
  d.rows.forEach(function (r) {
    rows.push([r.rev, labNl_('vtype.' + r.vtype), labNl_('vstate.' + r.state), biNl_(r.summary_vi, r.summary_zh), r.author, dmy_(r.submitted_at),
      biNl_(r.approved_by, dmy_(r.approved_at)), biNl_(r.issued_by, dmy_(r.issued_at)), dmy_(r.effective_date), dmy_(r.superseded_at)]);
    tones.push(['', '', vTone[r.state] || '', '', '', '', '', '', '', '']);
  });
  return { sections: [{ heading: lab_('rpt.sec.item'), kv: kv }, { heading: lab_('rpt.sec.history'), table: rptTable_(head, types, rows, tones) }], notes: [] };
}

var DIST_TONE_ = { ACTIVE: 'green', DUE: 'red', RECALLED: 'muted' };

function layoutDist_(snap) {
  var d = snap.data;
  var head = [labNl_('rpt.col.code'), labNl_('rpt.col.name'), labNl_('rpt.col.rev'), labNl_('rpt.col.holder'), labNl_('rpt.col.copies'), labNl_('rpt.col.dist_date'),
    labNl_('rpt.col.dist_by'), labNl_('rpt.col.status'), labNl_('rpt.col.recalled'), labNl_('rpt.col.note')];
  var types = ['code', 'text', 'mid', 'text', 'num', 'date', 'text', 'text', 'text', 'text'];
  var secs = [];
  d.depts.forEach(function (g) {
    var tones = [];
    var copies = 0;
    var rows = g.rows.map(function (r) {
      copies += r.state === 'RECALLED' ? 0 : r.copies;
      var stTxt = labNl_('dist.state.' + r.state);
      if (r.state === 'DUE') stTxt += '\n' + lab_('rpt.dist_due_rev', { N: r.cur_rev }) + (r.overdue ? ' !' : '');
      tones.push(['', '', '', '', '', '', '', r.state === 'DUE' ? (r.overdue ? 'red' : 'amber') : DIST_TONE_[r.state], '', '']);
      return [r.code, biNl_(r.name_vi, r.name_zh), r.rev, r.holder, String(r.copies), dmy_(r.dist_date), r.dist_by, stTxt,
        r.recalled_date ? biNl_(dmy_(r.recalled_date), r.recalled_by) : '', r.note];
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.dist_rows_n', { N: g.rows.length, C: copies }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs.length) secs.push({ table: rptTable_(head, types, [], null) });
  return { sections: secs, notes: [lab_('rpt.note.dist', { N: d.recall_days })] };
}

/** Kết quả thực hiện của một phiếu (một dòng chữ) */
function reqDoneText_(r) {
  if (r.state === 'DONE') return [dmy_(r.done_at), r.done_by, r.done_note].filter(function (x) { return x; }).join(' · ');
  if (r.state === 'CANCELLED') return lab_('dr.state.CANCELLED') + (r.cancel_reason ? ': ' + r.cancel_reason : '');
  if (r.state === 'APPROVED' && r.version_rev) return lab_('rpt.req_drafting', { N: r.version_rev });
  return '';
}

var REQ_TONE_ = { SUBMITTED: 'amber', APPROVED: 'navy', REJECTED: 'red', DONE: 'green', CANCELLED: 'muted' };

function layoutDocreq_(snap) {
  var d = snap.data;
  if (d.one) {
    var r = d.one;
    var kv = [
      [lab_('rpt.kv.req_no'), r.code],
      [lab_('rpt.kv.req_date'), dmy_(r.submitted_at)],
      [lab_('rpt.kv.req_type'), lab_('dr.type.' + r.req_type)],
      [lab_('rpt.col.dept'), r.dept_code],
      [lab_(r.req_type === 'NEW' ? 'rpt.kv.req_new_doc' : 'rpt.kv.req_doc'), [r.item_code, biText_(r.item_name_vi, r.item_name_zh)].filter(function (x) { return x; }).join(' · ')],
      [lab_('rpt.kv.req_level'), lab_('level_doc.' + r.level)]
    ];
    if (r.cur_rev && r.req_type !== 'NEW') kv.push([lab_('rpt.t.current_rev'), r.cur_rev]);
    if (r.new_kind) kv.push([lab_('rpt.col.kind'), lab_('kind.' + r.new_kind)]);
    kv.push([lab_('rpt.kv.req_reason'), biNl_(r.reason_vi, r.reason_zh)]);
    if (r.content_vi || r.content_zh) kv.push([lab_('rpt.kv.req_content'), biNl_(r.content_vi, r.content_zh)]);
    if (r.want_date) kv.push([lab_('rpt.kv.req_want'), dmy_(r.want_date)]);
    kv.push([lab_('rpt.kv.requester'), r.requester + (r.entered_by ? ' (' + lab_('rpt.kv.entered_by', { U: r.entered_by }) + ')' : '')]);
    var res = [[lab_('rpt.col.status'), lab_('dr.state.' + r.state)]];
    if (r.decided_at) res.push([lab_(r.state === 'REJECTED' ? 'rpt.kv.rejected' : 'rpt.kv.decided'), [r.decided_by, dmy_(r.decided_at)].join(' · ') + (r.decide_note ? '\n' + r.decide_note : '')]);
    if (r.version_rev) res.push([lab_('rpt.kv.req_version'), lab_('rpt.rev_n', { N: r.version_rev }) + ' · ' + lab_('vstate.' + r.version_state)]);
    var dt = reqDoneText_(r);
    if (dt && r.state !== 'APPROVED') res.push([lab_(r.state === 'DONE' ? 'rpt.kv.req_done' : 'rpt.kv.req_note'), dt]);
    return {
      sections: [{ heading: lab_('rpt.sec.req'), kv: kv }, { heading: lab_('rpt.sec.req_result'), kv: res }], notes: [],
      sign: { prepared: lab_('rpt.sign.requester'), approved: lab_('rpt.sign.decider'), prepared_name: r.requester, approved_name: r.decided_by }
    };
  }
  var head = [labNl_('rpt.col.req_no'), labNl_('rpt.col.req_date'), labNl_('rpt.col.req_type'), labNl_('rpt.col.doc'), labNl_('rpt.col.req_reason'),
    labNl_('rpt.col.requester'), labNl_('rpt.col.decided'), labNl_('rpt.col.status'), labNl_('rpt.col.req_done')];
  var types = ['code', 'date', 'text', 'text', 'text', 'text', 'text', 'text', 'text'];
  var secs = [];
  d.depts.forEach(function (g) {
    var tones = [];
    var rows = g.rows.map(function (r) {
      tones.push(['', '', '', '', '', '', '', REQ_TONE_[r.state] || '', '']);
      return [r.code, dmy_(r.submitted_at), labNl_('dr.type.' + r.req_type), [r.item_code, r.item_name_vi || r.item_name_zh].filter(function (x) { return x; }).join('\n'),
        biNl_(r.reason_vi, r.reason_zh), r.requester, r.decided_at ? biNl_(r.decided_by, dmy_(r.decided_at)) : '', labNl_('dr.state.' + r.state), reqDoneText_(r)];
    });
    secs.push({ heading: g.dept_code + ' · ' + biText_(g.name_vi, g.name_zh) + ' — ' + lab_('rpt.req_n', { N: g.rows.length }), table: rptTable_(head, types, rows, tones) });
  });
  if (!secs.length) secs.push({ table: rptTable_(head, types, [], null) });
  return { sections: secs, notes: [] };
}

/**
 * Bố cục chung của một bản chụp: {title_vi, title_zh, meta_left, meta_right, tiles: [{label, value, tone}], sections: [{heading?, note?,
 * kv?: [[nhãn, giá trị]], table?: {head, types, rows, tones}}], notes: [chữ], sign: {prepared, approved, hint, prepared_name, approved_name,
 * middle?, middle_name? (ô ký giữa — SCAR 3b)}, footer}.
 */
function reportLayout_(snap) {
  var body = snap.kind === 'CATALOG' ? layoutCatalog_(snap) : snap.kind === 'RECORDS' ? layoutRecords_(snap)
    : snap.kind === 'COVERAGE' ? layoutCoverage_(snap) : snap.kind === 'DIST' ? layoutDist_(snap)
    : snap.kind === 'DOCREQ' ? layoutDocreq_(snap) : snap.kind === 'CAPA' ? layoutCapa_(snap)
    : snap.kind === 'NCR' ? layoutNcr_(snap) : snap.kind === 'AUDIT' ? layoutAudit_(snap) : snap.kind === 'MREVIEW' ? layoutMreview_(snap) : layoutVersions_(snap);
  var sg = body.sign || {};
  var gen = String(snap.generated_at || '');
  return {
    title_vi: snap.title_vi, title_zh: snap.title_zh, code: snap.code || '',
    meta_left: reportMetaLeft_(snap), meta_right: reportMetaRight_(snap),
    tiles: (snap.tiles || []).map(function (t) { return { label: lab_(t.k), value: t.v, tone: t.tone || '' }; }),
    sections: body.sections, notes: body.notes, none: lab_('rpt.none'),
    sign: { prepared: sg.prepared || lab_('rpt.prepared_by'), approved: sg.approved || lab_('rpt.approved_by'), hint: lab_('rpt.sign_hint'),
      prepared_name: sg.prepared ? sg.prepared_name || '' : snap.generated_by_name || '', approved_name: sg.approved_name || '',
      middle: sg.middle || '', middle_name: sg.middle ? sg.middle_name || '' : '' },
    footer: 'ISO · 体系管理 · ' + (snap.form_code ? snap.form_code + ' · ' : '') + snap.title_vi + (snap.code ? ' · ' + snap.code : '') + ' · ' +
      lab_('rpt.generated_at') + ' ' + dmy_(gen) + ' ' + gen.slice(11, 16)
  };
}

/* ---------------- Khung PDF (bộ dựng của Checksheet / M&E d4.11) ---------------- */

/** Chữ của cả phần tử: cỡ, màu, đậm, nghiêng (editAsText dùng được cho đoạn, ô, hàng, bảng) */
function pdfText_(el, size, color, bold, italic) {
  var t = el.editAsText();
  if (size) t.setFontSize(size);
  if (color) t.setForegroundColor(color);
  if (bold !== undefined && bold !== null) t.setBold(!!bold);
  if (italic !== undefined && italic !== null) t.setItalic(!!italic);
  return el;
}

function pdfPara_(p, o) {
  if (o.align) p.setAlignment(DocumentApp.HorizontalAlignment[o.align]);
  p.setSpacingBefore(o.before || 0);
  p.setSpacingAfter(o.after || 0);
  if (o.line) p.setLineSpacing(o.line);
  if (o.text !== undefined) pdfText_(p, o.size, o.color, o.bold, o.italic);
  return p;
}

/**
 * Tạo tài liệu tạm: khổ A4 (ngang khi `wide`), lề, đầu trang có logo (nếu có), chân trang một dòng.
 * Trả {doc, body, width (pt dùng được), t0, logo}.
 */
function pdfStart_(opts) {
  var doc = DocumentApp.create(NAME_PREFIX + 'TMP_' + uuid_());
  var body = doc.getBody();
  var pageW = opts.wide ? 842 : 595, pageH = opts.wide ? 595 : 842;
  body.setPageWidth(pageW);
  body.setPageHeight(pageH);
  var logo = opts.logo === undefined ? reportLogoBlob_() : opts.logo;
  body.setMarginLeft(PDF_MARGIN_).setMarginRight(PDF_MARGIN_).setMarginBottom(44).setMarginTop(logo ? 84 : 40);
  if (logo) {
    try {
      var hs = doc.addHeader();
      var hp = hs.getParagraphs()[0] || hs.appendParagraph('');
      pdfPara_(hp, { align: 'LEFT' });
      var img = hp.appendInlineImage(logo);
      var w0 = img.getWidth(), h0 = img.getHeight();
      var h = PDF_LOGO_PX_H_, w = w0 && h0 ? Math.round(h * w0 / h0) : h;
      if (w > 220) { w = 220; h = w0 && h0 ? Math.max(1, Math.round(w * h0 / w0)) : h; }
      img.setWidth(w).setHeight(h);
    } catch (e) { logo = null; body.setMarginTop(40); }
  }
  if (opts.footer) {
    var fs = doc.addFooter();
    var fp = fs.getParagraphs()[0] || fs.appendParagraph('');
    fp.setText(opts.footer);
    pdfPara_(fp, { align: 'CENTER', text: true, size: 7, color: PDF_C_.muted });
  }
  return { doc: doc, body: body, width: pageW - 2 * PDF_MARGIN_, t0: Date.now(), logo: !!logo };
}

/** Lưu, đổi sang PDF, bỏ tệp tạm vào thùng rác */
function pdfFinish_(pd) {
  var id = pd.doc.getId();
  try {
    pd.doc.saveAndClose();
    return DriveApp.getFileById(id).getAs('application/pdf').getBytes();
  } finally {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* bỏ qua */ }
  }
}

function pdfTimeLeft_(pd) { return Date.now() - pd.t0 < PDF_STYLE_BUDGET_MS_; }

/** Khối tiêu đề: dòng Việt to, dòng Trung dưới, căn giữa (dùng đoạn trống đầu thân tài liệu) */
function pdfTitle_(pd, vi, zh) {
  var p0 = pd.body.getParagraphs()[0];
  p0.setText(vi || zh || '');
  pdfPara_(p0, { align: 'CENTER', after: zh && vi ? 2 : 10, text: true, size: 16, color: PDF_C_.navy, bold: true });
  if (zh && vi) pdfPara_(pd.body.appendParagraph(zh), { align: 'CENTER', after: 10, text: true, size: 12, color: PDF_C_.navy, bold: true });
}

function pdfHeading_(pd, text, before) {
  return pdfPara_(pd.body.appendParagraph(text), { before: before === undefined ? 12 : before, after: 4, text: true, size: 10, color: PDF_C_.navy, bold: true });
}

function pdfNote_(pd, text) {
  return pdfPara_(pd.body.appendParagraph(text), { before: 3, text: true, size: 7, color: PDF_C_.muted, italic: true });
}

/** Bảng không viền */
function pdfPlain_(t) {
  t.setBorderWidth(0);
  return t;
}

function pdfCellPad_(c, v, h) {
  c.setPaddingTop(v).setPaddingBottom(v).setPaddingLeft(h).setPaddingRight(h);
  return c;
}

/** Căn mọi đoạn trong ô */
function pdfCellAlign_(c, align) {
  var A = DocumentApp.HorizontalAlignment[align];
  for (var i = 0; i < c.getNumChildren(); i++) {
    var ch = c.getChild(i);
    if (ch.getType() === DocumentApp.ElementType.PARAGRAPH) ch.asParagraph().setAlignment(A);
  }
}

/** Thông tin hai cột: trái (bộ lọc), phải (số báo cáo, ngày lập, người lập — căn phải). lines = [[nhãn, giá trị]] */
function pdfMeta_(pd, left, right) {
  var fmt = function (l) { return l[1] ? l[0] + ': ' + l[1] : l[0]; };
  var t = pdfPlain_(pd.body.appendTable([[left.map(fmt).join('\n'), right.map(fmt).join('\n')]]));
  t.setColumnWidth(0, Math.round(pd.width * 0.56)).setColumnWidth(1, pd.width - Math.round(pd.width * 0.56));
  pdfText_(t, 9, PDF_C_.ink);
  var r = t.getRow(0);
  pdfCellPad_(r.getCell(0), 2, 0);
  pdfCellPad_(r.getCell(1), 2, 0);
  pdfCellAlign_(r.getCell(1), 'RIGHT');
  return t;
}

/** Ô số tóm tắt: 4 ô một hàng; mỗi ô nhãn nhỏ xám + số đậm (màu theo tone). items = [{label, value, tone}] */
function pdfTiles_(pd, items) {
  if (!items.length) return null;
  var per = 4;
  var rows = [];
  for (var i = 0; i < items.length; i += per) {
    var row = [];
    for (var j = 0; j < per; j++) row.push('');
    rows.push(row);
  }
  var t = pd.body.appendTable(rows);
  t.setBorderWidth(3).setBorderColor(PDF_C_.white);
  var w = Math.floor(pd.width / per);
  for (var k = 0; k < per; k++) t.setColumnWidth(k, w);
  items.forEach(function (it, n) {
    var c = t.getCell(Math.floor(n / per), n % per);
    c.setBackgroundColor(PDF_C_.tile);
    pdfCellPad_(c, 5, 7);
    var p0 = c.getChild(0).asParagraph();
    p0.setText(it.label);
    pdfText_(p0, 8, PDF_C_.muted, false);
    var v = String(it.value);
    pdfPara_(c.appendParagraph(v), { before: 2, text: true, size: v.length > 18 ? 10 : 13, color: PDF_TONE_[it.tone] || PDF_C_.navy, bold: true });
  });
  return t;
}

/**
 * Độ rộng cột (pt) theo nội dung: ước lượng số ký tự (dòng dài nhất trong ô, lấy mức 90 % các dòng để một ô quá dài không chiếm hết),
 * cột số/ngày hẹp, cột chữ có trần; thiếu chỗ thì co theo tỷ lệ nhưng không nhỏ hơn 22 pt; thừa chỗ thì giãn cho kín khổ.
 */
function pdfColWidths_(head, rows, types, avail, fixed0) {
  var n = head.length;
  var longest = function (s) { return String(s || '').split('\n').reduce(function (m, x) { return Math.max(m, x.length); }, 0); };
  var ideal = [];
  for (var c = 0; c < n; c++) {
    if (fixed0 && c === 0) { ideal.push(fixed0); continue; }
    var lens = rows.map(function (r) { return longest(r[c]); }).sort(function (a, b) { return a - b; });
    var p90 = lens.length ? lens[Math.min(lens.length - 1, Math.floor(lens.length * 0.9))] : 0;
    var hl = longest(head[c]);
    var ty = types[c] || 'text';
    var cap = ty === 'num' || ty === 'date' || ty === 'mid' ? 12 : (ty === 'code' ? 16 : 44);
    var chars = Math.min(cap, Math.max(p90, Math.min(hl, cap), ty === 'num' || ty === 'mid' ? 3 : (ty === 'code' ? 7 : 6)));
    ideal.push(chars * 5 + 10); // ~5 pt mỗi ký tự ở cỡ 7–8, đệm ô
  }
  var free = avail - (fixed0 || 0);
  var flex = ideal.slice(fixed0 ? 1 : 0);
  var sum = flex.reduce(function (a, b) { return a + b; }, 0);
  var out = flex.map(function (w) { return w * free / sum; });
  if (sum > free) {
    for (var k = 0; k < 4; k++) {
      var under = 0, rest = 0;
      out.forEach(function (w) { if (w < 22) under += 22 - w; else rest += w; });
      if (!under || !(rest > 0)) break;
      out = out.map(function (w) { return w < 22 ? 22 : w - under * w / rest; });
    }
  }
  out = out.map(function (w) { return Math.max(1, Math.floor(w)); });
  return fixed0 ? [fixed0].concat(out) : out;
}

/**
 * Bảng dữ liệu: tiêu đề nền xám nhạt chữ đậm, viền mảnh, cột # (khi `numbered`), số căn phải, ngày/ô giữa căn giữa, hàng xen kẽ
 * (≤ 300 dòng), màu chữ từng ô theo tones (đậm khi có màu, trừ "muted"). total: hàng cuối là hàng tổng (đậm, nền xám).
 */
function pdfTable_(pd, tb, opts) {
  opts = opts || {};
  var numbered = !!opts.numbered;
  var h = numbered ? ['#'].concat(tb.head) : tb.head.slice();
  var ty = numbered ? ['num'].concat(tb.types) : tb.types.slice();
  var data = tb.rows.map(function (r, i) { return numbered ? [String(opts.total && i === tb.rows.length - 1 ? '' : i + 1)].concat(r) : r.slice(); });
  data = data.map(function (r) { return r.map(function (x) { return x === null || x === undefined ? '' : String(x); }); });
  if (!data.length) data = [h.map(function (x, i) { return i === (numbered ? 1 : 0) ? lab_('rpt.none') : ''; })];
  var t = pd.body.appendTable([h].concat(data));
  t.setBorderWidth(1).setBorderColor(PDF_C_.line);
  var widths = pdfColWidths_(h, data, ty, pd.width, numbered ? 22 : 0);
  widths.forEach(function (w, i) { t.setColumnWidth(i, w); });
  var fs = opts.fontSize || (h.length > 10 ? 7 : 8);
  pdfText_(t, fs, PDF_C_.ink);
  var hr = t.getRow(0);
  pdfText_(hr, fs, PDF_C_.navy, true);
  for (var c = 0; c < h.length; c++) {
    var hc = hr.getCell(c);
    hc.setBackgroundColor(PDF_C_.head);
    hc.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
    if (ty[c] === 'num') pdfCellAlign_(hc, 'RIGHT');
    else if (ty[c] === 'date' || ty[c] === 'mid') pdfCellAlign_(hc, 'CENTER');
  }
  if (!tb.rows.length) { pdfText_(t.getRow(1), fs, PDF_C_.muted, false, true); return t; }
  var zebra = data.length <= 300;
  var alignCols = [];
  ty.forEach(function (x, i) { if (x === 'num') alignCols.push([i, 'RIGHT']); else if (x === 'date' || x === 'mid') alignCols.push([i, 'CENTER']); });
  for (var r = 1; r <= data.length; r++) {
    if (!pdfTimeLeft_(pd)) break;
    var row = t.getRow(r);
    var isTotal = opts.total && r === data.length;
    if (numbered) pdfText_(row.getCell(0), fs, PDF_C_.muted);
    if (isTotal) { for (var z0 = 0; z0 < h.length; z0++) row.getCell(z0).setBackgroundColor(PDF_C_.head); pdfText_(row, fs, PDF_C_.navy, true); }
    else if (zebra && r % 2 === 0) for (var z = 0; z < h.length; z++) row.getCell(z).setBackgroundColor(PDF_C_.zebra);
    for (var a = 0; a < alignCols.length; a++) {
      var cell = row.getCell(alignCols[a][0]);
      for (var q = 0; q < cell.getNumChildren(); q++) cell.getChild(q).asParagraph().setAlignment(DocumentApp.HorizontalAlignment[alignCols[a][1]]);
    }
    var tr = tb.tones && tb.tones[r - 1];
    if (tr) {
      for (var cc = 0; cc < tr.length; cc++) {
        var col = PDF_TONE_[tr[cc]];
        if (col && data[r - 1][cc + (numbered ? 1 : 0)]) pdfText_(row.getCell(cc + (numbered ? 1 : 0)), fs, col, tr[cc] !== 'muted');
      }
    }
  }
  return t;
}

/** Bảng nhãn – giá trị: cột nhãn nền nhạt */
function pdfKv_(pd, kv) {
  var data = kv.length ? kv : [[lab_('rpt.none'), '']];
  var t = pd.body.appendTable(data.map(function (r) { return [String(r[0]), String(r[1] === null || r[1] === undefined ? '' : r[1])]; }));
  t.setBorderWidth(1).setBorderColor(PDF_C_.line);
  var wl = Math.round(pd.width * 0.28);
  t.setColumnWidth(0, wl).setColumnWidth(1, pd.width - wl);
  pdfText_(t, 9, PDF_C_.ink);
  for (var i = 0; i < data.length; i++) {
    var c = t.getRow(i).getCell(0);
    c.setBackgroundColor(PDF_C_.tile);
    pdfText_(c, 8, PDF_C_.muted, true);
  }
  return t;
}

/** Khối ký: Người lập (tên người lập báo cáo) · Người duyệt; dòng hướng dẫn ký, khoảng trống để ký */
function pdfSign_(pd, sign) {
  pdfPara_(pd.body.appendParagraph(''), { before: 14 });
  // Hai ô ký (Người lập · Người duyệt) hoặc ba ô khi có ô giữa (SCAR: đại diện nhà cung cấp, 3b)
  var cols = sign.middle ? [[sign.prepared, sign.prepared_name], [sign.middle, sign.middle_name], [sign.approved, sign.approved_name]]
    : [[sign.prepared, sign.prepared_name], [sign.approved, sign.approved_name]];
  var n = cols.length;
  var t = pdfPlain_(pd.body.appendTable([
    cols.map(function (c) { return c[0]; }),
    cols.map(function () { return sign.hint; }),
    cols.map(function () { return '\n\n\n'; }),
    cols.map(function (c) { return c[1] || ''; })
  ]));
  var w = Math.floor(pd.width / n);
  for (var k = 0; k < n; k++) t.setColumnWidth(k, k === n - 1 ? pd.width - w * (n - 1) : w);
  pdfText_(t, 9, PDF_C_.ink);
  pdfText_(t.getRow(0), 9, PDF_C_.navy, true);
  pdfText_(t.getRow(1), 7, PDF_C_.muted, false, true);
  pdfText_(t.getRow(3), 9, PDF_C_.ink, true);
  for (var r = 0; r < 4; r++) for (var c = 0; c < n; c++) { pdfCellPad_(t.getRow(r).getCell(c), 1, 4); pdfCellAlign_(t.getRow(r).getCell(c), 'CENTER'); }
  return t;
}

/* ---------------- PDF của một báo cáo ---------------- */

/** Dựng PDF (byte) từ bản chụp đã lưu: A4 ngang, logo công ty, tiêu đề, thông tin, ô số, các phần, chú thích, khối ký */
function reportPdfBuild_(snap) {
  var lay = reportLayout_(snap);
  var pd = pdfStart_({ wide: true, footer: lay.footer });
  pdfTitle_(pd, String(lay.title_vi || '').toUpperCase(), lay.title_zh);
  pdfMeta_(pd, lay.meta_left, lay.meta_right);
  pdfTiles_(pd, lay.tiles);
  lay.sections.forEach(function (s) {
    if (s.heading) pdfHeading_(pd, s.heading);
    if (s.kv) pdfKv_(pd, s.kv);
    if (s.table) pdfTable_(pd, s.table, { numbered: true, total: !!s.total_row });
    if (s.note) pdfNote_(pd, s.note);
  });
  lay.notes.forEach(function (n) { pdfNote_(pd, n); });
  pdfSign_(pd, lay.sign);
  return pdfFinish_(pd);
}
