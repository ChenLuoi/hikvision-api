import { formatDate } from '../../src/utils/Common';

describe('Common', function() {
  test('formatDate', () => {
    const date = new Date(1596700593692);
    expect(formatDate(date)).toBe('2020-08-06 15:56:33');
    expect(formatDate(date, 'yyyy-MM-ddThh:mm:ssZ')).toBe('2020-08-06T15:56:33Z')
  });
});
