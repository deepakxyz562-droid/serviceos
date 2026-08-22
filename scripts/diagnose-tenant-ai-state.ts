#!/usr/bin/env bun
/**
 * Diagnostic: check the test tenant's AI Receptionist state in Supabase.
 * Reports on: FeatureFlag, AddonProduct, Subscription, Entitlement,
 * Receptionist, AgentVersion, Deployment, PhoneConnection, PhoneNumber.
 */

const SUPABASE_URL = 'https://rmzaxqxzultxetlgsgic.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtemF4cXh6dWx0eGV0bGdzZ2ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3ODA4OCwiZXhwIjoyMDk2NzU0MDg4fQ._CKVNrLfp0cvUKpIs8AgkJLjqngdiApfHfaPwMeKWvg';
const TENANT_ID = 'q3ELcE45UhpTCjg-MsvI1aHfP';
const REST = `${SUPABASE_URL}/rest/v1`;
const H = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function get(table: string, query: string): Promise<any> {
  const url = `${REST}/${table}?${query}`;
  const res = await fetch(url, { headers: H });
  if (!res.ok) {
    const txt = await res.text();
    return { _error: res.status, _body: txt.slice(0, 200) };
  }
  return res.json();
}

async function main() {
  console.log(`\n=== AI Receptionist State for tenant ${TENANT_ID} ===\n`);

  // 1. FeatureFlag
  const flags = await get('FeatureFlag', `tenantId=eq.${TENANT_ID}&select=featureKey,enabled`);
  console.log('1. FeatureFlags:');
  if (Array.isArray(flags)) {
    flags.forEach((f: any) => console.log(`   - ${f.featureKey}: enabled=${f.enabled}`));
    const aiFlag = flags.find((f: any) => f.featureKey === 'ai_receptionist');
    if (!aiFlag) console.log('   ⚠️  No ai_receptionist flag → isFeatureVisible defaults to TRUE');
    else if (!aiFlag.enabled) console.log('   ❌ ai_receptionist is DISABLED → causes 403 on /api/vapi/calls');
  } else {
    console.log('   ❌ Error:', flags);
  }

  // 2. AddonProduct
  const product = await get('AddonProduct', `code=eq.AI_RECEPTIONIST&select=id,code,name`);
  console.log('\n2. AddonProduct (AI_RECEPTIONIST):', JSON.stringify(product));

  // 3. Subscriptions
  const subs = await get('TenantAddonSubscription', `tenantId=eq.${TENANT_ID}&select=id,status,addonPlanId,addonProductId,currentPeriodStart,currentPeriodEnd,cancelAtPeriodEnd&order=createdAt.desc&limit=5`);
  console.log('\n3. Subscriptions:', JSON.stringify(subs, null, 2));

  // 4. Entitlements
  const ents = await get('AddonEntitlement', `tenantId=eq.${TENANT_ID}&select=id,status,includedSeconds,maxConcurrentCalls,includedNumbers,periodStart,periodEnd,tenantAddonSubscriptionId&order=periodStart.desc&limit=5`);
  console.log('\n4. Entitlements:', JSON.stringify(ents, null, 2));

  // 5. Receptionist
  const recs = await get('AiReceptionist', `tenantId=eq.${TENANT_ID}&select=id,name,status,currentVersionId,greeting,handoffTransferTarget&limit=5`);
  console.log('\n5. AiReceptionist:', JSON.stringify(recs, null, 2));

  // 6. Agent Versions
  if (Array.isArray(recs) && recs.length > 0) {
    const recId = recs[0].id;
    const versions = await get('AiAgentVersion', `aiReceptionistId=eq.${recId}&select=id,versionNumber,status,voice,model,publishedAt&order=versionNumber.desc&limit=5`);
    console.log('\n6. AiAgentVersions:', JSON.stringify(versions, null, 2));

    // 7. Deployments
    if (Array.isArray(versions) && versions.length > 0) {
      const vId = versions[0].id;
      const deploys = await get('AiProviderDeployment', `aiAgentVersionId=eq.${vId}&select=id,provider,externalAssistantId,status,lastError,lastSyncedAt&order=createdAt.desc&limit=5`);
      console.log('\n7. AiProviderDeployments (latest version):', JSON.stringify(deploys, null, 2));
    }
  }

  // 8. Phone Connections
  const conns = await get('PhoneConnection', `tenantId=eq.${TENANT_ID}&select=id,status,routingMode,fallbackRoutingMode,phoneNumberId,externalPhoneNumberId&order=createdAt.desc&limit=5`);
  console.log('\n8. PhoneConnections:', JSON.stringify(conns, null, 2));

  // 9. Phone Numbers
  const phones = await get('PhoneNumber', `tenantId=eq.${TENANT_ID}&select=id,number,displayName,status,providerSid,vapiNumberId,vapiAssistantId,monthlyCost&limit=10`);
  console.log('\n9. PhoneNumbers:', JSON.stringify(phones, null, 2));

  // 10. AiCalls
  const calls = await get('AiCall', `tenantId=eq.${TENANT_ID}&select=id,vapiCallId,status,fromNumber,toNumber,durationSec,costUsd,outcomeType,leadId,createdAt&order=createdAt.desc&limit=5`);
  console.log('\n10. AiCalls (recent):', JSON.stringify(calls, null, 2));

  // 11. Usage Ledger
  const ledger = await get('UsageLedger', `tenantId=eq.${TENANT_ID}&select=id,quantitySeconds,entitlementId,idempotencyKey,createdAt&order=createdAt.desc&limit=5`);
  console.log('\n11. UsageLedger (recent):', JSON.stringify(ledger, null, 2));

  console.log('\n=== Diagnostic complete ===\n');
}

main().catch((e) => console.error('Diagnostic failed:', e));
