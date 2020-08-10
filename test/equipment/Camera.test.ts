import { Camera } from '../../src/equipment/Camera';
import { sleep } from '../../src/utils/Common';

describe('Camera', () => {
  const _global: any = typeof window === 'undefined' ? global : window;
  const camera = new Camera(_global.cameraConfig);

  beforeAll(async() => {
    return await camera.connect();
  });

  test('deviceInfo', async() => {
    const deviceInfo = await camera.deviceInfo();
    await camera.updateDeviceInfo({
      ...deviceInfo,
      name: 'testCamera',
      code: '234'
    });
    const currentDeviceInfo = await camera.deviceInfo();
    expect(currentDeviceInfo.name).toBe('testCamera');
    expect(currentDeviceInfo.code).toBe('234');
    await camera.updateDeviceInfo(deviceInfo);
    const resetDeviceInfo = await camera.deviceInfo();
    expect(resetDeviceInfo.name).toBe(deviceInfo.name);
    expect(resetDeviceInfo.code).toBe(deviceInfo.code);
  });

  test('direction', async() => {
    await camera.direction(60, 0);
    await sleep(2000);
    await camera.direction(0, 0);
    await camera.direction(-60, 0);
    await sleep(2000);
    await camera.direction(0, 0);
    await camera.direction(0, 60);
    await sleep(2000);
    await camera.direction(0, 0);
    await camera.direction(0, -60);
    await sleep(2000);
    await camera.direction(0, 0);
  }, 15000);

  test('focus', async() => {
    await camera.focus(60);
    await sleep(500);
    await camera.focus(0);
    await camera.focus(-60);
    await sleep(500);
    await camera.focus(0);
  });

  test('zoom', async() => {
    await camera.zoom(60);
    await sleep(2000);
    await camera.zoom(0);
    await camera.zoom(-60);
    await sleep(2000);
    await camera.zoom(0);
  }, 8000);

  test('light', async() => {
    await camera.light(true);
    await sleep(2000);
    await camera.light(false);
  });

  test('wiper', async() => {
    await camera.wiper(true);
    await sleep(2000);
    await camera.wiper(false);
  });
});
