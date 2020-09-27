export interface Event {
  type: string,
  data: any
}

type Listener = ((event: Event) => any)

export class EventEmitter {
  private _listeners?: Map<string, Listener[]>;

  constructor() {
  }

  public addEventListener(type: string, listener: Listener) {
    if (this._listeners === undefined) {
      this._listeners = new Map<string, Listener[]>();
    }
    const listeners = this._listeners;
    const l = listeners.get(type);
    if (l === undefined) {
      listeners.set(type, [listener]);
    } else if (l.indexOf(listener) === -1) {
      l.push(listener);
    }
  }

  public hasEventListener(type: string, listener: Listener) {
    if (this._listeners === undefined) {
      return false;
    }
    const listeners = this._listeners;
    const l = listeners.get(type);
    return l !== undefined && l.indexOf(listener) !== -1;
  }

  public removeEventListener(type: string, listener: Listener) {
    if (this._listeners === undefined) {
      return;
    }
    const listeners = this._listeners;
    const listenerArray = listeners.get(type);
    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  public dispatchEvent(event: { type: string, data: any }): boolean {
    if (this._listeners === undefined) {
      return false;
    }

    const listenerArray = this._listeners.get(event.type);
    if (listenerArray !== undefined) {
      const array = listenerArray.slice(0);
      for (let i = 0, l = array.length; i < l; i++) {
        array[i].call(this, event);
      }
      return true;
    }
    return false;
  }
}
