export type WorkerActivateMessage = {
  type: 'activate'
  pluginId: string
  entryUrl: string
  permissions: string[]
  settings: Record<string, unknown>
}

export type WorkerDeactivateMessage = { type: 'deactivate' }

export type WorkerToolCallMessage = {
  type: 'toolCall'
  callId: string
  name: string
  args: Record<string, unknown>
}

export type WorkerEventMessage = {
  type: 'event'
  event: string
  payload: unknown
}

export type WorkerStorageGetResponse = {
  type: 'storageGetResult'
  callId: string
  value: string | null
}

export type WorkerStorageSetResponse = {
  type: 'storageSetResult'
  callId: string
  ok: boolean
}

export type WorkerReadSettingResponse = {
  type: 'readSettingResult'
  callId: string
  value: unknown
}

export type HostToWorkerMessage =
  | WorkerActivateMessage
  | WorkerDeactivateMessage
  | WorkerToolCallMessage
  | WorkerEventMessage
  | WorkerStorageGetResponse
  | WorkerStorageSetResponse
  | WorkerReadSettingResponse

export type WorkerRegisterToolMessage = {
  type: 'registerTool'
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

export type WorkerSubscribeMessage = {
  type: 'subscribe'
  event: string
}

export type WorkerStorageGetMessage = {
  type: 'storageGet'
  callId: string
  key: string
}

export type WorkerStorageSetMessage = {
  type: 'storageSet'
  callId: string
  key: string
  value: string
}

export type WorkerReadSettingMessage = {
  type: 'readSetting'
  callId: string
  key: string
}

export type WorkerWriteSettingMessage = {
  type: 'writeSetting'
  key: string
  value: unknown
}

export type WorkerToolResultMessage = {
  type: 'toolResult'
  callId: string
  ok: boolean
  content: string
}

export type WorkerReadyMessage = { type: 'ready' }

export type WorkerErrorMessage = {
  type: 'error'
  message: string
}

export type WorkerUnsupportedMessage = {
  type: 'unsupported'
  action: string
}

export type WorkerToHostMessage =
  | WorkerReadyMessage
  | WorkerErrorMessage
  | WorkerRegisterToolMessage
  | WorkerSubscribeMessage
  | WorkerStorageGetMessage
  | WorkerStorageSetMessage
  | WorkerReadSettingMessage
  | WorkerWriteSettingMessage
  | WorkerToolResultMessage
  | WorkerUnsupportedMessage
