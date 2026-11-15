import { getNimoServiceClient } from './supabase';
import { getImageProvider } from './providers';
import { WalletService } from './wallet.service';
import { NIMO_CONFIG } from './config';

export interface CreateJobInput {
  userId: string;
  templateId: string;
  photoUrls: string[];
  idempotencyKey: string;
  aspectRatio?: '1:1' | '9:16' | '16:9' | '2:3' | '3:4';
}

export class GenerationService {
  /**
   * Submit an image generation job with atomic coin reservation
   */
  static async createJob(input: CreateJobInput) {
    const supabase = getNimoServiceClient();

    // 1. Fetch template details (supports both UUID and slug)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.templateId);
    let templateQuery = supabase.from('templates').select('*');
    const { data: dbTemplate } = isUuid
      ? await templateQuery.eq('id', input.templateId).single()
      : await templateQuery.eq('slug', input.templateId).single();

    // Fallback template definition for robustness
    const fallbackTemplate = {
      id: input.templateId,
      title: input.templateId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: input.templateId,
      coin_cost: NIMO_CONFIG.economy.defaultImageCost,
      aspect_ratio: '9:16',
      prompt_config: {
        prompt: 'Create a stunning glamorous portrait preserving facial structure of <IMAGE_0>, radiant glow, cinematic lighting, ultra-high resolution',
      },
    };

    const template = dbTemplate || fallbackTemplate;
    const coinCost = template.coin_cost || NIMO_CONFIG.economy.defaultImageCost;

    // 2. Check for existing job with same idempotency key (prevent duplicate charge)
    const { data: existingJob } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('user_id', input.userId)
      .eq('idempotency_key', input.idempotencyKey)
      .single();

    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
        coinCost: existingJob.coin_cost,
        reservedCoins: existingJob.reserved_coins,
      };
    }

    // 3. Atomically reserve coins
    const tempJobId = crypto.randomUUID();
    const reserveResult = await WalletService.reserveCoins(
      input.userId,
      coinCost,
      tempJobId,
      input.idempotencyKey
    );

    if (!reserveResult.success) {
      throw new Error(reserveResult.error || 'Insufficient coin balance');
    }

    // 4. Construct prompt from template configuration
    const promptConfig = template.prompt_config || {};
    let prompt = promptConfig.prompt || `Create a stylish portrait preserving facial identity of <IMAGE_0>`;
    
    // 5. Create job in database
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        id: tempJobId,
        user_id: input.userId,
        template_id: input.templateId,
        provider: 'kie-grok',
        generation_type: template.generation_type || 'image_edit',
        status: 'queued',
        stage: 'queued',
        coin_cost: coinCost,
        reserved_coins: coinCost,
        idempotency_key: input.idempotencyKey,
        input_metadata: {
          photoUrls: input.photoUrls,
          templateSlug: template.slug,
          templateTitle: template.title,
          aspectRatio: input.aspectRatio || template.aspect_ratio || '9:16',
        },
      })
      .select('*')
      .single();

    if (jobError || !job) {
      // Refund if job insertion failed
      await WalletService.refundCoins(input.userId, coinCost, tempJobId, 'Database job creation error');
      throw new Error('Failed to create generation job record');
    }

    // 6. Submit task to AI Provider (asynchronously or synchronously)
    try {
      const provider = getImageProvider();
      const aiResponse = await provider.generate({
        prompt,
        referenceImages: input.photoUrls,
        aspectRatio: (input.aspectRatio || template.aspect_ratio || '9:16') as any,
        quality: 'high',
      });

      if (aiResponse.status === 'failed') {
        // Mark failed and refund
        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            stage: 'failed',
            error_message: aiResponse.error || 'Provider rejected task',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        await WalletService.refundCoins(input.userId, coinCost, job.id, aiResponse.error || 'Provider rejected');
        throw new Error(aiResponse.error || 'AI generation service failed to accept job');
      }

      // Update with provider task ID
      await supabase
        .from('generation_jobs')
        .update({
          provider_request_id: aiResponse.providerRequestId,
          status: aiResponse.status === 'completed' ? 'completed' : 'processing',
          stage: aiResponse.status === 'completed' ? 'complete' : 'applying_ai_magic',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // If provider completed immediately (e.g. sync output)
      if (aiResponse.status === 'completed' && aiResponse.outputUrl) {
        await this.handleJobCompletion(job.id, input.userId, input.templateId, aiResponse.outputUrl, coinCost);
      }

      return {
        jobId: job.id,
        status: aiResponse.status === 'completed' ? 'completed' : 'processing',
        coinCost,
        reservedCoins: coinCost,
      };
    } catch (err: any) {
      await WalletService.refundCoins(input.userId, coinCost, job.id, err.message || 'Generation submission error');
      throw err;
    }
  }

  /**
   * Poll and synchronize job state with AI provider
   */
  static async getJobStatus(jobId: string, userId: string) {
    const supabase = getNimoServiceClient();

    const { data: job, error } = await supabase
      .from('generation_jobs')
      .select('*, templates(title, thumbnail_url)')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      throw new Error('Generation job not found');
    }

    // If already terminal, return existing state
    if (job.status === 'completed') {
      const { data: media } = await supabase
        .from('generated_media')
        .select('*')
        .eq('job_id', jobId)
        .single();

      return {
        jobId: job.id,
        status: 'completed',
        stage: 'complete',
        result: media ? {
          mediaId: media.id,
          imageUrl: media.storage_path,
        } : null,
        error: null,
      };
    }

    if (job.status === 'failed' || job.status === 'cancelled') {
      return {
        jobId: job.id,
        status: job.status,
        stage: 'failed',
        result: null,
        error: job.error_message || 'Generation failed',
      };
    }

    // If waiting or processing, poll provider
    if (job.provider_request_id) {
      const provider = getImageProvider();
      const statusResult = await provider.getStatus(job.provider_request_id);

      if (statusResult.status === 'completed' && statusResult.outputUrl) {
        await this.handleJobCompletion(
          job.id,
          job.user_id,
          job.template_id,
          statusResult.outputUrl,
          job.coin_cost
        );

        return {
          jobId: job.id,
          status: 'completed',
          stage: 'complete',
          result: {
            imageUrl: statusResult.outputUrl,
          },
          error: null,
        };
      }

      if (statusResult.status === 'failed') {
        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            stage: 'failed',
            error_message: statusResult.error || 'Provider execution failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        await WalletService.refundCoins(job.user_id, job.coin_cost, job.id, statusResult.error || 'Provider execution failed');

        return {
          jobId: job.id,
          status: 'failed',
          stage: 'failed',
          result: null,
          error: statusResult.error || 'AI generation failed',
        };
      }

      // Still in progress
      return {
        jobId: job.id,
        status: statusResult.status,
        stage: statusResult.stage || 'applying_ai_magic',
        progressPercent: statusResult.progressPercent || 50,
        result: null,
        error: null,
      };
    }

    return {
      jobId: job.id,
      status: job.status,
      stage: job.stage || 'queued',
      result: null,
      error: null,
    };
  }

  /**
   * Finalize job, store generated media, and capture reserved coins
   */
  private static async handleJobCompletion(
    jobId: string,
    userId: string,
    templateId: string,
    outputUrl: string,
    coinCost: number
  ) {
    const supabase = getNimoServiceClient();

    // 1. Insert generated media record
    const { data: media } = await supabase
      .from('generated_media')
      .insert({
        user_id: userId,
        job_id: jobId,
        template_id: templateId,
        media_type: 'image',
        storage_path: outputUrl,
        thumbnail_path: outputUrl,
        mime_type: 'image/jpeg',
      })
      .select('*')
      .single();

    // 2. Mark job completed
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        stage: 'complete',
        completed_at: new Date().toISOString(),
        output_metadata: {
          mediaId: media?.id,
          outputUrl,
        },
      })
      .eq('id', jobId);

    // 3. Atomically capture reserved coins
    await WalletService.captureCoins(userId, coinCost, jobId);
  }
}
