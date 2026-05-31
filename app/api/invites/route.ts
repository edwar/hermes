import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isGod = session.user.role === "GOD"

  if (!isGod) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("companyId") || session.user.companyId

  const invites = await prisma.companyInvite.findMany({
    where: isGod && companyId ? {} : { createdById: session.user.id },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invites)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo GOD puede crear invitaciones" }, { status: 403 })
  }

  const body = await req.json()
  const { companyName, email } = body

  if (!companyName?.trim()) {
    return NextResponse.json({ error: "Nombre de empresa requerido" }, { status: 400 })
  }

  const companyId = session.user.companyId ?? "default"
  const settings = await prisma.storeSettings.findUnique({ where: { companyId } })
  const expiryHours = settings?.inviteExpiryHours ?? 168

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiryHours)

  const token = crypto.randomUUID()

  const invite = await prisma.companyInvite.create({
    data: {
      token,
      companyName: companyName.trim(),
      email: email || null,
      createdById: session.user.id!,
      expiresAt,
    },
  })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/register?token=${token}${email ? `&email=${encodeURIComponent(email)}` : ""}`

  if (email && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Hermes POS <noreply@hermespos.com>",
        to: email,
        subject: `Invitación para unirte a ${companyName.trim()} en Hermes POS`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c2410c;">¡Has sido invitado!</h2>
            <p>Has sido invitado a unirte a <strong>${companyName.trim()}</strong> en Hermes POS.</p>
            <p>Para crear tu cuenta, haz clic en el siguiente enlace:</p>
            <p><a href="${inviteUrl}" style="display: inline-block; background-color: #c2410c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Crear mi cuenta</a></p>
            <p>Este enlace expira en ${expiryHours} horas.</p>
            <p style="color: #666; font-size: 12px;">Si no solicitaste esta invitación, puedes ignorar este correo.</p>
          </div>
        `,
      })
    } catch (err) {
      console.error("Error sending email:", err)
    }
  }

  return NextResponse.json({ ...invite, inviteUrl }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (session.user.role !== "GOD") {
    return NextResponse.json({ error: "Solo GOD puede eliminar invitaciones" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await prisma.companyInvite.delete({ where: { id } })

  return NextResponse.json({ message: "Invitación eliminada" })
}
