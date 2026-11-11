// Mọi khóa nhãn app dùng đều có trong i18n/labels.json (đủ Việt + Trung): khóa viết thẳng trong mã và các họ khóa ghép động
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const labels = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'labels.json'), 'utf8'));
const files = [];
for (const dir of ['js', 'js/pages']) for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.js') && f !== 'dict.js') files.push(path.join(ROOT, dir, f));
const actions = new Set([...fs.readFileSync(path.join(ROOT, 'server', 'src', '07_perm.js'), 'utf8').matchAll(/'([a-z]+\.[a-zA-Z.]+)\|/g)].map((m) => m[1]));
// Chuỗi có dấu chấm nhưng không phải nhãn (tên tệp trong gói xlsx, tiền tố ghép khóa)
const NOT_LABEL = new Set(['pages/version.js', 'drawing_me1.xml', 'label.check', 'details.filters', 'tr.clickable', 'xl/styles.xml', 'pages/home.js', 'pages/catalog.js', 'pages/item.js', 'pages/excel.js', 'pages/soon.js', 'pages/account.js', 'pages/drafts.js', 'pages/admin.js']);

test('khóa nhãn viết thẳng trong mã đều có trong từ điển', () => {
  const missing = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/'([a-z][a-z0-9_]*(?:\.[a-zA-Z0-9_]+)+)'/g)) {
      const k = m[1];
      if (/\.(js|mjs|svg|png|jpg|json|css|html|xlsx|webmanifest)$/.test(k) || actions.has(k) || NOT_LABEL.has(k)) continue;
      if (!labels[k]) missing.add(`${k} (${path.basename(f)})`);
    }
    for (const m of src.matchAll(/\b(?:bi|biText|badge)\(\s*'([a-z][a-z0-9_]*)'/g)) if (!labels[m[1]]) missing.add(`${m[1]} (${path.basename(f)})`);
    // Khóa truyền vào hàm vẽ nhãn (askPin) — có thể trùng tên action (vd auth.reauth) nên không bị bỏ qua như trên
    for (const m of src.matchAll(/\b(?:bi|biText|badge|askPin)\(\s*'([a-z][a-z0-9_.]*)'\s*[,)]/g)) if (!labels[m[1]]) missing.add(`${m[1]} (${path.basename(f)})`);
  }
  assert.deepEqual([...missing], []);
});

test('họ khóa ghép động đủ thành viên', () => {
  const fam = {
    'status.': ['NONE', 'DRAFTING', 'ISSUED', 'NA'],
    'kind.': ['FORM', 'MANUAL', 'POLICY', 'PROCEDURE', 'WI', 'EXTERNAL'],
    'level_doc.': ['DEPT', 'COMPANY'],
    'where.': ['ME', 'CS', 'ME_PART', 'CS_PART', 'CS_PROPOSED', 'MANUAL'],
    'period.': ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'HALF', 'YEAR', 'EVENT'],
    'weekday.': ['1', '2', '3', '4', '5', '6', '7'],
    'level.': ['1', '2', '3', '4', 'owner'],
    'op_state.': ['QUEUED', 'SENDING', 'COMMITTED', 'REJECTED', 'CONFLICT', 'UNKNOWN', 'BLOCKED'],
    'user_status.': ['ACTIVE', 'DISABLED', 'MUST_CHANGE_PIN'],
    'backup_status.': ['VERIFIED', 'INCONSISTENT', 'FAILED', 'RUNNING'],
    'audit_grp.': ['item', 'version', 'doc', 'import', 'dept', 'user', 'settings', 'report', 'backup'],
    'vstate.': ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ISSUED', 'SUPERSEDED', 'CANCELLED'],
    'vtype.': ['REVISION', 'ATTACH'],
    'ver.tab.': ['review', 'issue', 'returned', 'drafts', 'open'],
    'action.': ['record.submit', 'doc.upload'],
    'cell.': ['OK', 'PEND', 'LATE', 'DUE', 'NA'],
    'rec.st.': ['SUBMITTED', 'RETURNED', 'VOID', 'QUEUED', 'REJECTED'],
    'rec.reason.': ['NOT_ISSUED', 'FROM_APP', 'NO_START'],
    'rec.reason_short.': ['NOT_ISSUED', 'FROM_APP', 'NO_START'],
    'rec.no_record.': ['ITEM_NO_RECORD', 'RECORD_FROM_APP'],
    'mirror_status.': ['OK', 'FAILED', 'OFF'],
    'imp.act.': ['ADD', 'UPDATE', 'SAME', 'ERROR'],
    'imp.status.': ['STAGING', 'PREVIEWED', 'COMMITTING', 'COMPLETED', 'CANCELLED'],
    'soon.what.': ['records', 'coverage', 'reports', 'capa', 'audits', 'links'],
    'tile.': ['catalog', 'records', 'coverage', 'excel', 'reports', 'capa', 'audits', 'links', 'drafts'],
    'col.': ['dept_code', 'group_key', 'name_vi', 'name_zh', 'purpose_vi', 'purpose_zh', 'iso9001', 'iso14001', 'iso45001', 'iso50001', 'brc_topics', 'law', 'cls',
      'freq_vi', 'freq_zh', 'flow', 'keep', 'priority', 'where', 'where_note', 'status', 'current_rev', 'issued_at', 'period_days', 'note', 'group_label']
  };
  // Dòng kiểm tra sức khỏe máy chủ (24_system.js add('khóa', …))
  fam['health.'] = [...fs.readFileSync(path.join(ROOT, 'server', 'src', '24_system.js'), 'utf8').matchAll(/\badd\('([a-z_0-9]+)'/g)].map((m) => m[1]);
  const missing = [];
  for (const [p, list] of Object.entries(fam)) for (const k of list) if (!labels[p + k]) missing.push(p + k);
  assert.deepEqual(missing, []);
});

test('mỗi nhãn đủ hai thứ tiếng', () => {
  const bad = Object.entries(labels).filter(([k, v]) => k !== '_comment' && (!Array.isArray(v) || !String(v[0] || '').trim() || !String(v[1] || '').trim())).map(([k]) => k);
  assert.deepEqual(bad, []);
});
