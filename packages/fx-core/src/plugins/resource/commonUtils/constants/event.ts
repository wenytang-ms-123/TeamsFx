// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IStageEvent } from "../interfaces/IEvent";

export class Event {
  static Provision: IStageEvent = {
    start: {
      telemetry: "provision-start",
      log: "Start to provision",
    },
    end: {
      telemetry: "provision",
      log: "Successfully provision",
    },
  };

  static LocalDebug: IStageEvent = {
    start: {
      telemetry: "local-debug-start",
      log: "Start to local debug",
    },
    end: {
      telemetry: "local-debug",
      log: "Successfully local debug",
    },
  };

  static PostProvision: IStageEvent = {
    start: {
      telemetry: "post-provision-start",
      log: "Start to post-provision",
    },
    end: {
      telemetry: "post-provision",
      log: "Successfully post-provision",
    },
  };

  static PostLocalDebug: IStageEvent = {
    start: {
      telemetry: "post-local-debug-start",
      log: "Start to post local debug",
    },
    end: {
      telemetry: "post-local-debug",
      log: "Successfully post local debug",
    },
  };
}
