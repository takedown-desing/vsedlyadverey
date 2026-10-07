// Служебный файл для scripts/save-cms-state.mjs: карта адресов и автоматические редиректы текущей сборки.
// После сборки скрипт переносит его в src/cms/settings и удаляет из dist.
import { CMS_STATE } from '../lib/data';
export function GET() {
  return new Response(JSON.stringify(CMS_STATE), { headers: { 'Content-Type': 'application/json' } });
}
