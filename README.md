# hikvision-api

## Summary
a simple toolkit to connect and control some equipments of hikvision.

## Installation
install with npm:
```shell
npm install hikvision-api
```
install with yarn
```shell
yarn add hikvision-api
```

## Usage
### build a nvr instance
```typescript
const nvr = new Nvr({
  ip: '192.168.1.64',
  user: 'admin',
  password: '123456',
  // proxy: 'http://127.0.0.1:8080',
  version: 2
});
```
##### Tips:
1. if you face a cross-origin problem on the browser, please add the proxy
2. original nvr may use version 1, the newer one may use version 2

### connect
```typescript
await nvr.connect();
```

### use other api
```typescript
nvr.fetchChannels()
nvr.fetchUsers()
nvr.reboot()
```
