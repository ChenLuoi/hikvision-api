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
    expect(deviceInfo.deviceType).toBe('DVR');
    await nvr.updateDeviceInfo({
      ...deviceInfo,
      name: 'testName',
      code: '233'
    });
    const currentDeviceInfo = await nvr.deviceInfo();
    expect(currentDeviceInfo.name).toBe('testName');
    expect(currentDeviceInfo.code).toBe('233');
    await nvr.updateDeviceInfo(deviceInfo);
    const resetDeviceInfo = await nvr.deviceInfo();
    expect(resetDeviceInfo.name).toBe(deviceInfo.name);
    expect(resetDeviceInfo.code).toBe(deviceInfo.code);
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
    channelSize = channels.length;
  });

  test('addChannel', async() => {
    await nvr.addChannel({ ip: '10.233.233.233', userName: 'admin', password: 'password', protocol: 'HIKVISION' });
    await nvr.addChannel({ ip: '10.233.233.234', userName: 'admin', password: 'password', protocol: 'HIKVISION' });
  });

  test('fetchChannels', async() => {
    const channels = await nvr.fetchChannels();
    expect(channels.length).toBe(channelSize + 2);
  });

  test('deleteChannel', async() => {
    await nvr.deleteChannel('10.233.233.234');
    await nvr.deleteChannel('10.233.233.233');
  });
});
