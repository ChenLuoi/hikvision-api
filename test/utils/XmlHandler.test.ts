import { XmlHandler } from '../../src/utils/XmlHandler';

describe('XmlHandler', () => {
  test('parser', async() => {
    const data = await XmlHandler.parser<{
      data: {
        name: string,
        age: string
      }
    }>('<data><name>Name</name><age>20</age></data>');
    expect(data.data.name).toBe('Name');
    expect(data.data.age).toBe('20');
  });

  test('build', () => {
    const source = {
      data: {
        id: 123456,
        name: 'Name',
        age: 18
      }
    };
    expect(XmlHandler.build(source)).toBe('<data><id>123456</id><name>Name</name><age>18</age></data>');
  });
});
