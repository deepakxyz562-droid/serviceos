import { getNimoServiceClient } from '../supabase';
import { getImageProvider } from '../providers';
import { WalletService } from '../wallet.service';
import { IdentityService } from '../identity.service';

/**
 * Server-side Asynchronous Generation Worker
 * Handles complete AI lifecycle in the background so mobile clients never block or timeout.
 */
export async function processGenerationJob(jobId: string): Promise<void> {
  const supabase = getNimoServiceClient();

  try {
    // 1. Fetch Job Record
    const { data: job, error: jobErr } = await supabase
      .from('generation_jobs')
      .select('*, templates(*)')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      console.error(`[Worker] Job ${jobId} not found`);
      return;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return; // Already terminal
    }

    // 2. Set Status to Processing: Phase 1 (Face & Landmark Alignment)
    await supabase
      .from('generation_jobs')
      .update({
        status: 'processing',
        stage: 'analyzing_face_landmarks',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // 3. Resolve Reference Photos
    const metadata = job.input_metadata || {};
    let referencePhotos: string[] = metadata.photoUrls || [];

    // If no direct photos, use saved identity album photos (5-10 photos)
    if (!referencePhotos || referencePhotos.length === 0) {
      const identity = await IdentityService.getIdentityAlbum(job.user_id);
      if (identity.hasIdentity && identity.photos.length > 0) {
        // Use top 3 to 5 reference photos for optimal Grok 2.0 resemblance
        referencePhotos = identity.photos.slice(0, 5).map((p) => p.storage_path);
      }
    }

    // Default safety fallback if completely empty
    if (referencePhotos.length === 0) {
      referencePhotos = ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'];
    }

    // 4. Resolve Prompt
    const template = job.templates || {};
    const promptConfig = template.prompt_config || {};
    const prompt =
      promptConfig.prompt ||
      `Ultra-realistic professional studio portrait preserving exact facial identity of <IMAGE_0>, radiant glow, cinematic lighting, 8k resolution`;

    // 5. Submit to AI Provider (Phase 2: Neural Style Synthesis)
    await supabase
      .from('generation_jobs')
      .update({
        stage: 'neural_style_synthesis',
      })
      .eq('id', jobId);

    const provider = getImageProvider();
    const aiResponse = await provider.generate({
      prompt,
      referenceImages: referencePhotos,
      aspectRatio: metadata.aspectRatio || template.aspect_ratio || '9:16',
      quality: 'high',
    });

    if (aiResponse.status === 'failed' || !aiResponse.providerRequestId) {
      throw new Error(aiResponse.error || 'AI Provider rejected generation request');
    }

    // Update with provider task ID
    await supabase
      .from('generation_jobs')
      .update({
        provider_request_id: aiResponse.providerRequestId,
        stage: 'lighting_and_atmosphere_render',
      })
      .eq('id', jobId);

    // 6. Polling Loop with Realtime Phase Updates
    const taskId = aiResponse.providerRequestId;
    let isFinished = false;
    let attempts = 0;
    const maxAttempts = 50; // ~120s max timeout

    while (!isFinished && attempts < maxAttempts) {
      await new Promise((res) => setTimeout(res, 2500));
      attempts++;

      const statusRes = await provider.getStatus?.(taskId);
      if (!statusRes) continue;

      if (statusRes.status === 'completed' && statusRes.outputUrl) {
        isFinished = true;

        // 7. Success: Save to generated_media
        const { data: media } = await supabase
          .from('generated_media')
          .insert({
            user_id: job.user_id,
            job_id: job.id,
            storage_path: statusRes.outputUrl,
            media_type: 'image',
            mime_type: 'image/jpeg',
          })
          .select('id')
          .single();

        // Finalize coins permanently
        await WalletService.captureCoins(job.user_id, job.coin_cost, job.id);

        // Mark Job Completed
        await supabase
          .from('generation_jobs')
          .update({
            status: 'completed',
            stage: 'complete',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        return;
      }

      if (statusRes.status === 'failed') {
        throw new Error(statusRes.error || 'AI neural generation failed');
      }

      // Update intermediate stage
      if (attempts === 4) {
        await supabase.from('generation_jobs').update({ stage: 'refining_skin_and_hair' }).eq('id', jobId);
      } else if (attempts === 8) {
        await supabase.from('generation_jobs').update({ stage: 'upscaling_4k_studio' }).eq('id', jobId);
      }
    }

    if (!isFinished) {
      throw new Error('Generation timed out at AI provider');
    }
  } catch (err: any) {
    console.error(`[Worker Error on Job ${jobId}]:`, err.message);

    // Automatic Refund on failure
    const { data: currentJob } = await supabase
      .from('generation_jobs')
      .select('user_id, coin_cost')
      .eq('id', jobId)
      .single();

    if (currentJob) {
      await WalletService.refundCoins(currentJob.user_id, currentJob.coin_cost, jobId, err.message);
    }

    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        stage: 'failed',
        error_message: err.message || 'Generation failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
