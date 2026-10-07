// Inspect the exact user-supplied account. --apply repairs only an isolated merchant misassignment.
require('@next/env').loadEnvConfig(process.cwd());
(async () => {
    const email = process.argv[2];
    if (!email)
        throw new Error('Email required');
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const read = async (table, query) => { const response = await fetch(`${base}/rest/v1/${table}?${new URLSearchParams(query)}`, { headers: { apikey: secret, Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000) }); if (!response.ok)
        throw new Error(`${table}: HTTP ${response.status}`); return response.json(); };
    const users = await read('User', { email: `eq.${email}`, select: 'id,role,tenantId,workspaceId,isActive' });
    if (users.length !== 1) {
        console.log({ matchingAccounts: users.length });
        return;
    }
    const user = users[0];
    const tenant = user.tenantId ? (await read('Tenant', { id: `eq.${user.tenantId}`, select: 'id,signupMode,plan,onboardingCompleted' }))[0] : null;
    const workspace = user.workspaceId ? (await read('Workspace', { id: `eq.${user.workspaceId}`, select: 'id,productType,ownerId,tenantId' }))[0] : null;
    const counts = {};
    for (const [table, key, id] of [['Job', 'workspaceId', user.workspaceId], ['Lead', 'tenantId', user.tenantId], ['Customer', 'tenantId', user.tenantId], ['Invoice', 'tenantId', user.tenantId], ['Quote', 'tenantId', user.tenantId], ['Employee', 'workspaceId', user.workspaceId]]) {
        if (!id)
            continue;
        try {
            const rows = await read(table, { [key]: `eq.${id}`, select: 'id', limit: '1' });
            counts[table] = rows.length ? 'existing records' : 'none';
        }
        catch {
            counts[table] = 'unverified';
        }
    }
    const employees = await read('Employee', { workspaceId: `eq.${user.workspaceId}`, select: 'id,userId' });
    const linkedUsers = await read('User', { workspaceId: `eq.${user.workspaceId}`, select: 'id' });
    const tenantWorkspaces = await read('Workspace', { tenantId: `eq.${user.tenantId}`, select: 'id' });
    const business = await read('AiBusiness', { ownerId: `eq.${user.id}`, select: 'id,tenantId', limit: '1' });
    if (process.argv.includes('--apply')) {
        if (!user.isActive || user.role !== 'owner' || workspace?.ownerId !== user.id || workspace?.tenantId !== user.tenantId || workspace.productType !== 'crm' || tenant.signupMode !== null || business.length !== 1 || business[0].tenantId !== user.tenantId || linkedUsers.length !== 1 || tenantWorkspaces.length !== 1 || !employees.every(e => e.userId === user.id) || Object.entries(counts).some(([table, value]) => table !== 'Employee' && value !== 'none'))
            throw new Error('Repair guard failed; no changes made.');
        const fs = require('node:fs');
        const backupPath = `/private/tmp/product-assignment-${user.id}-${Date.now()}.json`;
        fs.writeFileSync(backupPath, JSON.stringify({ user, tenant, workspace }, null, 2), { mode: 0o600, flag: 'wx' });
        const patch = async (table, query, body) => { const res = await fetch(`${base}/rest/v1/${table}?${new URLSearchParams(query)}`, { method: 'PATCH', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }); if (!res.ok)
            throw new Error(`${table} update: HTTP ${res.status}`); const rows = await res.json(); if (rows.length !== 1)
            throw new Error(`${table} changed concurrently; inspect before retrying.`); };
        await patch('Workspace', { id: `eq.${workspace.id}`, ownerId: `eq.${user.id}`, productType: 'eq.crm' }, { productType: 'forms' });
        await patch('Tenant', { id: `eq.${tenant.id}`, signupMode: 'is.null' }, { signupMode: 'standalone' });
        const verifiedWorkspace = (await read('Workspace', { id: `eq.${workspace.id}`, select: 'productType' }))[0];
        const verifiedTenant = (await read('Tenant', { id: `eq.${tenant.id}`, select: 'signupMode,plan' }))[0];
        if (verifiedWorkspace.productType !== 'forms' || verifiedTenant.signupMode !== 'standalone' || verifiedTenant.plan !== tenant.plan)
            throw new Error('Verification failed; inspect backup and current assignment.');
        console.log(JSON.stringify({ repaired: true, productType: verifiedWorkspace.productType, signupMode: verifiedTenant.signupMode, planUnchanged: true, backupPath }, null, 2));
        return;
    }
    console.log(JSON.stringify({ user, tenant, workspace, hasMerchantBusiness: business.length > 0, businessTenantMatches: business[0]?.tenantId === user.tenantId, employeeCount: employees.length, employeesLinkedToOwner: employees.every(e => e.userId === user.id), workspaceUserCount: linkedUsers.length, tenantWorkspaceCount: tenantWorkspaces.length, crmRecordPresence: counts }, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
