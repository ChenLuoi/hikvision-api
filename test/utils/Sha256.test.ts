import { sha256 } from '../../src/utils/Sha256';

test('Sha256.sha256', () => {
  expect(sha256('admin')).toBe('8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918');
  expect(sha256('user-name')).toBe('7d77a563ff5910f5fca63065451920530c427c95bcd014d78c8a6ab41da93dff');
  expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(sha256('hikvision-api')).toBe('1ef13da876a805c2ef5a45bf906b5b4f35fca4559dfb6071922107f527c36ebb');
});
