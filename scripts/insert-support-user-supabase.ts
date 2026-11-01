import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.fieseros.com';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Prefer': 'return=representation',
};

async function postgrest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, text };
  }
}

async function run() {
  console.log('Connecting to Supabase REST API at', SUPABASE_URL);

  const email = 'support@fieseros.com';
  const passwordHash = await bcrypt.hash('#Mahadev12', 10);

  const nowIso = new Date().toISOString();

  // 1. Check or Create Tenant
  let tenantRes = await postgrest('Tenant?slug=eq.fieseros-support-tenant&select=*');
  let tenant = tenantRes.data?.[0];

  if (!tenant) {
    console.log('Creating Tenant...');
    const createTenantRes = await postgrest('Tenant', {
      method: 'POST',
      body: JSON.stringify({
        id: 'clsupporttenant00000000001',
        name: 'Fieseros Support',
        slug: 'fieseros-support-tenant',
        email,
        phone: '+91 61279 67087',
        plan: 'growth',
        planStatus: 'active',
        onboardingCompleted: true,
        onboardingStep: 5,
        industry: 'professional-services',
        country: 'IN',
        currency: 'INR',
        updatedAt: nowIso,
      }),
    });
    console.log('Create Tenant result:', createTenantRes.status, createTenantRes.data);
    tenant = Array.isArray(createTenantRes.data) ? createTenantRes.data[0] : createTenantRes.data;
  } else {
    console.log('Updating existing Tenant...');
    await postgrest('Tenant?id=eq.' + tenant.id, {
      method: 'PATCH',
      body: JSON.stringify({
        plan: 'growth',
        planStatus: 'active',
        onboardingCompleted: true,
        suspendedAt: null,
        updatedAt: nowIso,
      }),
    });
  }

  const tenantId = tenant?.id || 'clsupporttenant00000000001';
  console.log('Tenant ID:', tenantId);

  // 2. Check or Create Workspace with productType: 'bgos'
  let wsRes = await postgrest(`Workspace?tenantId=eq.${tenantId}&select=*`);
  let workspace = wsRes.data?.[0];

  if (!workspace) {
    console.log('Creating BGOS Workspace...');
    const createWsRes = await postgrest('Workspace', {
      method: 'POST',
      body: JSON.stringify({
        id: 'clsupportws0000000000001',
        name: 'Fieseros Support Workspace',
        slug: 'fieseros-support-bgos',
        productType: 'bgos',
        tenantId,
        ownerId: 'clsupportuser00000000001',
        industry: 'professional-services',
        updatedAt: nowIso,
      }),
    });
    console.log('Create Workspace result:', createWsRes.status, createWsRes.data);
    workspace = Array.isArray(createWsRes.data) ? createWsRes.data[0] : createWsRes.data;
  } else {
    console.log('Updating existing Workspace to productType bgos...');
    await postgrest(`Workspace?id=eq.${workspace.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        productType: 'bgos',
        updatedAt: nowIso,
      }),
    });
  }

  const workspaceId = workspace?.id || 'clsupportws0000000000001';
  console.log('Workspace ID:', workspaceId);

  // 3. Check or Create User
  let userRes = await postgrest(`User?email=ilike.${email}&select=*`);
  let user = userRes.data?.[0];

  if (!user) {
    console.log('Creating User support@fieseros.com...');
    const createUserRes = await postgrest('User', {
      method: 'POST',
      body: JSON.stringify({
        id: 'clsupportuser00000000001',
        email,
        name: 'Fieseros Support',
        passwordHash,
        role: 'owner',
        isActive: true,
        isSuperAdmin: false,
        emailVerified: true,
        tenantId,
        workspaceId,
        updatedAt: nowIso,
      }),
    });
    console.log('Create User result:', createUserRes.status, createUserRes.data);
    user = Array.isArray(createUserRes.data) ? createUserRes.data[0] : createUserRes.data;
  } else {
    console.log('Updating existing User credentials...');
    const updateUserRes = await postgrest(`User?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Fieseros Support',
        passwordHash,
        role: 'owner',
        isActive: true,
        isSuperAdmin: false,
        emailVerified: true,
        tenantId,
        workspaceId,
        updatedAt: nowIso,
      }),
    });
    console.log('Update User result:', updateUserRes.status, updateUserRes.data);
  }

  const userId = user?.id || 'clsupportuser00000000001';

  // Link Workspace ownerId
  await postgrest(`Workspace?id=eq.${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ownerId: userId, updatedAt: nowIso }),
  });

  // 4. Employee
  let empRes = await postgrest(`Employee?userId=eq.${userId}&select=*`);
  let emp = empRes.data?.[0];
  if (!emp) {
    console.log('Creating Employee profile...');
    const createEmpRes = await postgrest('Employee', {
      method: 'POST',
      body: JSON.stringify({
        id: 'clsupportemp00000000001',
        userId,
        workspaceId,
        name: 'Fieseros Support',
        phone: '+91 61279 67087',
        email,
        role: 'owner',
        status: 'available',
        updatedAt: nowIso,
      }),
    });
    console.log('Create Employee result:', createEmpRes.status, createEmpRes.data);
  }

  console.log('🎉 Successfully provisioned support@fieseros.com / #Mahadev12 in production database!');
}

run().catch(console.error);
