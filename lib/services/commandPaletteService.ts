export interface CommandPaletteAction {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Theme' | 'AI Brain' | 'Catalog';
  shortcut?: string;
  iconName?: string;
  perform: () => void;
}

export class CommandPaletteService {
  private static actions: CommandPaletteAction[] = [];

  static registerAction(action: CommandPaletteAction): void {
    this.actions.push(action);
  }

  static getActions(): CommandPaletteAction[] {
    return this.actions;
  }

  static searchActions(query: string): CommandPaletteAction[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.actions;

    return this.actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }
}
