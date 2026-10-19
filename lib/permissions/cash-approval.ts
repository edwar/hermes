/**
 * Quién puede registrar un movimiento de caja (ingreso o retiro de efectivo) por sí mismo. Los demás roles
 * que tengan acceso al POS necesitan la contraseña de un administrador. La usan la API y el formulario,
 * para que lo que la pantalla pide sea exactamente lo que el servidor exige.
 */
export function canApproveCashMovements(role: string | null | undefined): boolean {
  return role === "GOD" || role === "OWNER" || role === "ADMIN"
}
