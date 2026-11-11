// Màn của đợt sau: vẫn hiện trong menu và lưới ô nhưng mờ "Sắp có · 即将推出" (như M&E); máy chủ trả FEATURE_NOT_ENABLED
import { bi } from '../core.js';
import { ICON } from '../ui.js';

/** Màn → [nhãn tiêu đề, biểu tượng, phiên/đợt sẽ làm] */
const SOON = {
  reports: ['nav.reports', 'reports', 'soon.when_d2'],
  capa: ['nav.capa', 'repairs', 'soon.when_d3'],
  audits: ['nav.audits', 'inspections', 'soon.when_d4'],
  links: ['nav.links', 'link', 'soon.when_d2']
};

export async function renderSoon(view, { shell }) {
  const key = (location.hash.replace(/^#\//, '').split(/[/?]/)[0]) || 'reports';
  const s = SOON[key] || SOON.reports;
  shell.setScreen({ title: s[0] });
  view.innerHTML = `<div class="card empty-state soon-page">${ICON[s[1]]}
    <p><span class="tag soon">${bi('soon.tag')}</span></p>
    <p class="muted">${bi('soon.what.' + key)}</p>
    <p class="muted small">${bi(s[2])}</p>
    <a class="btn" href="#/catalog">${ICON.library}<span>${bi('nav.catalog')}</span></a></div>`;
}
