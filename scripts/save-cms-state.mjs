// Запускается после сборки (npm run postbuild): сохраняет карту адресов и автоматические редиректы в src/cms/settings,
// чтобы следующая сборка знала прежние адреса записей. В CI изменения коммитятся (.github/workflows/deploy.yml).
import fs from 'node:fs';
const src = 'dist/cms-state.json';
if (!fs.existsSync(src)) { console.log('[save-cms-state] no state file'); process.exit(0); }
const st = JSON.parse(fs.readFileSync(src, 'utf8'));
const write = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
write('src/cms/settings/url-map.json', st.urlMap);
write('src/cms/settings/redirects-auto.json', st.redirectsAuto);
fs.rmSync(src);
console.log('[save-cms-state] urls:', Object.keys(st.urlMap).length, 'auto redirects:', Object.keys(st.redirectsAuto).length);
