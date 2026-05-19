import type { CommandContribution } from './types'

class CommandRegistryImpl {
  private readonly commands = new Map<string, CommandContribution>()

  register(cmd: CommandContribution): void {
    this.commands.set(cmd.id, cmd)
  }

  unregister(id: string): void {
    this.commands.delete(id)
  }

  get(id: string): CommandContribution | undefined {
    return this.commands.get(id)
  }

  list(): CommandContribution[] {
    return [...this.commands.values()]
  }

  clear(): void {
    this.commands.clear()
  }
}

export const commandRegistry = new CommandRegistryImpl()
