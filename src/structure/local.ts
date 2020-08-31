export interface SessionParams {
  sessionId: string
  challenge: string
  iterations: number
  isIrreversible: boolean
  salt: string
}

export interface DeviceInfo {
  name: string
  id: string
  model: string
  serialNo: string
  mac: string
  firmwareVersion: string
  firmwareReleaseDate: string
  encoderVersion: string
  encoderReleaseDate: string
  deviceType: string
  code: string
}

export interface Channel {
  id: number,
  name: string
  addressType: string
  address: string
  protocol: string
  managePort: number
  inputPort: number
  userName: string
  streamType: string
  deviceId: string
  enableAnr: boolean
  enableTiming: boolean
}

export interface TimeStatus {
  mode: 'NTP' | 'manual'
  time: Date
  timeZoneOffset: number
}

export interface User {
  id: number
  userName: string
  type: 'Administrator' | 'Operator' | 'Viewer'
  password?: string
}

export interface Hdd {
  id: string
  name: string
  path: string
  type: string
  status: string
  capacity: number
  freeSpace: number
  property: string
}

export interface Nas {
  id: string
  addressingFormatType: string
  ipAddress: string
  port: number
  type: string
  path: string
  status: string
  capacity: number
  freeSpace: number
  property: string
}

export interface Storages {
  hdd: Hdd[]
  nas: Nas[]
  mode: string
}

export interface RecordStatus {
  day: Date
  hasRecord: boolean
  recordType?: string
}

export interface RecordItem {
  startTime: Date
  endDate: Date
  sourceId: string
  trackId: string
  playbackUrl: string
}

export interface RecordSearchResult {
  total: number
  list: RecordItem[]
}
