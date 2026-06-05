import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { listPendingBills, listPendingCreditNotes, FactusApiError } from "@/lib/factus/client"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "GOD" && role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        factusEnabled: true,
        factusTokenExpiresAt: true,
        name: true,
      },
    })

    let bills: Awaited<ReturnType<typeof listPendingBills>> | null = null
    let creditNotes: Awaited<ReturnType<typeof listPendingCreditNotes>> | null = null
    let billsError: string | null = null
    let creditNotesError: string | null = null

    try {
      bills = await listPendingBills(companyId)
    } catch (e) {
      billsError = e instanceof FactusApiError ? e.message : String(e)
    }

    try {
      creditNotes = await listPendingCreditNotes(companyId)
    } catch (e) {
      creditNotesError = e instanceof FactusApiError ? e.message : String(e)
    }

    return NextResponse.json({
      company: company ? {
        name: company.name,
        factusEnabled: company.factusEnabled,
        tokenExpiresAt: company.factusTokenExpiresAt,
        tokenValid: company.factusTokenExpiresAt ? new Date(company.factusTokenExpiresAt) > new Date() : false,
      } : null,
      pendingBills: bills ?? [],
      pendingBillsError: billsError,
      pendingCreditNotes: creditNotes ?? [],
      pendingCreditNotesError: creditNotesError,
    })
  } catch (error) {
    console.error("Diagnose pending error:", error)
    return NextResponse.json({ error: "Error al diagnosticar" }, { status: 500 })
  }
}
