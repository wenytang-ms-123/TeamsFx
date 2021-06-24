// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Dialog,
  DialogMsg,
  IProgressHandler,
  LogLevel,
  LogProvider,
  PluginContext,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";

export const fakeLogProvider: LogProvider = {
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    console.log(`Log log: ${message}`);
    return true;
  },
  async info(message: string | Array<any>): Promise<boolean> {
    console.log(`Log info: ${message}`);
    return true;
  },
  async debug(message: string): Promise<boolean> {
    console.log(`Log debug: ${message}`);
    return true;
  },
  async error(message: string): Promise<boolean> {
    console.log(`Log error: ${message}`);
    return true;
  },
  async trace(message: string): Promise<boolean> {
    console.log(`Log trace: ${message}`);
    return true;
  },
  async warning(message: string): Promise<boolean> {
    console.log("Log warning");
    console.log(message);
    return true;
  },
  async fatal(message: string): Promise<boolean> {
    console.log("Log fatal");
    console.log(message);
    return true;
  },
};

export const fakeDialogProvider: Dialog = {
  async communicate(msg: DialogMsg): Promise<DialogMsg> {
    console.log("Dialog");
    console.log(msg.content);
    return msg;
  },
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    console.log(title + totalSteps);
    const progress: IProgressHandler = {
      async start(detail?: string): Promise<void> {
        console.log(`progress start: ${detail}`);
      },
      async next(detail?: string): Promise<void> {
        console.log(`progress next: ${detail}`);
      },
      async end(): Promise<void> {
        console.log("progress end");
      },
    };
    return progress;
  },
};

export const fakeTelemetryReporter: TelemetryReporter = {
  async sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log(`Telemetry event, name: ${eventName}, properties: ${JSON.stringify(properties)}`);
  },

  async sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log(`Telemetry error, name: ${eventName}, properties: ${JSON.stringify(properties)}`);
  },

  async sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log(`Telemetry exception, properties: ${JSON.stringify(properties)}`);
  },
};

export function mockAzureCredential(): msRestNodeAuth.TokenCredentialsBase {
  return new msRestNodeAuth.ApplicationTokenCredentials(
    faker.random.uuid(),
    faker.internet.url(),
    faker.internet.password()
  );
}
