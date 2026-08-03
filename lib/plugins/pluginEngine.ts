import { DashboardWidgetConfig } from '../services/dashboardWidgetStore';
import { CommandPaletteAction } from '../services/commandPaletteService';
import { QRDestinationType } from '@/types/catalog';

export interface BaherPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  author?: string;
  hooks?: Record<string, (data: unknown) => unknown>;
  widgets?: DashboardWidgetConfig[];
  commandActions?: CommandPaletteAction[];
  qrDestinations?: {
    type: QRDestinationType;
    label_ar: string;
    label_en: string;
    handler: (token: string) => string;
  }[];
}

class PluginRegistry {
  private plugins: Map<string, BaherPlugin> = new Map();

  registerPlugin(plugin: BaherPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  getPlugin(id: string): BaherPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): BaherPlugin[] {
    return Array.from(this.plugins.values());
  }

  enablePlugin(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = true;
      return true;
    }
    return false;
  }

  disablePlugin(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
      return true;
    }
    return false;
  }

  executeHook<T = unknown>(hookName: string, initialData: T): T {
    let result = initialData;
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.hooks && plugin.hooks[hookName]) {
        try {
          result = plugin.hooks[hookName](result) as T;
        } catch (err) {
          console.error(`Plugin [${plugin.id}] error in hook [${hookName}]:`, err);
        }
      }
    }
    return result;
  }

  getPluginWidgets(): DashboardWidgetConfig[] {
    const widgets: DashboardWidgetConfig[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.widgets) {
        widgets.push(...plugin.widgets);
      }
    }
    return widgets;
  }

  getPluginCommandActions(): CommandPaletteAction[] {
    const actions: CommandPaletteAction[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.commandActions) {
        actions.push(...plugin.commandActions);
      }
    }
    return actions;
  }
}

export const pluginEngine = new PluginRegistry();

// Default Pre-installed Enterprise Plugins
pluginEngine.registerPlugin({
  id: 'silver-spot-live-ticker',
  name: 'Live Silver Spot Price Polling Plugin',
  version: '1.0.0',
  description: 'Polls international silver spot market rates and updates formula costing.',
  enabled: true,
  author: 'Baher Silver Core Team',
});

pluginEngine.registerPlugin({
  id: 'whatsapp-meta-cloud-messaging',
  name: 'Meta WhatsApp Cloud API Integration Plugin',
  version: '1.2.0',
  description: 'Dispatches real-time WhatsApp order tracking updates to Egyptian customers.',
  enabled: true,
  author: 'Baher Silver Core Team',
});
