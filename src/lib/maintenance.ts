/**
 * Site-wide maintenance gate. Set `MAINTENANCE_MODE=true` at build/runtime
 * (see `next.config.mjs`). Use `MAINTENANCE_MODE=false` to restore the public site.
 */
export function isMaintenanceMode(): boolean {
  const v = process.env.MAINTENANCE_MODE;
  return v === "true" || v === "1";
}
