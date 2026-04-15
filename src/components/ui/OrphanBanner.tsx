/**
 * OrphanBanner — DÉPRÉCIÉ (15 avril 2026).
 *
 * R3STO concept : auto-assign systématique → l'état "résa orpheline / sans table"
 * ne doit pas exister côté UX. Si une résa arrive sans tableId valide, c'est un
 * bug du flow de création (à fix côté API/store), pas un état à exposer au resto.
 *
 * Composant neutralisé pour ne plus rien afficher. Le hook useOrphans reste
 * disponible dans hooks/useOrphans.ts pour les tests/audits internes.
 * Voir mémoire feedback_no_unassigned_resa.md.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OrphanBanner(_props: { onNavigate?: (resaId: string) => void }) {
  return null
}
