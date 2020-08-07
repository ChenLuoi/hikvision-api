import { Nvr } from '../src/Nvr';

describe('Nvr', () => {
  const _global: any = typeof window === 'undefined' ? global : window;
  const nvr = new Nvr(_global.nvrConfig);
  let channelSize = 0;

  beforeAll(async() => {
    return await nvr.connect();
  });

  test('connect', () => {
    expect(nvr.getSession().length).not.toBe(0);
  });

  test('deviceInfo', async() => {
    const deviceInfo = await nvr.deviceInfo();
    expect(deviceInfo.DeviceInfo.deviceType).toBe('DVR');
    await nvr.updateDeviceInfo({
      DeviceInfo: {
        ...deviceInfo.DeviceInfo,
        deviceName: 'testName',
        telecontrolID: '233'
      }
    });
    const currentDeviceInfo = await nvr.deviceInfo();
    expect(currentDeviceInfo.DeviceInfo.deviceName).toBe('testName');
    expect(currentDeviceInfo.DeviceInfo.telecontrolID).toBe('233');
    await nvr.updateDeviceInfo(deviceInfo);
    const resetDeviceInfo = await nvr.deviceInfo();
    expect(resetDeviceInfo.DeviceInfo.deviceName).toBe(deviceInfo.DeviceInfo.deviceName);
    expect(resetDeviceInfo.DeviceInfo.telecontrolID).toBe(deviceInfo.DeviceInfo.telecontrolID);
  });

  test('ssh', async() => {
    const status = await nvr.getSSHStatus();
    expect(await nvr.setSSHStatus(!status)).toBe(true);
    expect(await nvr.getSSHStatus()).toBe(!status);
    expect(await nvr.setSSHStatus(status)).toBe(true);
    expect(await nvr.getSSHStatus()).toBe(status);
  });

  test('fetchChannelsBefore', async() => {
    const channels = await nvr.fetchChannels();
    channelSize = channels.InputProxyChannelList.InputProxyChannel.length;
  });

  test('addChannel', async() => {
    await nvr.addChannel({ ip: '10.233.233.233', userName: 'admin', password: 'password', protocol: 'HIKVISION' });
    await nvr.addChannel({ ip: '10.233.233.234', userName: 'admin', password: 'password', protocol: 'HIKVISION' });
  });

  test('fetchChannels', async() => {
    const channels = await nvr.fetchChannels();
    expect(channels.InputProxyChannelList.InputProxyChannel.length).toBe(channelSize + 2);
  });

  test('deleteChannel', async() => {
    await nvr.deleteChannel('10.233.233.234');
    await nvr.deleteChannel(1);
  });
});
