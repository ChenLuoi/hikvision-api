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
  id: string,
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
  id: string
  userName: string
  type: 'Administrator' | 'Operator' | 'Viewer'
  password?: string
}
