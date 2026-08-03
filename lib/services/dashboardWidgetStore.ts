export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';

export interface DashboardWidgetConfig {
  id: string;
  title_ar: string;
  title_en: string;
  size: WidgetSize;
  order: number;
  visible: boolean;
  category: 'kpi' | 'charts' | 'orders' | 'ai' | 'silver_spot';
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'widget-revenue', title_ar: 'المبيعات والأرباح المحسوبة', title_en: 'Calculated Revenue', size: 'sm', order: 1, visible: true, category: 'kpi' },
  { id: 'widget-orders-count', title_ar: 'إجمالي الطلبات الفعالة', title_en: 'Total DB Orders', size: 'sm', order: 2, visible: true, category: 'kpi' },
  { id: 'widget-silver-spot', title_ar: 'بورصة الفضة المباشرة', title_en: 'Live Silver Spot Price', size: 'sm', order: 3, visible: true, category: 'silver_spot' },
  { id: 'widget-conversion', title_ar: 'معدل التحويل بالمتجر', title_en: 'Conversion Rate', size: 'sm', order: 4, visible: true, category: 'kpi' },
  { id: 'widget-ai-brain-card', title_ar: 'توصيات Baher Brain AI', title_en: 'Baher Brain AI Insights', size: 'md', order: 5, visible: true, category: 'ai' },
  { id: 'widget-recent-orders-table', title_ar: 'جدول أحدث الطلبات', title_en: 'Recent Orders Table', size: 'full', order: 6, visible: true, category: 'orders' },
];

export function getSavedDashboardWidgets(): DashboardWidgetConfig[] {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_WIDGETS;

  try {
    const json = localStorage.getItem('baher_silver_dashboard_widgets');
    if (json) {
      return JSON.parse(json);
    }
  } catch {
    // Ignored
  }

  return DEFAULT_DASHBOARD_WIDGETS;
}

export function saveDashboardWidgets(widgets: DashboardWidgetConfig[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('baher_silver_dashboard_widgets', JSON.stringify(widgets));
  } catch {
    // Ignored
  }
}
