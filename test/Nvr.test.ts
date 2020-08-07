import { Nvr } from '../src/Nvr';

describe('Nvr', () => {
  const _global: any = typeof window === 'undefined' ? global : window;
  const nvr = new Nvr(_global.nvrConfig);

  beforeAll(async() => {
    return await nvr.connect();
  });

  test('connect', () => {
    expect(nvr.getSession().length).not.toBe(0);
  });

  test('addChannel', async() => {
    await nvr.addChannel({ ip: '10.233.233.233', userName: 'admin', password: 'password', protocol: 'HIKVISION' });
    await nvr.addChannel({ ip: '10.233.233.234', userName: 'admin', password: 'password', protocol: 'HIKVISION' });
  });

  test('fetchChannels', async() => {
    const channels = await nvr.fetchChannels();
    expect(channels.InputProxyChannelList.InputProxyChannel.length).toBe(2);
  });

  test('deleteChannel', async() => {
    await nvr.deleteChannel('10.233.233.234');
    await nvr.deleteChannel(1);
  });
});
