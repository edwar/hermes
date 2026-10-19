import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Qué ve o puede hacer cada persona dentro de una pantalla lo deciden los permisos resueltos (useCanSee), no
// el rol escrito a mano: si no, las reglas que el GOD o el dueño configuran no llegarían a esos controles.

const ROLES = "OWNER|ADMIN|MANAGER|CASHIER"
const HARD_CODED = new RegExp(`role\\s*[!=]==?\\s*(["'](${ROLES})["']|USER_ROLE\\.(${ROLES}))`)

// Solo muestran una etiqueta con el nombre del rol (no deciden acceso)
const LABEL_ONLY = ["app/(app)/users/page.tsx", "app/(app)/profile/page.tsx", "components/shared/header.tsx"]
// Filtra a quién se le configuran permisos (no decide qué ve quien mira la pantalla)
const NOT_ACCESS = ["components/settings/permissions-by-person.tsx"]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === "api" ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path.replace(/\\/g, "/")] : []
  })
}

describe("controles de las pantallas", () => {
  it("no comparan el rol escrito a mano para decidir qué mostrar", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components")].filter((f) => !LABEL_ONLY.includes(f) && !NOT_ACCESS.includes(f))
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.filter((f) => HARD_CODED.test(readFileSync(f, "utf8")))
    expect(offenders, "Usa useCanSee()(módulo) en vez de comparar el rol").toEqual([])
  })
})
