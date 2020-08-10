import { NvrResponse, RemoteLoginResult } from '../structure/remote';
import { XmlHandler } from '../utils/XmlHandler';
import { Base, BaseConfig } from './Base';

export class Camera extends Base {
  protected readonly wsPort: number = 7681;

  public get url(): string {
    return `http://${this.user}:${this.password}@${this.ip}:${this.port}`;
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

  constructor(config: BaseConfig) {
    super(config);
  }

  public async connect(): Promise<void> {
    if (this.version === 2) {
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
      const json = await XmlHandler.parser<RemoteLoginResult>(response.data);
      const wrap = json.SessionUserCheck || json.SessionLogin;
      this.session = wrap ? wrap.sessionID : '';
    } else {
      await this.request.get(`/ISAPI/Security/userCheck?timeStamp=${Date.now()}`);
    }
  }

  public async direction(horizontal: number, vertical: number) {
    const result = await this.request.put('/ISAPI/PTZCtrl/channels/1/continuous',
      XmlHandler.build({
        PTZData: {
          pan: horizontal,
          tilt: vertical
        }
      }), {
        headers: this.headers
      });
  }

  public async zoom(param: number) {
    const result = await this.request.put('ISAPI/PTZCtrl/channels/1/continuous',
      XmlHandler.build({
        PTZData: {
          zoom: param
        }
      }), {
        headers: this.headers
      });
  }

  public async iris(channelId: number, param: number) {
    const result = await this.request.put('/ISAPI/System/Video/inputs/channels/1/iris',
      XmlHandler.build({
        IrisData: {
          iris: param
        }
      }), {
        headers: this.headers
      });
  }

  public async focus(param: number) {
    const result = await this.request.put('/ISAPI/System/Video/inputs/channels/1/focus',
      XmlHandler.build({
        FocusData: {
          focus: param
        }
      }), {
        headers: this.headers
      });
  }

  public async light(enable: boolean) {
    let result;
    try {
      const response = await this.request.put('/ISAPI/PTZCtrl/channels/1/auxcontrols/1',
        XmlHandler.build({
          PTZAux: {
            id: '1',
            type: 'LIGHT',
            status: enable ? 'on' : 'off'
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

  public async wiper(enable: boolean) {
    let result;
    try {
      const response = await this.request.put('/ISAPI/PTZCtrl/channels/1/auxcontrols/1',
        XmlHandler.build({
          PTZAux: {
            id: '1',
            type: 'WIPER',
            status: enable ? 'on' : 'off'
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
}
