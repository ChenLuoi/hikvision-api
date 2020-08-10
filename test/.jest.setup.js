const _global = typeof window === 'undefined' ? global : window;
_global.nvrConfig = {
  ip: '1.1.1.1',
  // port: 80
  user: 'admin',
  password: '123456',
  // timeout: 10000,
  // proxy : 'http://127.0.0.1/'
  // wsPort: 7681,
  version: 2
};

_global.cameraConfig = {
  ip: '1.1.1.2',
  // port: 80
  user: 'admin',
  password: '123456',
  // timeout: 10000,
  // proxy : 'http://127.0.0.1/'
  version: 1
}
