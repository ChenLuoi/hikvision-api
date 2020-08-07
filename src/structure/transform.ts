import { Channel, DeviceInfo, SessionParams, TimeStatus, User } from './local';
import {
  RemoteChannel, RemoteChannelResult, RemoteDeviceInfo, RemoteSessionParams, RemoteTimeStatus, RemoteUser,
  RemoteUserList
} from './remote';

export class RTL {
  public static sessionParams(params: RemoteSessionParams): SessionParams {
    const cap = params.SessionLoginCap;
    return {
      sessionId: cap.sessionID,
      challenge: cap.challenge,
      iterations: Number(cap.iterations),
      isIrreversible: cap.isIrreversible === 'true',
      salt: cap.salt || ''
    };
  }

  public static deviceInfo(_info: RemoteDeviceInfo): DeviceInfo {
    const info = _info.DeviceInfo;
    return {
      name: info.deviceName,
      id: info.deviceID,
      model: info.model,
      serialNo: info.serialNumber,
      mac: info.macAddress,
      firmwareVersion: info.firmwareVersion,
      firmwareReleaseDate: info.firmwareVersion,
      encoderVersion: info.encoderVersion,
      encoderReleaseDate: info.encoderReleasedDate,
      deviceType: info.deviceType,
      code: info.telecontrolID
    };
  }

  private static channel(channel: RemoteChannel): Channel {
    return {
      id: channel.id,
      name: channel.name,
      addressType: channel.sourceInputPortDescriptor.addressingFormatType,
      address: channel.sourceInputPortDescriptor.ipAddress,
      protocol: channel.sourceInputPortDescriptor.proxyProtocol,
      managePort: Number(channel.sourceInputPortDescriptor.managePortNo),
      inputPort: Number(channel.sourceInputPortDescriptor.srcInputPort),
      userName: channel.sourceInputPortDescriptor.userName,
      streamType: channel.sourceInputPortDescriptor.streamType,
      deviceId: channel.sourceInputPortDescriptor.deviceID,
      enableAnr: channel.enableAnr === 'true',
      enableTiming: channel.enableTiming === 'true'
    };
  }

  public static fetchChannels(_channels: RemoteChannelResult): Channel[] {
    const channels = _channels.InputProxyChannelList.InputProxyChannel;
    if (channels) {
      if (Array.isArray(channels)) {
        return channels.map(remote => {
          return this.channel(remote);
        });
      } else {
        return [this.channel(channels)];
      }
    } else {
      return [];
    }
  }

  private static user(user: RemoteUser): User {
    return {
      id: user.id,
      userName: user.userName,
      type: user.userLevel
    };
  }

  public static fetchUsers(_users: RemoteUserList): User[] {
    const users = _users.UserList.User;
    if (users) {
      if (Array.isArray(users)) {
        return users.map(remote => {
          return this.user(remote);
        });
      } else {
        return [this.user(users)];
      }
    } else {
      return [];
    }
  }

  public static timeStatus(timeStatus: RemoteTimeStatus): TimeStatus {
    return {
      mode: timeStatus.Time.timeMode,
      time: new Date(timeStatus.Time.localTime),
      timeZoneOffset: -480
    };
  }
}

export class LTR {
  public static deviceInfo(info: DeviceInfo): RemoteDeviceInfo {
    return {
      DeviceInfo: {
        deviceName: info.name,
        deviceID: info.id,
        model: info.model,
        serialNumber: info.serialNo,
        macAddress: info.mac,
        firmwareVersion: info.firmwareVersion,
        firmwareReleasedDate: info.firmwareReleaseDate,
        encoderVersion: info.encoderVersion,
        encoderReleasedDate: info.encoderReleaseDate,
        deviceType: info.deviceType,
        telecontrolID: info.code
      }
    };
  }
}
