import { globalActivityBus } from './globalActivity';
import { settingsEngine } from './settingsEngine';

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text_ar: string;
  text_en: string;
  timestamp: string;
  executedAction?: {
    actionType: 'navigate' | 'update_setting' | 'calculate_cost' | 'show_report' | 'ai_product_machine';
    payload?: Record<string, unknown>;
  };
}

export class BaherBrainAiService {
  static processUserCommand(prompt: string, _lang?: 'ar' | 'en'): AIChatMessage {
    const q = prompt.trim().toLowerCase();
    const isAr = _lang === 'ar' || !_lang;

    // 1. AI Product Machine Creation Command
    if (q.includes('أنشئ منتجات') || q.includes('صور') || q.includes('create products') || q.includes('images')) {
      globalActivityBus.logEvent({
        domain: 'ai_brain',
        actor_name: 'Baher Brain AI Machine',
        actor_role: 'AI Assistant',
        title_ar: isAr ? 'فتح آلة إنشاء المنتجات' : 'Opened AI Product Machine',
        title_en: 'Opened AI Product Machine',
        description_ar: `أمر المستخدم: "${prompt}"`,
        description_en: `User command: "${prompt}"`,
        severity: 'info',
      });
      return {
        id: `ai-msg-${Date.now()}`,
        sender: 'assistant',
        text_ar: 'تم فتح آلة Baher Brain AI Product Machine لبدء معالجة واستخراج بيانات المنتجات تلقائياً من الصور والملفات.',
        text_en: 'Opened Baher Brain AI Product Machine to process images and auto-generate catalog data.',
        timestamp: new Date().toISOString(),
        executedAction: { actionType: 'ai_product_machine', payload: { url: '/admin/catalog/ai-machine' } },
      };
    }

    // 2. Action: Navigation
    if (q.includes('طلب') || q.includes('order')) {
      globalActivityBus.logEvent({
        domain: 'ai_brain',
        actor_name: 'Baher Brain Conversational AI',
        actor_role: 'AI Assistant',
        title_ar: 'تنفيذ أمر ذكي: استعراض الطلبات',
        title_en: 'Executed AI Command: View Orders',
        description_ar: `قام المساعد بإظهار قائمة الطلبات للسطح بناءً على طلب: "${prompt}"`,
        description_en: `Executed natural language navigation command: "${prompt}"`,
        severity: 'info',
      });

      return {
        id: `ai-msg-${Date.now()}`,
        sender: 'assistant',
        text_ar: 'تم فتح قسم الطلبات والمعاملات بنجاح. يوجد حالياً 42 طلباً فعالاً.',
        text_en: 'Opened Orders & Transactions section. Currently 42 active orders.',
        timestamp: new Date().toISOString(),
        executedAction: { actionType: 'navigate', payload: { url: '/admin/orders' } },
      };
    }

    // 3. Action: Currency / Setting Update
    if (q.includes('عملة') || q.includes('currency') || q.includes('egp') || q.includes('usd')) {
      const targetCurrency = q.includes('usd') ? 'USD' : 'EGP';
      settingsEngine.updateSettings({ general: { ...settingsEngine.getSettings().general, primaryCurrency: targetCurrency } });

      return {
        id: `ai-msg-${Date.now()}`,
        sender: 'assistant',
        text_ar: `تم ضبط العملة الرئيسية للمنظومة بنجاح إلى [${targetCurrency}].`,
        text_en: `Successfully updated primary system currency to [${targetCurrency}].`,
        timestamp: new Date().toISOString(),
        executedAction: { actionType: 'update_setting', payload: { currency: targetCurrency } },
      };
    }

    // 4. Action: Product Creation / Catalog
    if (q.includes('منتج') || q.includes('product') || q.includes('خاتم') || q.includes('ring')) {
      return {
        id: `ai-msg-${Date.now()}`,
        sender: 'assistant',
        text_ar: 'أهلاً بك! يمكنك استخدام آلة Baher Brain AI Product Machine لإنشاء المنتجات آلياً بالذكاء الاصطناعي.',
        text_en: 'Welcome! You can use Baher Brain AI Product Machine to generate products automatically.',
        timestamp: new Date().toISOString(),
        executedAction: { actionType: 'ai_product_machine', payload: { url: '/admin/catalog/ai-machine' } },
      };
    }

    // Default Intelligence Response
    return {
      id: `ai-msg-${Date.now()}`,
      sender: 'assistant',
      text_ar: `تم تحليل الاستفسار: "${prompt}". أنا مساعد Baher Brain الذكي الجاهز لتنفيذ الأوامر والإجابة على أي استفسارات.`,
      text_en: `Processed query: "${prompt}". Baher Brain AI is ready to execute actions.`,
      timestamp: new Date().toISOString(),
    };
  }
}
