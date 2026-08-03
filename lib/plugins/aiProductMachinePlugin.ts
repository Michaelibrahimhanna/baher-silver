import { pluginEngine } from './pluginEngine';

pluginEngine.registerPlugin({
  id: 'baher-brain-ai-product-machine',
  name: 'Baher Brain AI Product Machine',
  version: '2.0.0',
  description: 'AI-driven product creation intake queue, analysis pipeline, automated builder, formula pricing, and human review workflow.',
  enabled: true,
  author: 'Baher Brain Core AI Team',
  widgets: [
    {
      id: 'widget-ai-product-queue',
      title_ar: 'طابور معالجة الذكاء الاصطناعي (AI Intake Queue)',
      title_en: 'AI Product Intake Queue',
      size: 'md',
      order: 7,
      visible: true,
      category: 'ai',
    },
  ],
  commandActions: [
    {
      id: 'cmd-ai-product-machine',
      title: 'فتح آلة إنشاء المنتجات بالذكاء الاصطناعي (AI Product Machine)',
      category: 'AI Brain',
      perform: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/catalog/ai-machine';
        }
      },
    },
  ],
  hooks: {
    transform_ai_draft: (data: unknown) => {
      return data;
    },
  },
});

export function getAiProductMachinePluginStatus() {
  return pluginEngine.getPlugin('baher-brain-ai-product-machine');
}
