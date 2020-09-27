import {
  Channel, ChannelStatus, DeviceInfo, Hdd, Nas, RecordItem, RecordSearchResult, RecordStatus, SessionParams, Storages,
  TimeStatus, User
} from './local';
import {
  RemoteChannel, RemoteChannelResult, RemoteChannelStatus, RemoteChannelStatusResult, RemoteDailyRecordStatus,
  RemoteDeviceInfo, RemoteHdd,
  RemoteNas,
  RemoteRecordSearchResult, RemoteSearchRecordItem,
  RemoteSessionParams, RemoteStorageList,
  RemoteTimeStatus,
  RemoteUser,
  RemoteUserList
} from './remote';

export class RTL {
  public static sessionParams(params: RemoteSessionParams): SessionParams {
    const cap = params.SessionLoginCap;
    return {
      sessionId: cap.sessionID,
      challenge: cap.challenge,
      iterations: cap.iterations,
      isIrreversible: cap.isIrreversible,
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
      managePort: channel.sourceInputPortDescriptor.managePortNo,
      inputPort: channel.sourceInputPortDescriptor.srcInputPort,
      userName: channel.sourceInputPortDescriptor.userName,
      streamType: channel.sourceInputPortDescriptor.streamType,
      deviceId: channel.sourceInputPortDescriptor.deviceID,
      enableAnr: channel.enableAnr,
      enableTiming: channel.enableTiming
    };
  }

  public static channelStatus(status: RemoteChannelStatus): ChannelStatus {
    return {
      id: status.id,
      ip: status.sourceInputPortDescriptor.ipAddress,
      online: status.online
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

  public static getChannelStatus(_status: RemoteChannelStatusResult): ChannelStatus[] {
    const status = _status.InputProxyChannelStatusList.InputProxyChannelStatus;
    if (status) {
      if (Array.isArray(status)) {
        return status.map(remote => {
          return this.channelStatus(remote);
        });
      } else {
        return [this.channelStatus(status)];
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

  private static hdd(hdd: RemoteHdd): Hdd {
    return {
      id: hdd.id,
      name: hdd.hddName,
      path: hdd.hddPath,
      type: hdd.hddType,
      status: hdd.status,
      capacity: parseInt(hdd.capacity),
      freeSpace: parseInt(hdd.freeSpace),
      property: hdd.property
    };
  }

  private static nas(nas: RemoteNas): Nas {
    return {
      id: nas.id,
      addressingFormatType: nas.addressingFormatType,
      ipAddress: nas.ipAddress,
      port: nas.portNo,
      type: nas.nasType,
      path: nas.path,
      status: nas.status,
      capacity: parseInt(nas.capacity),
      freeSpace: parseInt(nas.freeSpace),
      property: nas.property
    };
  }

  public static getStorages(storages: RemoteStorageList): Storages {
    const hdd = [];
    const nas = [];
    const hddList = storages.storage.hddList.hdd;
    const nasList = storages.storage.nasList.nas;
    if (hddList) {
      if (Array.isArray(hddList)) {
        hdd.push(...hddList.map(remote => {
          return this.hdd(remote);
        }));
      } else {
        hdd.push(this.hdd(hddList));
      }
    }
    if (nasList) {
      if (Array.isArray(nasList)) {
        nas.push(...nasList.map(remote => {
          return this.nas(remote);
        }));
      } else {
        nas.push(this.nas(nasList));
      }
    }
    return {
      hdd,
      nas,
      mode: storages.storage.workMode
    };
  }

  public static getDailyRecordStatus(yearMonth: Date, status: RemoteDailyRecordStatus): RecordStatus[] {
    return status.trackDailyDistribution.dayList.day.map(day => {
      return {
        day: new Date(yearMonth.getFullYear(), yearMonth.getMonth(), parseInt(day.dayOfMonth)),
        hasRecord: day.record,
        recordType: day.recordType
      };
    });
  }

  private static searchRecord(remote: RemoteSearchRecordItem): RecordItem {
    return {
      startTime: new Date(remote.timeSpan.startTime.replace(/[TZ]/g, ' ')),
      endDate: new Date(remote.timeSpan.endTime.replace(/[TZ]/g, ' ')),
      sourceId: remote.sourceID,
      trackId: remote.trackID,
      playbackUrl: remote.mediaSegmentDescriptor.playbackURI
    };
  }

  public static searchRecords(data: RemoteRecordSearchResult): RecordSearchResult {
    const items = data.CMSearchResult.matchList && data.CMSearchResult.matchList.searchMatchItem;
    let list: RecordItem[] = [];
    if (items) {
      if (Array.isArray(items)) {
        list = items.map(remote => {
          return this.searchRecord(remote);
        });
      } else {
        list = [this.searchRecord(items)];
      }
    }
    return {
      total: data.CMSearchResult.numOfMatches,
      hasMore: data.CMSearchResult.responseStatusStrg === 'MORE',
      list
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
