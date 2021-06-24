// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigValue,
  err,
  FxError,
  IProgressHandler,
  LogLevel,
  PluginContext,
  Result,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { ReadConfigError, UnhandledError } from "../constants/errors";
import { IConfig, IConfigValue } from "./IConfig";
import { IStageEvent } from "./IEvent";
import { IPlugin } from "./IPlugin";

const Telemetry = {
  component: "component",
  success: {
    key: "success",
    yes: "yes",
    no: "no",
  },
  error: {
    errorCode: "error-code",
    errorMessage: "error-message",
    errorType: {
      key: "error-type",
      userError: "user",
      systemError: "system",
    },
  },
  appId: "appid",
};

export abstract class Stage {
  public progressBar?: IProgressHandler;
  protected inputConfig?: IConfig;
  protected outputConfig?: IConfig;
  protected ctx: PluginContext;
  protected plugin: IPlugin;
  protected abstract event: IStageEvent;

  constructor(ctx: PluginContext, plugin: IPlugin) {
    this.ctx = ctx;
    this.plugin = plugin;
  }

  public abstract run(): Promise<Result<any, FxError>>;

  public async handleError(error: any, detailedMessage?: string): Promise<Result<any, FxError>> {
    if (!(error instanceof Error || error instanceof SystemError || error instanceof UserError)) {
      error = new Error(error.toString());
    }

    if (!(error instanceof UserError || error instanceof SystemError)) {
      error = this.getSystemError(
        UnhandledError.name,
        UnhandledError.message(error?.message),
        error
      );
    }

    this.sendTelemetryErrorEvent(error, detailedMessage);
    this.sendLog(error.message, LogLevel.Error, detailedMessage);
    await this.progressBar?.end();
    return err(error);
  }

  protected getSystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): FxError {
    return new SystemError(
      name,
      message,
      this.plugin.shortName as string,
      stack,
      issueLink,
      innerError
    );
  }

  protected getUserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): FxError {
    return new UserError(
      name,
      message,
      this.plugin.shortName as string,
      stack,
      helpLink,
      innerError
    );
  }

  protected getConfig(key: string): ConfigValue {
    if (!this.inputConfig || !this.inputConfig.has(key)) {
      return undefined;
    }

    const value = this.inputConfig.get(key);
    return value?.value;
  }

  protected setConfig(key: string, value: ConfigValue): void {
    if (!this.outputConfig || !this.outputConfig.has(key)) {
      return;
    }

    const configValue = this.outputConfig.get(key) as IConfigValue;
    configValue.value = value;
    this.outputConfig.set(key, configValue);
  }

  protected sendTelemetryErrorEvent(
    error: FxError,
    detailedMessage?: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    let errorMessage = error.message;
    if (detailedMessage) {
      errorMessage += ` Detailed Message: ${detailedMessage}`;
    }

    properties[Telemetry.component] = this.plugin.id;
    properties[Telemetry.success.key] = Telemetry.success.no;
    properties[Telemetry.appId] = this.getAppId();
    properties[Telemetry.error.errorCode] = `${this.plugin.shortName}.${error.name}`;
    properties[Telemetry.error.errorType.key] =
      error instanceof UserError
        ? Telemetry.error.errorType.userError
        : Telemetry.error.errorType.systemError;
    properties[Telemetry.error.errorMessage] = errorMessage;
    this.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      this.event.end.telemetry,
      properties,
      measurements
    );
  }

  protected sendLog(message: string, logLevel: LogLevel, detailedMessage?: string): void {
    if (detailedMessage) {
      message += ` Detailed Message: ${detailedMessage}`;
    }
    this.ctx.logProvider?.log(logLevel, `[${this.plugin.name}] ${message}`);
  }

  protected sendStartTelemetryEventAndLog(): void {
    const properties: { [key: string]: string } = {};
    properties[Telemetry.component] = this.plugin.id;
    properties[Telemetry.success.key] = Telemetry.success.yes;
    properties[Telemetry.appId] = this.getAppId();
    this.ctx.telemetryReporter?.sendTelemetryEvent(this.event.start.telemetry, properties);
    this.sendLog(this.event.start.log, LogLevel.Info);
  }

  protected sendSuccessTelemetryEventAndLog(
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    properties[Telemetry.component] = this.plugin.id;
    properties[Telemetry.appId] = this.getAppId();
    properties[Telemetry.success.key] = Telemetry.success.yes;
    this.ctx.telemetryReporter?.sendTelemetryEvent(
      this.event.end.telemetry,
      properties,
      measurements
    );
    this.sendLog(this.event.end.log, LogLevel.Info);
  }

  protected sendTelemetryEvent(
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    properties[Telemetry.component] = this.plugin.id;
    properties[Telemetry.appId] = this.getAppId();
    this.ctx.telemetryReporter?.sendTelemetryEvent(
      this.event.end.telemetry,
      properties,
      measurements
    );
  }

  protected readConfig(): void {
    if (!this.inputConfig) {
      return;
    }

    this.inputConfig.forEach((configValue, key) => {
      configValue.value = this.readConfigFromContext(
        configValue.plugin ? configValue.plugin : this.plugin.id,
        configValue.key,
        configValue.required ?? true
      );
    });
  }

  protected saveConfig(): void {
    if (!this.outputConfig) {
      return;
    }

    this.outputConfig.forEach((configValue, key) => {
      this.saveConfigToContext(configValue.key, configValue.value);
    });
  }

  protected getLogMessage(message: string): string {
    return `[${this.plugin.name}] ${message}`;
  }

  protected createProgressBar(title: string, steps: number): void {
    this.progressBar = this.ctx.dialog?.createProgressBar(title, steps) as IProgressHandler;
  }

  private readConfigFromContext(pluginId: string, key: string, required = true): ConfigValue {
    const configValue: ConfigValue = this.ctx.configOfOtherPlugins.get(pluginId)?.get(key);
    if (!configValue && required) {
      throw this.getSystemError(ReadConfigError.name, ReadConfigError.message(pluginId, key));
    }
    return configValue;
  }

  private saveConfigToContext(key: string, value: ConfigValue): void {
    if (!value) {
      return;
    }
    this.ctx.config.set(key, value);
  }

  private getAppId(): string {
    const appId = this.ctx.configOfOtherPlugins.get("solution")?.get("remoteTeamsAppId");
    return appId ? (appId as string) : "";
  }
}
