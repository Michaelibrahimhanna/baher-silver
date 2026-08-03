import { ProductIntakeJob, IntakeFileItem, IntakeFileType } from '@/types/aiProductMachine';

class AIProductIntakeQueueService {
  private jobs: ProductIntakeJob[] = [
    {
      id: 'job-101',
      batchName: 'دفعة خواتم الفضة الفرعونية - Khan El Khalili Batch',
      batchSize: 10,
      files: [
        {
          id: 'file-1',
          fileName: 'pharaoh-ring-front.jpg',
          fileSize: 2450000,
          fileType: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
          status: 'completed',
          uploadedAt: new Date().toISOString(),
        },
        {
          id: 'file-2',
          fileName: 'batch-specs-manifest.csv',
          fileSize: 12000,
          fileType: 'csv',
          status: 'completed',
          uploadedAt: new Date().toISOString(),
        },
      ],
      status: 'ready_for_review',
      progressPercent: 100,
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ];

  getJobs(): ProductIntakeJob[] {
    return this.jobs;
  }

  getJobById(id: string): ProductIntakeJob | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  createIntakeJob(batchName: string, rawFiles: { name: string; size: number; type: IntakeFileType; url?: string }[]): ProductIntakeJob {
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
      batchSize: fileItems.length,
      files: fileItems,
      status: 'queued',
      progressPercent: 15,
      created_at: new Date().toISOString(),
    };

    this.jobs = [job, ...this.jobs];
    return job;
  }
}

export const aiProductIntakeQueue = new AIProductIntakeQueueService();
