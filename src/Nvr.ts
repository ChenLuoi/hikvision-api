import { sha256 } from './utils/Sha256';
import {
  RemoteChanelResult, RemoteLoginResult, RemoteSessionParams, SessionParams
} from './structure';
import { XmlHandler } from './utils/XmlHandler';
import axios, { AxiosInstance } from 'axios';

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

  private get header() {
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
        headers: this.header
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

  public async connect(): Promise<void> {
    const params = await this.getSessionParams();
    const p = this.encodePassword(params);
    const response = await this.request.post('/ISAPI/Security/sessionLogin',
      `<SessionLogin><userName>${this.user}</userName><password>${p}</password><sessionID>${params.sessionID}</sessionID></SessionLogin>`,
      {
        headers: {
          proxy: this.url
        }
      });
    const json = await XmlHandler.parser<RemoteLoginResult>(response.data);
    const wrap = json.SessionUserCheck || json.SessionLogin;
    this.session = wrap ? wrap.sessionID : '';
  }

  public async fetchChannels(): Promise<RemoteChanelResult> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/channels', {
      headers: this.header
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
        headers: this.header
      });
    const json = await XmlHandler.parser<any>(response.data);
  }

  public async deleteChannel(channelId: number): Promise<void>;
  public async deleteChannel(ip: string): Promise<void>;

  public async deleteChannel(data: any) {
    let channelId = data;
    if (typeof data !== 'number') {
      const channels = (await this.fetchChannels()).InputProxyChannelList.InputProxyChannel;
      const channel = channels.find(c => c.sourceInputPortDescriptor.ipAddress === data);
      if (channel) {
        channelId = channel.id;
      }
    }
    const result = await this.request.delete(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}`, {
      headers: this.header
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
