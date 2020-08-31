import xml2js from 'xml2js';
import { parseBooleans, parseNumbers } from 'xml2js/lib/processors';

export class XmlHandler {
  private static _parser = new xml2js.Parser({
    attrkey: 'attr',
    charkey: 'value',
    explicitArray: false,
    attrValueProcessors: [
      parseNumbers, parseBooleans
    ],
    valueProcessors: [
      parseNumbers, parseBooleans
    ]
  });
  private static _builder = new xml2js.Builder({
    headless: true,
    renderOpts: {
      pretty: false
    }
  });

  public static async parser<T>(data: string): Promise<T> {
    return (await this._parser.parseStringPromise(data)) as T;
  }

  public static build(data: any): string {
    return this._builder.buildObject(data);
  }
}
