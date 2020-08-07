import axios, { AxiosInstance } from 'axios';
import { Channel, DeviceInfo, SessionParams, TimeStatus } from './structure/local';
import {
  NvrResponse,
  RemoteChannelResult, RemoteDeviceInfo, RemoteLoginResult, RemoteSearchResult, RemoteSessionParams,
  RemoteSSHStatus,
  RemoteTimeStatus, SecurityVersion
} from './structure/remote';
import { LTR, RTL } from './structure/transform';
import { formatDate } from './utils/Common';
import { sha256 } from './utils/Sha256';
import { XmlHandler } from './utils/XmlHandler';

export interface NvrConfig {
  ip: string
  port?: number
  user: string
  password: string
  timeout?: number
  proxy?: string
  wsPort?: number
  version?: number
}

export class Nvr {
  private readonly ip: string = '192.168.1.64';
  private readonly port: number = 80;
  private readonly user: string = 'admin';
  private readonly password: string;
  private session: string = '';
  private request: AxiosInstance;
  private readonly useProxy: boolean = false;
  private readonly wsPort: number = 7681;
  public readonly version: number = 1;

  private get url(): string {
    return `http://${this.ip}:${this.port}`;
  }

  private get headers() {
    return this.useProxy
      ? {
        proxy: this.url,
        session: this.session
      }
      : {
        Cookie: this.version === 2 ? this.session : `WebSession=${this.session}`
      };
  }

  constructor(config: NvrConfig) {
    this.ip = config.ip;
    this.port = config.port || this.port;
    this.user = config.user;
    this.password = config.password;
    this.useProxy = !!config.proxy;
    this.wsPort = config.wsPort || 7681;
    if (config.version) {
      this.version = config.version;
    }

    this.request = axios.create({
      baseURL: config.proxy || this.url,
      timeout: config.timeout || 10000
    });
  }

  public get websocketUrl(): string {
    return `ws://${this.ip}:${this.wsPort}/?version=1.0&cipherSuites=1&sessionID=${this.session}`;
  }

  public getPlayCommand(channelId: number): string {
    return JSON.stringify({
      sequence: 0,
      cmd: 'realplay',
      live: `live://${this.ip}:${this.wsPort}/${32 + channelId}/1`
    });
  }

  public getSession(): string {
    return this.session;
  }

  private async getSessionParams(): Promise<SessionParams> {
    const response = await this.request.get(
      `/ISAPI/Security/sessionLogin/capabilities?username=${this.user}`, {
        headers: this.headers
      });
    const json = await XmlHandler.parser<RemoteSessionParams>(response.data);
    return RTL.sessionParams(json);
  }

  public async deviceInfo(): Promise<DeviceInfo> {
    const response = await this.request.get('ISAPI/System/deviceInfo', {
      headers: this.headers
    });
    const info = await XmlHandler.parser<RemoteDeviceInfo>(response.data);
    return RTL.deviceInfo(info);
  }

  public async updateDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
    const response = await this.request.put('ISAPI/System/deviceInfo',
      XmlHandler.build(LTR.deviceInfo(deviceInfo)),
      {
        headers: this.headers
      });
    await XmlHandler.parser<void>(response.data);
  }

  public async searchDevice(): Promise<RemoteSearchResult> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/search', {
      headers: this.headers
    });
    return await XmlHandler.parser<RemoteSearchResult>(response.data);
  }

  public async getTime(): Promise<TimeStatus> {
    const response = await this.request.get('ISAPI/System/time', {
      headers: this.headers
    });
    const json = await XmlHandler.parser<RemoteTimeStatus>(response.data);
    return RTL.timeStatus(json);
  }

  public async setTime(timeStatus: TimeStatus) {
    /*
     <timeMode>manual</timeMode>
     <localTime>2020-08-03T18:04:24+08:00</localTime>
     <timeZone>CST-8:00:00</timeZone>
     */
    const result = await this.request.put(`/ISAPI/System/time`,
      XmlHandler.build({
        Time: {
          timeMode: 'manual',
          localTime: formatDate(timeStatus.time, 'yyyy-MM-ddThh:mm:ss'),
          timeZone: 'CST-8:00:00'
        }
      }),
      {
        headers: this.headers
      });
  }

  public async getSSHStatus(): Promise<boolean> {
    const response = await this.request.get('/ISAPI/System/Network/ssh', {
      headers: this.headers
    });
    const json = await XmlHandler.parser<RemoteSSHStatus>(response.data);
    return json.SSH.enabled === 'true';
  }

  public async setSSHStatus(enable: boolean): Promise<boolean> {
    const response = await this.request.put('/ISAPI/System/Network/ssh',
      XmlHandler.build({
        SSH: {
          enabled: enable.toString()
        }
      }),
      {
        headers: this.headers
      });
    const json = await XmlHandler.parser<NvrResponse>(response.data);
    return json.ResponseStatus.statusString === 'OK';
  }

  public async zoom(channelId: number, param: number) {
    const result = await this.request.put(`/ISAPI/ContentMgmt/PTZCtrlProxy/channels/${channelId}/continuous`,
      XmlHandler.build({
        PTZData: {
          zoom: param
        }
      }), {
        headers: this.headers
      });
  }

  public async iris(channelId: number, param: number) {
    const result = await this.request.put(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}/video/iris`,
      XmlHandler.build({
        IrisData: {
          iris: param
        }
      }), {
        headers: this.headers
      });
  }

  public async focus(channelId: number, param: number) {
    const result = await this.request.put(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}/video/focus`,
      XmlHandler.build({
        FocusData: {
          focus: param
        }
      }), {
        headers: this.headers
      });
  }

  public async autoPan(channelId: number, param: number) {
    const result = await this.request.put(`ISAPI/ContentMgmt/PTZCtrlProxy/channels/${channelId}/autoPan`,
      XmlHandler.build({
        autoPanData: {
          autoPan: param
        }
      }), {
        headers: this.headers
      });
  }

  public async direction(channelId: number, horizontal: number, vertical: number) {
    const result = await this.request.put(`/ISAPI/ContentMgmt/PTZCtrlProxy/channels/${channelId}/continuous`,
      XmlHandler.build({
        PTZData: {
          pan: horizontal,
          tilt: vertical
        }
      }), {
        headers: this.headers
      });
  }

  public async connect(): Promise<void> {
    const params: SessionParams = await this.getSessionParams();
    const p = this.encodePassword(params);
    const response = await this.request.post(`/ISAPI/Security/sessionLogin?timeStamp=${Date.now()}`,
      XmlHandler.build({
        SessionLogin: {
          userName: this.user,
          password: p,
          sessionID: params.sessionId,
          isSessionIDValidLongTerm: false,
          sessionIDVersion: 2
        }
      }),
      {
        headers: this.headers
      });
    if (this.version === 1) {
      const json = await XmlHandler.parser<RemoteLoginResult>(response.data);
      const wrap = json.SessionUserCheck || json.SessionLogin;
      this.session = wrap ? wrap.sessionID : '';
    } else {
      this.session = response.headers['set-cookie'][0] || '';
    }
  }

  public async fetchChannels(): Promise<Channel[]> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/channels', {
      headers: this.headers
    });
    const channels = await XmlHandler.parser<RemoteChannelResult>(response.data);
    return RTL.fetchChannels(channels);
  }

  public async addChannel(data: { ip: string, userName: string, password: string, port?: number, protocol: string }) {
    const response = await this.request.post('/ISAPI/ContentMgmt/InputProxy/channels',
      XmlHandler.build({
        InputProxyChannel: {
          id: 0,
          quickAdd: false,
          sourceInputPortDescriptor: {
            ipAddress: data.ip,
            managePortNo: data.port || 8000,
            srcInputPort: 1,
            userName: data.userName,
            password: data.password,
            streamType: 'auto',
            addressingFormatType: 'ipaddress',
            proxyProtocol: data.protocol
          }
        }
      }),
      {
        headers: this.headers
      });
    const json = await XmlHandler.parser<any>(response.data);
  }

  public async deleteChannel(channelId: number): Promise<void>;
  public async deleteChannel(address: string): Promise<void>;

  public async deleteChannel(data: any) {
    let channelId: number = data;
    if (typeof data !== 'number') {
      const channels = await this.fetchChannels();
      const channel = channels.find(c => c.address === data);
      if (channel) {
        channelId = Number(channel.id);
      }
    }
    const result = await this.request.delete<NvrResponse>(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}`, {
      headers: this.headers
    });
  }

  public async getUsers() {
    const response = await this.request.get('/ISAPI/Security/users', {
      headers: this.headers
    });
    const users = await XmlHandler.parser(response.data);
  }

  public async getSecurityVersion(userName?: string) {
    const response = await this.request.get('/ISAPI/Security/capabilities', {
      headers: this.headers,
      params: {
        username: userName || this.user
      }
    });
    return await XmlHandler.parser<SecurityVersion>(response.data);
  }

  private encodePassword(session: SessionParams): string {
    let result: string;
    if (session.isIrreversible) {
      result = sha256(this.user + session.salt + this.password);
      result = sha256(result + session.challenge);
      for (let f = 2; f < session.iterations; f++) {
        result = sha256(result);
      }
    } else {
      result = sha256(this.password) + session.challenge;
      for (let f = 1; f < session.iterations; f++) {
        result = sha256(result);
      }
    }
    return result;
  }
}
