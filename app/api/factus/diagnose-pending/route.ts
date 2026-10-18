import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listPendingBills, listPendingCreditNotes, FactusApiError } from "@/lib/factus/client"

async function getCompanyInfo(companyId: string | null | undefined) {
  if (!companyId) return null
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, factusEnabled: true, factusTokenExpiresAt: true },
  })
  if (!company) return null
  return {
    name: company.name,
    factusEnabled: company.factusEnabled,
    tokenExpiresAt: company.factusTokenExpiresAt,
    tokenValid: company.factusTokenExpiresAt ? new Date(company.factusTokenExpiresAt) > new Date() : false,
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Quien administra la configuración ve el diagnóstico completo; el resto, solo los datos básicos.
    const canManage = await canAccessModule(
      { userId: session.user.id, role: session.user.role, companyId: session.user.companyId },
      "/settings"
    )

    if (!canManage) {
      return NextResponse.json({
        company: await getCompanyInfo(session.user.companyId),
        pendingBills: [],
        pendingBillsError: null,
        pendingCreditNotes: [],
        pendingCreditNotesError: null,
        pendingBillsRestricted: true,
      })
    }

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
    }

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
      company: await getCompanyInfo(companyId),
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
