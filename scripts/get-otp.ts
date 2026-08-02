import { directPrisma } from '../src/lib/direct-prisma';
async function main() {
  const otp = await directPrisma.otpVerification.findFirst({
    where: { phone: '918505945123', verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { otpCode: true, expiresAt: true, createdAt: true, attempts: true }
  });
  console.log(JSON.stringify(otp));
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>process.exit(0));
