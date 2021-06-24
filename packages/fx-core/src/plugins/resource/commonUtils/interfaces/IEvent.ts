// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

interface IEventMessages {
  telemetry: string;
  log: string;
}

export interface IStageEvent {
  start: IEventMessages;
  end: IEventMessages;
}
