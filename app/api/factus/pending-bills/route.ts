import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { factusRequest, FactusApiError } from "@/lib/factus/client"
import { HTTP_METHOD } from "@/lib/constants"

export async function DELETE(req: NextRequest) {
  try {
    const guard = await guardModule("/settings")
    if ("error" in guard) return guard.error
    const { session } = guard

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
    }

    const body = await req.json()
    const { referenceCode } = body as { referenceCode?: string }

    if (!referenceCode || typeof referenceCode !== "string") {
      return NextResponse.json(
        { error: "referenceCode es requerido" },
        { status: 400 }
      )
    }

    try {
      await factusRequest(
        `/v2/bills/destroy/reference/${encodeURIComponent(referenceCode)}`,
        { method: HTTP_METHOD.DELETE },
        companyId
      )
    } catch (error) {
      if (error instanceof FactusApiError && error.statusCode === 404) {
        return NextResponse.json({
          success: true,
          alreadyCleared: true,
          message: "La factura ya no estaba en la cola de Factus",
        })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Clear pending bill error:", error)

    if (error instanceof FactusApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: "Error al limpiar factura pendiente" },
      { status: 500 }
    )
  }
}
