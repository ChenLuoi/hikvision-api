import xml2js from 'xml2js';

export class XmlHandler {
  private static _parser = new xml2js.Parser({
    explicitArray: false
  });
  private static _builder = new xml2js.Builder({
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
