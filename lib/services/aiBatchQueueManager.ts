import { ProductIntakeJob, IntakeFileType, IntakeFileItem } from '@/types/aiProductMachine';

class AIBatchQueueManagerService {
  private jobs: Map<string, ProductIntakeJob> = new Map();

  constructor() {
    // Initial Seed Job
    const seedJob: ProductIntakeJob = {
      id: 'job-production-101',
      batchName: 'شحنة خان الخليلي للفضيات - 50 قطعة',
      batchSize: 50,
      files: [
        {
          id: 'f-1',
          fileName: 'pharaoh-ring-1.jpg',
          fileSize: 2100000,
          fileType: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
          status: 'completed',
          uploadedAt: new Date().toISOString(),
        },
        {
          id: 'f-2',
          fileName: 'batch-manifest.xlsx',
          fileSize: 45000,
          fileType: 'excel',
          status: 'completed',
          uploadedAt: new Date().toISOString(),
        },
      ],
      status: 'ready_for_review',
      progressPercent: 100,
      created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    };
    this.jobs.set(seedJob.id, seedJob);
  }

  createBatchJob(batchName: string, batchSize: number, rawFiles: { name: string; size: number; type: IntakeFileType; url?: string }[]): ProductIntakeJob {
    const fileItems: IntakeFileItem[] = rawFiles.map((f, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      fileName: f.name,
      fileSize: f.size,
      fileType: f.type,
      previewUrl: f.url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
      status: 'queued',
      uploadedAt: new Date().toISOString(),
    }));

    const job: ProductIntakeJob = {
      id: `job-${Date.now()}`,
      batchName,
      batchSize: Math.max(batchSize, fileItems.length),
      files: fileItems,
      status: 'processing',
      progressPercent: 15,
      created_at: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  getJobs(): ProductIntakeJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(id: string): ProductIntakeJob | undefined {
    return this.jobs.get(id);
  }

  pauseJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job && job.status === 'processing') {
      job.status = 'paused';
      job.paused_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  resumeJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job && job.status === 'paused') {
      job.status = 'processing';
      return true;
    }
    return false;
  }

  retryJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'processing';
      job.progressPercent = 10;
      return true;
    }
    return false;
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'rejected';
      return true;
    }
    return false;
  }
}

export const aiBatchQueueManager = new AIBatchQueueManagerService();
