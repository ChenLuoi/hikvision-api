import WS from 'ws';
import { Nvr } from '../equipment/Nvr';
import { FrameData } from '../structure/local';
import { getDecodeWorker } from '../worker/DecodeWorker';
import { formatDate, isBrowser } from './Common';
import { Worker, BlobWorker } from 'threads';
import { EventEmitter } from './EventEmitter';

interface IWebsocket {
  binaryType: string

  addEventListener(key: string, listener: (ev: { data: any }) => void): void

  send(msg: string): void

  close(): void
}

export class ChannelConnection extends EventEmitter {
  private websocket!: IWebsocket;
  private worker!: Worker;
  private nvr: Nvr;
  private isPlay: boolean = false;
  private aHead!: Uint8Array;
  private isOpenStream: boolean = false;
  private isPause: boolean = false;
  private isFirstFrame: boolean = false;
  private isGetYUV: boolean = false;
  private isInput: boolean = false;
  private streamOpenMode: number | null = null;
  private inputMaxBufSize: number = 5 * 1024 * 1024; // 5M
  private isPlayRateChange: boolean = false;
  private inputDataLengths: number[] = [];
  private inputDataBuffer: number[] = [];
  private videoFrameBuffer: FrameData[] = [];
  private decodeFrameType: 0 | 1 = 0;
  private rate = 1;
  public isInputBufferOver: boolean = false;
  private inputDataLength = 5e3;
  private width = 0;
  private height = 0;
  private isVisible: boolean = true;
  private isDestroyed: boolean = false;
  private isRecoverable: boolean = false;

  public constructor(nvr: Nvr) {
    super();
    this.nvr = nvr;
  }

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.initDecodeWorker(),
        this.initWebSocket()
      ])
        .then(() => resolve())
        .catch(error => {
          console.log(error);
          reject(error);
        });
    });
  }

  public setRecoverable(value: boolean) {
    this.isRecoverable = value;
  }

  private async initDecodeWorker(): Promise<void> {
    return new Promise<void>((resolve) => {
      const that = this;
      const workerHandler = function (ev: any) {
        const data = ev.data;
        switch (data.function) {
          case 'loaded':
            resolve();
            break;
          case 'GetFrameData':
            if (!that.isFirstFrame && data.errorCode === 31) {
              that.isInputBufferOver = false;
              setTimeout(() => that.inputDataFun(), 5);
              break;
            }
            if (that.isInputBufferOver) {
              that.inputDataFun();
            } else if (data.type === 'videoType') {
              if (that.inputDataLengths.length > 0 && that.isInput) {
                that.inputDataFun();
                that.isInput = false;
              } else {
                that.isGetYUV = true;
                that.isFirstFrame = false;
              }
            }
            if (that.isVisible) {
              switch (data.type) {
                case 'videoType':
                  if (data.data == null || data.frameInfo == null) {
                    return 1;
                  }
                  that.isFirstFrame = false;
                  that.width = data.frameInfo.width;
                  that.height = data.frameInfo.height;
                  const frame = {
                    data: data.data,
                    width: data.frameInfo.width,
                    height: data.frameInfo.height,
                    osdTime: data.osd
                  };
                  that.videoFrameBuffer.push(frame);
                  that.dispatchEvent({
                    type: 'video',
                    data: frame
                  });
                  that.videoFrameBuffer.length > 3 && (that.videoFrameBuffer.splice(0, 1));
                  break;
              }
            }
            break;
          case 'GetBMP':
            that.bmpCallback && that.bmpCallback(data.data);
            break;
          case 'GetJPEG':
            that.jpegCallback && that.jpegCallback(data.data);
            break;
        }
      };
      this.worker = BlobWorker.fromText(getDecodeWorker(isBrowser(), this.nvr.getWasmUrl()));
      this.worker.addEventListener('message', workerHandler);
    });
  }

  private initWebSocket(): Promise<void> {
    return new Promise<void>(async (resolve) => {
      const wsUrl = await this.nvr.getWebsocketUrl();
      this.websocket = isBrowser() ? new WebSocket(wsUrl) : new WS(wsUrl);
      this.websocket.binaryType = 'arraybuffer';
      this.websocket.addEventListener('close', () => {
        if (!this.isDestroyed) {
          if (this.isRecoverable) {
            this.initWebSocket();
          }
          this.dispatchEvent({
            type: 'close',
            data: 'websocket'
          });
        }
      });
      this.websocket.addEventListener('open', () => {
        resolve();
      });
      this.websocket.addEventListener('message', ev => {
        if (typeof ev.data === 'string') {
          const e = JSON.parse(ev.data);
          if (e && e.version && e.cipherSuite) {
            return;
          }
          if (e && e.sdp) {
            const media = ChannelConnection.getMediaFromSdp(e.sdp);
            this.decode({ isHead: true, buffer: media });
          }
        } else {
          let decodeData;
          const data = new Uint8Array(ev.data);
          if (data.byteLength === 64 || data.byteLength === 40) {
            let start = -1;
            const byteLength = data.byteLength;
            // try find head
            for (let i = 0; i < byteLength; i++) {
              if (data[i] === 73 && data[i + 1] === 77 && data[i + 2] === 75 && data[i + 3] === 72) {
                start = i;
                break;
              }
            }
            if (start !== -1) {
              decodeData = { isHead: true, buffer: data.slice(start, start + 40) };
            } else {
              decodeData = { isHead: false, buffer: data };
            }
          } else {
            decodeData = { isHead: false, buffer: data };
          }
          this.dispatchEvent({
            type: 'raw-data',
            data: decodeData.buffer
          });
          this.decode(decodeData);
        }
      });
    });
  }

  public destroy() {
    this.isDestroyed = true;
    this.isPlay = false;
    if (this.websocket) {
      this.websocket.close();
    }

    if (this.worker) {
      this.worker.terminate();
    }
  }

  openStream(t: Uint8Array, e: number, n: number) {
    if (this.worker == null) {
      return;
    }
    if (t == null || e <= 0 || n <= 0) {
      return;
    }
    this.isPlay = false;
    this.isPause = false;
    this.isFirstFrame = true;
    this.isGetYUV = false;
    this.isInput = false;
    this.worker.postMessage({ command: 'SetStreamOpenMode', data: this.streamOpenMode });
    this.worker.postMessage({ command: 'OpenStream', data: t, dataSize: e, bufPoolSize: n });
    this.isOpenStream = true;
  }

  setStreamOpenMode(t: 0 | 1) {
    this.streamOpenMode = t;
  }

  setInputBufSize(t: number) {
    this.inputMaxBufSize = t;
  }

  play() {
    if (this.worker === null || !this.isOpenStream) {
      return 2;
    }
    if (this.isPlay) {
      return 0;
    }
    this.isPlay = true;
    this.isPause = false;
    this.isPlayRateChange = false;
  }

  setDecodeFrameType(t: 0 | 1) {
    this.decodeFrameType = t;
    this.worker.postMessage({ command: 'SetDecodeFrameType', data: t });
  }

  inputDataFun() {
    let buffer;
    let inputSize = 0;
    this.isGetYUV = false;
    if (this.isInputBufferOver) {
      buffer = new Uint8Array(1);
    } else {
      while (this.inputDataLengths.length > 0 &&
      ((inputSize += this.inputDataLengths.shift() || 0) <= this.inputDataLength)) {
      }
      buffer = this.inputDataBuffer.splice(0, inputSize);
    }
    const data = new Uint8Array(buffer);
    const message = { command: 'InputData', data: data.buffer, dataSize: inputSize };
    if (this.isPlay && !this.isPause) {
      this.worker.postMessage(message, [message.data]);
    }
  }

  inputData(data: Uint8Array, size: number) {
    if (this.worker === null || !this.isOpenStream) {
      return 2;
    }
    const currentBufferSize = this.inputDataBuffer.length;
    // control command
    if (size === 4) {
      const _data = new Uint8Array(data.buffer);
      if (_data[0] === 1 && _data[1] === 2 && _data[2] === 3 && _data[3] === 4) {
        if (this.isFirstFrame || this.isGetYUV) {
          this.inputDataFun();
        } else {
          this.isInput = true;
        }
        return 0;
      }
    }
    if (currentBufferSize > this.inputMaxBufSize) {
      return 11;
    }
    let inputData: Uint8Array | null = null;
    let dataSize = size;
    switch (this.streamOpenMode) {
      case 1:
        inputData = new Uint8Array(data.buffer);
        this.inputDataLengths.push(size);
        break;
      case 0:
        dataSize = size + 4;
        const _head = new Uint32Array([size]);
        const head = new Uint8Array(_head.buffer);
        inputData = new Uint8Array(dataSize);
        inputData.set(head, 0);
        inputData.set(data, 4);
        this.inputDataLengths.push(size + 4);
        break;
      default:
        return 16;
    }
    for (let i = 0; i < dataSize; i++) {
      this.inputDataBuffer[currentBufferSize + i] = inputData[i];
    }
    if (this.isFirstFrame || this.isGetYUV) {
      this.inputDataFun();
    } else {
      this.isInput = true;
    }
  }

  private decode(data: { isHead: boolean, buffer: Uint8Array }) {
    const bufferSize = 4194304; // 4 * 1024 * 1024, 4M
    if (data.isHead && !this.isPlay) {
      this.isPlay = true;
      this.aHead = new Uint8Array(data.buffer);
      this.openStream(data.buffer, 40, 2097152);
      this.setStreamOpenMode(this.aHead[8] === 4 ? 0 : 1);
      this.setInputBufSize(bufferSize);
      this.play();
    } else {
      let inputData: Uint8Array = new Uint8Array(data.buffer);
      const inputSize = this.inputDataBuffer.length;
      const videoFrameSize = this.videoFrameBuffer.length;
      if (videoFrameSize === 2 && !this.isFirstFrame) {
        this.isFirstFrame = true;
      }
      const type = this.decodeFrameType;
      if (0.5 * bufferSize < inputSize && inputSize < 0.8 * bufferSize && this.rate === 1) {
        if (type !== 1) {
          this.setDecodeFrameType(1);
        }
      } else if (0.8 * bufferSize <= inputSize) {
        inputData = new Uint8Array([1, 2, 3, 4]);
      }
      if (videoFrameSize > 10 && videoFrameSize < 15) {
        if (type !== 1) {
          this.setDecodeFrameType(1);
        }
      } else if (videoFrameSize > 15) {
        inputData = new Uint8Array([1, 2, 3, 4]);
      }
      if (videoFrameSize < 10 && inputSize < 0.5 * bufferSize && type !== 0) {
        this.setDecodeFrameType(0);
      }
      this.inputData(inputData, inputData.length);
    }
  }

  private static getMediaFromSdp(sdp: string): Uint8Array {
    const index = sdp.indexOf('MEDIAINFO=') + 10;
    const mediaInfoString = sdp.slice(index, index + 80);
    const mediaInfo = [];
    const halfLength = mediaInfoString.length / 2;
    for (let i = 0; i < halfLength; i++) {
      mediaInfo[i] = parseInt(mediaInfoString.slice(i * 2, i * 2 + 2), 16);
    }
    return new Uint8Array(mediaInfo);
  }

  public startRealPlay(channelId: number) {
    this.websocket.send(
      `{"sequence":0,"cmd":"realplay","url":"live://${this.nvr.getIp()}:7681/${this.nvr.getChannelOffset() +
      channelId}/1"}`);
  }

  public startPlayback(channelId: number, startTime: Date, endTime: Date) {
    const fmt = 'yyyy-MM-ddThh:mm:ssZ';
    const start = formatDate(startTime, fmt);
    const end = formatDate(endTime, fmt);
    this.websocket.send(
      `{"sequence":0,"cmd":"playback","url":"live://${this.nvr.getIp()}:7681/${this.nvr.getChannelOffset() +
      channelId}/0","startTime":"${start}","endTime":"${end}"}`);
  }

  public pause() {
    this.websocket.send('{"sequence":0,"cmd":"pause"}');
  }

  public resume() {
    this.websocket.send('{"sequence":0,"cmd":"resume"}');
  }

  public getHead() {
    return this.aHead;
  }

  private bmpCallback: ((data: Uint8Array) => void) | null = null;
  private jpegCallback: ((data: Uint8Array) => void) | null = null;

  public async getBmp(data: FrameData) {
    return this.getImage(data, 'bmp');
  }


  public async getJpeg(data: FrameData) {
    return this.getImage(data, 'jpeg');
  }

  private static arrayBufferCopy(_src: ArrayBuffer): Uint8Array {
    const length = _src.byteLength;
    const src = new Uint8Array(_src);
    const dest = new Uint8Array(length);
    for (let r = 0; r < length; r++) {
      dest[r] = src[r];
    }
    return dest;
  }

  private async getImage(data: FrameData, type: 'jpeg' | 'bmp') {
    return new Promise<Uint8Array>((resolve) => {
      const r = {
        command: type === 'jpeg' ? 'GetJPEG' : 'GetBMP',
        data: ChannelConnection.arrayBufferCopy(data.data).buffer,
        width: data.width,
        height: data.height,
        rect: {
          left: 0, top: 0, right: 0, bottom: 0
        }
      };
      if (type === 'jpeg') {
        this.jpegCallback = (data: Uint8Array) => {
          resolve(data);
        };
      } else {
        this.bmpCallback = (data: Uint8Array) => {
          resolve(data);
        };
      }
      this.worker.postMessage(r, [r.data]);
    });
  }
}
