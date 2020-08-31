declare module 'hikvision-api' {
  export interface RecordStatus {
    day: Date
    hasRecord: boolean
    recordType?: string
  }

  export interface SecurityVersion {
    SecurityCap: {
      supportUserNums: string
      userBondIpNums: string
      userBondMacNums: string
      securityVersion: { '$': any },
      keyIterateNum: string,
      isSupportUserCheck: 'true' | 'false'
      isIrreversible: 'true' | 'false'
      salt: string
      isSupportGUIDFileDataExport: 'true' | 'false'
      isSupportSecurityQuestionConfig: 'true' | 'false'
      isSupportGetOnlineUserListSC: 'true' | 'false'
      SecurityLimits: {
        LoginPasswordLenLimit: any,
        SecurityAnswerLenLimit: any
      },
      RSAKeyLength: { '$': any },
      isSupportONVIFUserManagement: 'true' | 'false'
      WebCertificateCap: { CertificateType: any },
      isSupportConfigFileImport: 'true' | 'false'
      isSupportConfigFileExport: 'true' | 'false'
      cfgFileSecretKeyLenLimit: { '$': any },
      isSupportPictureURlCertificate: 'true' | 'false'
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

  export interface BaseConfig {
    ip: string;
    port?: number;
    user: string;
    password: string;
    timeout?: number;
    proxy?: string;
    version?: number;
    userPassword?: string;
  }

  export interface NvrConfig extends BaseConfig {
    wsPort?: number;
    wasmUrl?: string;
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

  export interface RecordStatus {
    day: Date
    hasRecord: boolean
    recordType?: string
  }

  export abstract class Base {
    readonly version: number;

    getSession(): string;

    deviceInfo(): Promise<DeviceInfo>;

    updateDeviceInfo(deviceInfo: DeviceInfo): Promise<void>;

    getTime(): Promise<TimeStatus>;

    setTime(timeStatus: TimeStatus): Promise<void>;

    addUser(user: User): Promise<void>;

    updateUser(user: User): Promise<void>;

    deleteUser(userId: number): Promise<void>;
    deleteUser(userName: string): Promise<void>;

    fetchUsers(): Promise<User[]>;

    getUsers(): Promise<void>;
  }

  export class Nvr extends Base {

    constructor(config: NvrConfig);

    getWebsocketUrl(): Promise<string>;

    getPlayCommand(channelId: number): string;

    searchDevice(): Promise<RemoteSearchResult>;

    getSSHStatus(): Promise<boolean>;

    setSSHStatus(enable: boolean): Promise<boolean>;

    zoom(channelId: number, param: number): Promise<void>;

    iris(channelId: number, param: number): Promise<void>;

    focus(channelId: number, param: number): Promise<void>;

    autoPan(channelId: number, param: number): Promise<void>;

    direction(channelId: number, horizontal: number, vertical: number): Promise<void>;

    connect(): Promise<void>;

    disconnect(): Promise<void>;

    fetchChannels(): Promise<Channel[]>;

    addChannel(data: {
      ip: string;
      userName: string;
      password: string;
      port?: number;
      protocol: string;
    }): Promise<void>;

    deleteChannel(channelId: number): Promise<void>;
    deleteChannel(address: string): Promise<void>;

    getSecurityVersion(userName?: string): Promise<SecurityVersion>;

    getStorages(): Promise<Storages>;

    formatHdd(id: string, progressListener?: (progress: number) => void): Promise<unknown>;

    getDailyRecordStatus(channelId: number, streamType: number, date?: Date): Promise<RecordStatus[]>;

    searchRecords(channelId: number, streamType: number, startTime: Date, endTime: Date, pageNo: number,
      pageSize: number): Promise<RecordSearchResult>;

    public getChannelConnect(): ChannelConnection;
  }


  export class ChannelConnection {
    public addEventListener(type: string, listener: Function);

    public hasEventListener(type: string, listener: Function);

    public removeEventListener(type: string, listener: Function);

    public dispatchEvent(event: { type: string, target?: any }): boolean;

    public startRealPlay(channelId: number);

    public init(): Promise<void>;
  }
}
