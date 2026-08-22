import { db } from '../src/lib/db';
import { getRoutingDecision } from '../src/lib/phone-number-service';

async function main() {
  const routing = await getRoutingDecision('+19843517779');
  console.log('Routing decision:', JSON.stringify(routing, null, 2));
}

main().catch((e) => console.error('FAIL:', e.message));
