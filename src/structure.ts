export interface RemoteSessionParams {
  SessionLoginCap: {
    sessionID: string,
    challenge: string,
    iterations: string,
    isIrreversible: string,
    salt: string
  }
}

export interface SessionParams {
  sessionID: string,
  challenge: string,
  iterations: number,
  isIrreversible: boolean,
  salt: string
}

export interface RemoteLoginResult {
  SessionUserCheck?: {
    statusValue: string,
    statusString: string,
    isDefaultPassword: string,
    isRiskPassword: string,
    isActivated: string,
    sessionID: string
  },
  SessionLogin?: {
    statusValue: string,
    statusString: string,
    sessionID: string
  }
}

export interface RemoteChanelResult {
  InputProxyChannelList: {
    InputProxyChannel: {
      id: string,
      name: string,
      sourceInputPortDescriptor: {
        proxyProtocol: string,
        addressingFormatType: string,
        ipAddress: string,
        managePortNo: string,
        srcInputPort: string,
        userName: string,
        streamType: string,
        deviceID: string
      }
      enableAnr: string,
      enableTiming: string
    }[]
  }
}

export interface RemoteDeviceInfo {
  DeviceInfo: {
    deviceName: string
    deviceID: string
    model: string
    serialNumber: string
    macAddress: string
    firmwareVersion: string
    firmwareReleasedDate: string
    encoderVersion: string
    encoderReleasedDate: string
    deviceType: string
    telecontrolID: string
  }
}

export interface RemoteTimeStatus {
  Time: {
    timeMode: 'NTP' | 'manual',
    localTime: string,
    timeZone: string
  }
}

export interface RemoteSSHStatus {
  SSH: {
    enabled: 'true' | 'false'
  }
}

export interface NvrResponse {
  ResponseStatus: {
    requestURL: string
    statusCode: string
    statusString: string
    subStatusCode: string
  }
}

export interface RemoteSearchDevice {
  id: string,
  proxyProtocol: string,
  addressingFormatType: string,
  ipAddress: string,
  subnetMask: string,
  serialNumber: string,
  macAddress: string,
  firmwareVersion: string,
  managePortNo: string,
  userName: string,
  password: string,
  srcInputPortNums: string,
  deviceID: string,
  activated: string
}

export interface RemoteSearchResult {
  VideoSourceList: {
    VideoSourceDescriptor?: RemoteSearchDevice | RemoteSearchDevice[]
  }
}
