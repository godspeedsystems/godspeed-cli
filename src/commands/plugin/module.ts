import { GSCloudEvent, GSContext, GSDataSource, GSEventSource, GSStatus, PlainObject } from '@godspeedsystems/core';
import { GSDataSourceAsEventSource } from '@godspeedsystems/core/dist/core/_interfaces/sources';

// class PrismaDataSource extends GSDataSource {
//   protected initClient(): Promise<PlainObject> {
//     throw new Error('Method not implemented.');
//   }
//   execute(ctx: GSContext, args: PlainObject): Promise<any> {
//     throw new Error('Method not implemented.');
//   }
// }

// export { PrismaDataSource }

class EventSource extends GSEventSource {
  protected initClient(): Promise<PlainObject> {
    throw new Error('Method not implemented.');
  }
  subscribeToEvent(eventKey: string, eventConfig: PlainObject, processEvent: (event: GSCloudEvent, eventConfig: PlainObject) => Promise<GSStatus>): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

class DataSource extends GSDataSource {
  protected initClient(): Promise<PlainObject> {
    throw new Error('Method not implemented.');
  }
  execute(ctx: GSContext, args: PlainObject): Promise<any> {
    throw new Error('Method not implemented.');
  }
}

class DSAsEventSource extends GSDataSourceAsEventSource {
  subscribeToEvent(eventKey: string, eventConfig: PlainObject, processEvent: (event: GSCloudEvent, eventConfig: PlainObject) => Promise<GSStatus>): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

const SourceType = "BOTH";
const Type = 'kafka'; // this is the file name of the plugin
const CONFIG_FILE_NAME = 'kafka'; // in case of event source, this also works as event identifier, and in case of datasource works as datasource name

export {
  EventSource,
  DSAsEventSource,
  SourceType,
  Type,
  CONFIG_FILE_NAME
};
