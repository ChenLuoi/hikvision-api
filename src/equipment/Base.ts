import axios, { AxiosInstance } from 'axios';
import { DeviceInfo, SessionParams, TimeStatus, User } from '../structure/local';
import {
  NvrResponse,
  RemoteDeviceInfo, RemoteSessionParams,
  RemoteTimeStatus, RemoteUserList
} from '../structure/remote';
import { LTR, RTL } from '../structure/transform';
import { formatDate } from '../utils/Common';
import { sha256 } from '../utils/Sha256';
import { XmlHandler } from '../utils/XmlHandler';

export interface BaseConfig {
  ip: string
  port?: number
  user: string
  password: string
  timeout?: number
  proxy?: string
  version?: number
  userPassword?: string
}

export abstract class Base {
  protected readonly ip: string = '192.168.1.64';
  protected readonly port: number = 80;
  protected readonly user: string = 'admin';
  protected readonly password: string;
  protected session: string = '';
  protected request: AxiosInstance;
  protected readonly useProxy: boolean = false;
  protected readonly wsPort: number = 7681;
  public readonly version: number = 1;
  protected readonly userPassword: string = '';

  protected get url(): string {
    return `http://${this.ip}:${this.port}`;
  }

  protected get headers(): any {
    return this.useProxy
      ? {
        proxy: this.url,
        Cookie: this.version === 2 ? this.session : `WebSession=${this.session}`
      }
      : {
        Cookie: this.version === 2 ? this.session : `WebSession=${this.session}`
      };
  }

  protected constructor(config: BaseConfig) {
    this.ip = config.ip;
    this.port = config.port || this.port;
    this.user = config.user;
    this.password = config.password;
    this.useProxy = !!config.proxy;
    config.version && (this.version = config.version);
    config.userPassword && (this.userPassword = config.userPassword);

    this.request = axios.create({
      baseURL: config.proxy || this.url,
      timeout: config.timeout || 10000
    });
  }

  public getSession(): string {
    return this.session;
  }

  protected async getSessionParams(): Promise<SessionParams> {
    const response = await this.request.get(
      `/ISAPI/Security/sessionLogin/capabilities?username=${this.user}`, {
        headers: this.headers
      });
    const json = await XmlHandler.parser<RemoteSessionParams>(response.data);
    return RTL.sessionParams(json);
  }

  public async deviceInfo(): Promise<DeviceInfo> {
    const response = await this.request.get('/ISAPI/System/deviceInfo', {
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

  public async addUser(user: User): Promise<void> {
    let result;
    try {
      const response = await this.request.post('/ISAPI/Security/users',
        XmlHandler.build({
          User: {
            id: user.id,
            userName: user.userName,
            loginPassword: this.password,
            password: user.password || this.userPassword,
            userLevel: 'Operator'
          }
        }),
        {
          headers: this.headers
        });
      result = response.data;
    } catch (e) {
      result = e.response.data;
    }
    const r = await XmlHandler.parser<NvrResponse>(result);
    if (r.ResponseStatus.statusCode !== '1') {
      throw new Error(r.ResponseStatus.subStatusCode);
    }
  }

  public async updateUser(user: User): Promise<void> {
    let result;
    try {
      const response = await this.request.put(`/ISAPI/Security/users/${user.id}`,
        XmlHandler.build({
          User: {
            id: user.id,
            userName: user.userName,
            loginPassword: this.password,
            password: user.password || this.userPassword,
            userLevel: user.type
          }
        }),
        {
          headers: this.headers
        });
      result = response.data;
    } catch (e) {
      result = e.response.data;
    }
    const r = await XmlHandler.parser<NvrResponse>(result);
    if (r.ResponseStatus.statusCode !== '1') {
      throw new Error(r.ResponseStatus.subStatusCode);
    }
  }

  public async deleteUser(userId: number): Promise<void>;
  public async deleteUser(userName: string): Promise<void>;

  public async deleteUser(data: any) {
    let userId: number = data;
    if (typeof data !== 'number') {
      const users = await this.fetchUsers();
      const user = users.find(u => u.userName === data);
      if (user) {
        userId = user.id;
      }
    }
    let result;
    try {
      const response = await this.request.delete<NvrResponse>(`/ISAPI/Security/users/${userId}`, {
        headers: this.headers,
        params: {
          loginPassword: this.password
        }
      });
      result = response.data;
    } catch (e) {
      result = e.response.data;
    }
    const r = await XmlHandler.parser<NvrResponse>(result);
    if (r.ResponseStatus.statusCode !== '1') {
      throw new Error(r.ResponseStatus.subStatusCode);
    }
  }

  public async fetchUsers(): Promise<User[]> {
    const response = await this.request.get('/ISAPI/Security/users', {
      headers: this.headers
    });
    const users = await XmlHandler.parser<RemoteUserList>(response.data);
    return RTL.fetchUsers(users);
  }

  public async getUsers() {
    const response = await this.request.get('/ISAPI/Security/users', {
      headers: this.headers
    });
    const users = await XmlHandler.parser(response.data);
  }

  protected encodePassword(session: SessionParams): string {
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

  protected async reboot() {
    let result;
    try {
      const response = await this.request.put('/ISAPI/System/reboot', null, {
        headers: this.headers
      });
      result = response.data;
    } catch (e) {
      result = e.response.data;
    }
    const r = await XmlHandler.parser<NvrResponse>(result);
    if (r.ResponseStatus.statusCode !== '1') {
      throw new Error(r.ResponseStatus.subStatusCode);
    }
  }
}
