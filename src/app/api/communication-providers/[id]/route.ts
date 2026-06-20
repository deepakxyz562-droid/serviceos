import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// Allowed provider types. Email is intentionally excluded — EmailProvider owns
// email send. See /api/email-providers.
const ALLOWED_TYPES = new Set(['whatsapp', 'sms'])

// Credential types that are acceptable when linking to a WhatsApp provider.
const WHATSAPP_CREDENTIAL_TYPES = new Set(['whatsapp', 'apiKey', 'generic', 'oauth2', 'oauth'])

interface CredentialPick {
  id: string
  name: string
  type: string
}

async function validateCredentialLink(
  credentialId: string,
  providerType: string,
  authUser: { tenantId: string | null; workspaceId: string | null }
): Promise<{ ok: true; credential: CredentialPick } | { ok: false; error: string }> {
  const credential = await db.credential.findUnique({
    where: { id: credentialId },
    select: { id: true, name: true, type: true, workspaceId: true },
  })

  if (!credential) {
    return { ok: false, error: 'Linked credential not found' }
  }

  if (credential.workspaceId) {
    if (credential.workspaceId !== authUser.workspaceId) {
      let sameTenant = false
      if (authUser.tenantId) {
        const ws = await db.workspace.findUnique({
          where: { id: credential.workspaceId },
          select: { tenantId: true },
        })
        sameTenant = !!ws && ws.tenantId === authUser.tenantId
      }
      if (!sameTenant) {
        return { ok: false, error: 'Credential does not belong to your tenant' }
      }
    }
  }

  if (providerType === 'whatsapp') {
    if (!WHATSAPP_CREDENTIAL_TYPES.has(credential.type)) {
      return {
        ok: false,
        error: `Credential of type "${credential.type}" is not compatible with a WhatsApp provider. Expected one of: ${Array.from(WHATSAPP_CREDENTIAL_TYPES).join(', ')}.`,
      }
    }
  }

  return { ok: true, credential: { id: credential.id, name: credential.name, type: credential.type } }
}

// Returns true if the key looks like a secret field that should be stripped
// when a credential is linked.
function isSecretKey(key: string): boolean {
  const k = key.toLowerCase()
  return (
    k.includes('key') ||
    k.includes('secret') ||
    k.includes('password') ||
    k.includes('token')
  )
}

// PUT /api/communication-providers/[id] - Update a communication provider
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if provider exists and belongs to user's tenant
    const existing = await db.communicationProvider.findFirst({
      where: {
        id,
        ...(authUser.tenantId ? { tenantId: authUser.tenantId } : {}),
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Reject any attempt to switch a provider's type to the deprecated email
    // type. Existing email rows can still be edited for non-type fields (so the
    // user can e.g. disable sending), but type itself is locked.
    if (body.type !== undefined && body.type !== existing.type) {
      if (body.type === 'email') {
        return NextResponse.json(
          {
            error:
              'Email providers are managed under /api/email-providers. CommunicationProvider only supports whatsapp and sms types.',
          },
          { status: 400 }
        )
      }
      if (!ALLOWED_TYPES.has(body.type)) {
        return NextResponse.json(
          { error: `Unsupported provider type "${body.type}". Allowed: whatsapp, sms.` },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Handle credentialId updates. Supports three flows:
    //   1. Link a credential (credentialId provided as a non-empty string)
    //   2. Unlink the credential (credentialId explicitly null)
    //   3. Leave the credential alone (credentialId not present in body)
    let credentialIdChanged = false
    if (body.credentialId !== undefined) {
      if (body.credentialId === null || body.credentialId === '') {
        // Unlink
        updateData.credentialId = null
        credentialIdChanged = true
      } else {
        // Link (or re-link). Validate the credential against the provider's
        // type. If the request also tries to change type, use the new type.
        const effectiveType =
          typeof body.type === 'string' ? body.type : existing.type
        const validation = await validateCredentialLink(
          String(body.credentialId),
          effectiveType,
          { tenantId: authUser.tenantId, workspaceId: authUser.workspaceId }
        )
        if (!validation.ok) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
        updateData.credentialId = validation.credential.id
        credentialIdChanged = true
      }
    }

    // Handle config updates.
    //   - If a credential is freshly linked via this PUT, drop secrets from the
    //     merged config (keep non-secret metadata like phoneNumberId).
    //   - If a credential is already linked (and not being unlinked), any
    //     config secrets sent by the client are ignored.
    if (body.config) {
      let existingConfig: Record<string, string> = {}
      try {
        existingConfig = JSON.parse(existing.configJson)
      } catch { /* empty */ }
      const mergedConfig: Record<string, string> = { ...existingConfig, ...body.config }

      const willHaveCredential =
        'credentialId' in updateData
          ? updateData.credentialId !== null
          : existing.credentialId !== null

      if (willHaveCredential) {
        for (const key of Object.keys(mergedConfig)) {
          if (isSecretKey(key)) delete mergedConfig[key]
        }
      }

      updateData.configJson = JSON.stringify(mergedConfig)
    } else if (credentialIdChanged && updateData.credentialId !== null) {
      // No explicit config in body, but a credential is now linked — strip
      // secrets from the existing stored config too.
      let existingConfig: Record<string, string> = {}
      try {
        existingConfig = JSON.parse(existing.configJson)
      } catch { /* empty */ }
      const stripped: Record<string, string> = {}
      for (const [key, value] of Object.entries(existingConfig)) {
        if (!isSecretKey(key)) stripped[key] = value
      }
      updateData.configJson = JSON.stringify(stripped)
    }

    // Handle status toggle
    if (body.status !== undefined) {
      updateData.status = body.status
    }

    // Handle sendingEnabled toggle
    if (body.sendingEnabled !== undefined) {
      updateData.sendingEnabled = body.sendingEnabled
    }

    // Handle name update
    if (body.name !== undefined) {
      updateData.name = body.name
    }

    // Handle isDefault toggle
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault
    }

    // Handle daily/monthly limit updates
    if (body.dailyLimit !== undefined) {
      updateData.dailyLimit = body.dailyLimit
    }
    if (body.monthlyLimit !== undefined) {
      updateData.monthlyLimit = body.monthlyLimit
    }

    // Handle provider update
    if (body.provider !== undefined) {
      updateData.provider = body.provider
    }

    const result = await db.communicationProvider.update({
      where: { id },
      data: updateData,
      include: {
        credential: { select: { id: true, name: true, type: true } },
      },
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error updating communication provider:', error)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}

// DELETE /api/communication-providers/[id] - Delete a communication provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if provider exists and belongs to user's tenant
    const existing = await db.communicationProvider.findFirst({
      where: {
        id,
        ...(authUser.tenantId ? { tenantId: authUser.tenantId } : {}),
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    await db.communicationProvider.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting communication provider:', error)
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 })
  }
}
