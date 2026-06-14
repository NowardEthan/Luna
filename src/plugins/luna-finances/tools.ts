import {
  registerAllFinancesTools,
  unregisterAllFinancesTools,
} from './registerFinancesTools'

export { TOOL_PREFIX } from './registerFinancesTools'

export function registerLunaFinancesTools(): void {
  registerAllFinancesTools()
}

export function unregisterLunaFinancesTools(): void {
  unregisterAllFinancesTools()
}
