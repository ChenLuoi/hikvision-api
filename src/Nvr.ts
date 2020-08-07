import axios, { AxiosInstance } from 'axios';
import {
  NvrResponse,
  RemoteChanelResult, RemoteDeviceInfo, RemoteLoginResult, RemoteSearchDevice, RemoteSearchResult, RemoteSessionParams,
  RemoteSSHStatus,
  RemoteTimeStatus,
  SessionParams
} from './structure';
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
}

export class Nvr {
  private readonly ip: string;
  private readonly port: number = 80;
  private readonly user: string;
  private readonly password: string;
  private session: string = '';
  private request: AxiosInstance;
  private readonly useProxy: boolean = false;

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
        Cookie: `WebSession=${this.session}`
      };
  }

  constructor(config: NvrConfig) {
    this.ip = config.ip;
    this.port = config.port || this.port;
    this.user = config.user;
    this.password = config.password;
    this.useProxy = !!config.proxy;

    this.request = axios.create({
      baseURL: config.proxy || this.url,
      timeout: config.timeout || 10000
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
    const cap = json.SessionLoginCap;
    return {
      sessionID: cap.sessionID,
      challenge: cap.challenge,
      iterations: Number(cap.iterations),
      isIrreversible: cap.isIrreversible === 'true',
      salt: cap.salt || ''
    };
  }

  public async deviceInfo(): Promise<RemoteDeviceInfo> {
    const response = await this.request.get('ISAPI/System/deviceInfo', {
      headers: this.headers
    });
    return await XmlHandler.parser<RemoteDeviceInfo>(response.data);
  }

  public async updateDeviceInfo(deviceInfo: RemoteDeviceInfo): Promise<void> {
    const response = await this.request.put('ISAPI/System/deviceInfo',
      XmlHandler.build(deviceInfo),
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

  public async getTime(): Promise<RemoteTimeStatus> {
    const response = await this.request.get('ISAPI/System/time', {
      headers: this.headers
    });
    return XmlHandler.parser<RemoteTimeStatus>(response.data);
  }

  public async setTime(ip: string, session: string, date: Date) {
    const result = await this.request.put(`/ISAPI/System/time`,
      XmlHandler.build({
        Time: {
          timeMode: 'manual',
          localTime: formatDate(date, 'yyyy-MM-ddThh:mm:ss'),
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
    const params = await this.getSessionParams();
    const p = this.encodePassword(params);
    const response = await this.request.post('/ISAPI/Security/sessionLogin',
      `<SessionLogin><userName>${this.user}</userName><password>${p}</password><sessionID>${params.sessionID}</sessionID></SessionLogin>`,
      {
        headers: this.headers
      });
    const json = await XmlHandler.parser<RemoteLoginResult>(response.data);
    const wrap = json.SessionUserCheck || json.SessionLogin;
    this.session = wrap ? wrap.sessionID : '';
  }

  public async fetchChannels(): Promise<RemoteChanelResult> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/channels', {
      headers: this.headers
    });
    return XmlHandler.parser<RemoteChanelResult>(response.data);
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
  public async deleteChannel(ip: string): Promise<void>;

  public async deleteChannel(data: any) {
    let channelId: number = data;
    if (typeof data !== 'number') {
      const channels = (await this.fetchChannels()).InputProxyChannelList.InputProxyChannel;
      const channel = channels.find(c => c.sourceInputPortDescriptor.ipAddress === data);
      if (channel) {
        channelId = Number(channel.id);
      }
    }
    const result = await this.request.delete(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}`, {
      headers: this.headers
    });
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
