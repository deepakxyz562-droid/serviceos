import { db } from '@/lib/db';

async function testApi() {
  console.log('Testing DB connectivity and job tracking queries...');
  const job = await db.job.findFirst({
    select: {
      id: true,
      jobNumber: true,
      title: true,
      status: true,
      latitude: true,
      longitude: true,
      assignee: {
        select: {
          id: true,
          name: true,
          phone: true,
          latitude: true,
          longitude: true,
          lastLocationAt: true,
        },
      },
    },
  });

  console.log('Sample job query result:', job ? {
    id: job.id,
    jobNumber: job.jobNumber,
    title: job.title,
    status: job.status,
    hasJobCoords: job.latitude != null && job.longitude != null,
    hasAssignee: !!job.assignee,
    assigneeName: job.assignee?.name,
    hasAssigneeCoords: job.assignee?.latitude != null && job.assignee?.longitude != null,
  } : 'No jobs found');

  console.log('Test completed successfully.');
}

testApi()
  .catch((e) => {
    console.error('Error in testApi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
