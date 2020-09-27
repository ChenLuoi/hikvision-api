export interface RemoteSessionParams {
  SessionLoginCap: {
    sessionID: string,
    challenge: string,
    iterations: number,
    isIrreversible: boolean,
    salt: string
  }
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

export interface RemoteChannel {
  id: number,
  name: string,
  sourceInputPortDescriptor: {
    proxyProtocol: string,
    addressingFormatType: string,
    ipAddress: string,
    managePortNo: number,
    srcInputPort: number,
    userName: string,
    streamType: string,
    deviceID: string
  }
  enableAnr: boolean,
  enableTiming: boolean
}

export interface RemoteChannelResult {
  InputProxyChannelList: {
    InputProxyChannel?: RemoteChannel | RemoteChannel[]
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
    enabled: boolean
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

export interface RemoteUser {
  id: number
  userName: string
  userLevel: 'Administrator' | 'Operator' | 'Viewer'
  bondIpAddressList: {
    bondIpAddress: {
      id: string
      ipAddress: string
      ipv6Address: string
    }
  },
  bondMacAddressList: {
    bondMacAddress: {
      id: string
      macAddress: string
    }
  },
  attribute: {
    inherent: boolean
  }
}

export interface RemoteUserList {
  UserList: {
    User: RemoteUser | RemoteUser[]
  }
}

export interface SecurityVersion {
  SecurityCap: {
    supportUserNums: string
    userBondIpNums: string
    userBondMacNums: string
    securityVersion: { '$': any },
    keyIterateNum: string,
    isSupportUserCheck: boolean
    isIrreversible: boolean
    salt: string
    isSupportGUIDFileDataExport: boolean
    isSupportSecurityQuestionConfig: boolean
    isSupportGetOnlineUserListSC: boolean
    SecurityLimits: {
      LoginPasswordLenLimit: any,
      SecurityAnswerLenLimit: any
    },
    RSAKeyLength: { '$': any },
    isSupportONVIFUserManagement: boolean
    WebCertificateCap: { CertificateType: any },
    isSupportConfigFileImport: boolean
    isSupportConfigFileExport: boolean
    cfgFileSecretKeyLenLimit: { '$': any },
    isSupportPictureURlCertificate: boolean
  }
}

export interface RemoteHdd {
  id: string
  hddName: string
  hddPath: string
  hddType: string
  status: 'ok' | 'error'
  capacity: string
  freeSpace: string
  property: string
}

export interface RemoteNas {
  id: string
  addressingFormatType: string
  ipAddress: string
  portNo: number
  nasType: string
  path: string
  status: string
  capacity: string
  freeSpace: string
  property: string
}

export interface RemoteStorageList {
  storage: {
    hddList: {
      hdd?: RemoteHdd | RemoteHdd[],
    }
    nasList: {
      nas?: RemoteNas | RemoteNas[]
    }
    workMode: string
  }
}

export interface RemoteFormatStatus {
  formatStatus: {
    formating: boolean
    percent: string // number
  }
}

export interface RemoteDailyRecordStatus {
  trackDailyDistribution: {
    dayList: {
      day: {
        id: string
        dayOfMonth: string
        record: boolean
        recordType?: 'time'
      }[]
    }
  }
}

export interface RemoteSearchRecordItem {
  sourceID: string
  trackID: string
  timeSpan: {
    startTime: string
    endTime: string
  },
  mediaSegmentDescriptor: {
    contentType: string
    codecType: string
    playbackURI: string
  }
}

export interface RemoteRecordSearchResult {
  CMSearchResult: {
    searchID: string
    responseStatus: boolean
    responseStatusStrg: 'OK' | 'NO MATCHES' | 'MORE'
    numOfMatches: number
    matchList?: {
      searchMatchItem: RemoteSearchRecordItem | RemoteSearchRecordItem[]
    }
  }
}

export interface RemoteChannelStatus {
  id: number
  sourceInputPortDescriptor: {
    proxyProtocol: string
    addressingFormatType: string
    ipAddress: string
    managePortNo: number
    srcInputPort: number
    userName: string
    streamType: string
  }
  online: boolean
  SecurityStatus: {
    PasswordStatus: 'weak' | 'risk'
  }
}

export interface RemoteChannelStatusResult {
  InputProxyChannelStatusList: {
    InputProxyChannelStatus: RemoteChannelStatus | RemoteChannelStatus[]
  }
}
