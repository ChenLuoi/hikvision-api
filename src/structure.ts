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
