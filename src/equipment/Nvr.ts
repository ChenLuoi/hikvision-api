import { Channel, ChannelStatus, RecordItem, RecordSearchResult, RecordStatus, Storages } from '../structure/local';
import {
  NvrResponse, RemoteChannelResult, RemoteChannelStatusResult, RemoteDailyRecordStatus, RemoteFormatStatus,
  RemoteLoginResult,
  RemoteRecordSearchResult, RemoteSearchResult,
  RemoteSSHStatus,
  RemoteStorageList,
  SecurityVersion
} from '../structure/remote';
import { RTL } from '../structure/transform';
import { ChannelConnection } from '../utils/ChannelConnection';
import { formatDate, generateUUID } from '../utils/Common';
import { XmlHandler } from '../utils/XmlHandler';
import { Base, BaseConfig } from './Base';

export interface NvrConfig extends BaseConfig {
  wsPort?: number
  wasmUrl?: string
}

export class Nvr extends Base {
  protected readonly wsPort: number = 7681;
  private readonly wasmUrl: string;
  private heart?: NodeJS.Timeout;

  protected get headers(): any {
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
    super(config);
    this.wasmUrl = config.wasmUrl || '';
    this.wsPort = config.wsPort || 7681;
  }

  public getWasmUrl() {
    return this.wasmUrl;
  }

  public getIp(): string {
    return this.ip;
  }

  public async getWebsocketUrl(): Promise<string> {
    if (this.version === 2) {
      const token = await this.getWebsocketToken();
      return `ws://${this.ip}:${this.wsPort}/?version=1.0&cipherSuites=1&token=${token}`;
    } else {
      return `ws://${this.ip}:${this.wsPort}/?version=1.0&cipherSuites=1&sessionID=${this.session}`;
    }
  }

  public getPlayCommand(channelId: number): string {
    return JSON.stringify({
      sequence: 0,
      cmd: 'realplay',
      live: `live://${this.ip}:${this.wsPort}/${32 + channelId}/1`
    });
  }

  private async getWebsocketToken(): Promise<string> {
    const response = await this.request.get('/ISAPI/Security/token?format=json', {
      headers: this.headers
    });
    return response.data.Token.value;
  }

  public async searchDevice(): Promise<RemoteSearchResult> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/search', {
      headers: this.headers
    });
    return await XmlHandler.parser<RemoteSearchResult>(response.data);
  }

  public async getSSHStatus(): Promise<boolean> {
    const response = await this.request.get('/ISAPI/System/Network/ssh', {
      headers: this.headers
    });
    const json = await XmlHandler.parser<RemoteSSHStatus>(response.data);
    return json.SSH.enabled;
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
    await this.request.put(`/ISAPI/ContentMgmt/PTZCtrlProxy/channels/${channelId}/continuous`,
      XmlHandler.build({
        PTZData: {
          zoom: param
        }
      }), {
        headers: this.headers
      });
  }

  public async iris(channelId: number, param: number) {
    await this.request.put(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}/video/iris`,
      XmlHandler.build({
        IrisData: {
          iris: param
        }
      }), {
        headers: this.headers
      });
  }

  public async focus(channelId: number, param: number) {
    await this.request.put(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}/video/focus`,
      XmlHandler.build({
        FocusData: {
          focus: param
        }
      }), {
        headers: this.headers
      });
  }

  public async autoPan(channelId: number, param: number) {
    await this.request.put(`ISAPI/ContentMgmt/PTZCtrlProxy/channels/${channelId}/autoPan`,
      XmlHandler.build({
        autoPanData: {
          autoPan: param
        }
      }), {
        headers: this.headers
      });
  }

  public async direction(channelId: number, horizontal: number, vertical: number) {
    await this.request.put(`/ISAPI/ContentMgmt/PTZCtrlProxy/channels/${channelId}/continuous`,
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
      const cookie = response.headers['set-cookie'];
      if (cookie && cookie.length > 0) {
        this.session = response.headers['set-cookie'][0] || '';
      }
    }
  }

  public async disconnect() {
    await this.request.put('/ISAPI/Security/sessionLogout', null, {
      headers: this.headers
    });
    this.stopHeart();
  }

  private stopHeart() {
    this.heart && clearInterval(this.heart);
  }

  public async fetchChannels(): Promise<Channel[]> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/channels', {
      headers: this.headers
    });
    const channels = await XmlHandler.parser<RemoteChannelResult>(response.data);
    return RTL.fetchChannels(channels);
  }

  public async getChannelStatus(): Promise<ChannelStatus[]> {
    const response = await this.request.get('/ISAPI/ContentMgmt/InputProxy/channels/status', {
      headers: this.headers
    });
    const status = await XmlHandler.parser<RemoteChannelStatusResult>(response.data);
    return RTL.getChannelStatus(status);
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
    await XmlHandler.parser<any>(response.data);
  }

  public async deleteChannel(channelId: number): Promise<void>;
  public async deleteChannel(address: string): Promise<void>;

  public async deleteChannel(data: any) {
    let channelId: number = data;
    if (typeof data !== 'number') {
      const channels = await this.fetchChannels();
      const channel = channels.find(c => c.address === data);
      if (channel) {
        channelId = channel.id;
      }
    }
    await this.request.delete<NvrResponse>(`/ISAPI/ContentMgmt/InputProxy/channels/${channelId}`, {
      headers: this.headers
    });
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

  public async getStorages(): Promise<Storages> {
    const response = await this.request.get('/ISAPI/ContentMgmt/Storage', {
      headers: this.headers
    });
    const storages = await XmlHandler.parser<RemoteStorageList>(response.data);
    return RTL.getStorages(storages);
  }

  public async formatHdd(id: string, progressListener?: (progress: number) => void) {
    return new Promise((resolve, reject) => {
      const request = this.request.put<string>(`/ISAPI/ContentMgmt/Storage/hdd/${id}/format`, null, {
        timeout: 60000,
        headers: this.headers
      });
      const watcher = async () => {
        if (progressListener) {
          const progress = await this.formatHddStatus(id);
          if (progress > -1) {
            progressListener && progressListener(progress);
            setTimeout(watcher, 1000);
          }
        }
      };
      request.then(async (response) => {
        const r = await XmlHandler.parser<NvrResponse>(response.data);
        if (r.ResponseStatus.statusCode !== '1') {
          throw new Error(r.ResponseStatus.subStatusCode);
        }
        resolve();
      })
        .catch(e => {
          reject(e);
        })
        .finally(() => {
          progressListener = undefined;
        });
      setTimeout(() => {
        watcher();
      }, 500);
    });
  }

  private async formatHddStatus(id: string): Promise<number> {
    const response = await this.request.get(`/ISAPI/ContentMgmt/Storage/hdd/${id}/formatStatus`, {
      headers: this.headers
    });
    const storages = await XmlHandler.parser<RemoteFormatStatus>(response.data);
    const progress = parseInt(storages.formatStatus.percent);
    return Number.isNaN(progress) ? -1 : progress;
  }

  public async getDailyRecordStatus(channelId: number, streamType: number, date?: Date): Promise<RecordStatus[]> {
    const _date = date || new Date();
    const response = await this.request.post(
      `/ISAPI/ContentMgmt/record/tracks/${channelId * 100 + streamType}/dailyDistribution`,
      XmlHandler.build({
        trackDailyParam: {
          year: _date.getFullYear(),
          monthOfYear: _date.getMonth() + 1
        }
      }), {
        headers: this.headers
      });
    const status = await XmlHandler.parser<RemoteDailyRecordStatus>(response.data);
    return RTL.getDailyRecordStatus(_date, status);
  }

  public async searchAllRecords(channelId: number, streamType: number, startTime: Date,
    endTime: Date): Promise<RecordItem[]> {
    let isEnd = false;
    let pageNo = 1;
    let pageSize = 100;
    const result: RecordItem[] = [];
    do {
      const records = await this.searchRecords(channelId, streamType, startTime, endTime, pageNo, pageSize);
      result.push(...records.list);
      isEnd = !records.hasMore;
    } while (!isEnd);
    return result;
  }

  public async searchRecords(channelId: number, streamType: number, startTime: Date, endTime: Date, pageNo: number,
    pageSize: number): Promise<RecordSearchResult> {
    const response = await this.request.post('/ISAPI/ContentMgmt/search',
      XmlHandler.build({
        CMSearchDescription: {
          searchID: generateUUID(),
          trackList: {
            trackID: 100 * channelId + streamType
          },
          timeSpanList: {
            timeSpan: {
              startTime: formatDate(startTime, 'yyyy-MM-ddThh:mm:ssZ'),
              endTime: formatDate(endTime, 'yyyy-MM-ddThh:mm:ssZ')
            }
          },
          maxResults: pageSize,
          searchResultPostion: (pageNo - 1) * pageSize,
          metadataList: {
            metadataDescriptor: 'recordType.meta.std-cgi.com'
          }
        }
      }), {
        headers: this.headers
      });
    const result = await XmlHandler.parser<RemoteRecordSearchResult>(response.data);
    return RTL.searchRecords(result);
  }

  public getChannelConnect(): ChannelConnection {
    return new ChannelConnection(this);
  }
}
