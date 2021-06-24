// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, ok, Result, FxError } from "@microsoft/teamsfx-api";
import { Event } from "../../commonUtils/constants/event";
import { IPlugin } from "../../commonUtils/interfaces/IPlugin";
import { Stage } from "../../commonUtils/interfaces/Stages";
import { provisionInputConfig, provisionOutputConfig } from "../constants/configs";
import { SuffixError } from "../constants/errors";
import { Plugins } from "../constants/plugins";

export class Provision extends Stage {
  event = Event.Provision;
  inputConfig = provisionInputConfig;
  outputConfig = provisionOutputConfig;

  constructor(ctx: PluginContext, plugin: IPlugin) {
    super(ctx, plugin);
  }

  public async run(): Promise<Result<any, FxError>> {
    // Send start telemetry and log
    this.sendStartTelemetryEventAndLog();

    // Read config from context
    this.readConfig();

    // Create progress bar and start
    this.createProgressBar("test", 2);
    await this.progressBar?.start("0");

    // Add your own logic here.
    // Sample: get config
    await this.progressBar?.next("1");
    const suffix = this.getConfig(Plugins.TemplatePlugin.configKeys.suffix) as string;
    if (suffix.length > 5) {
      this.setConfig(Plugins.TemplatePlugin.configKeys.resourceName, `resource-${suffix}`);
    } else {
      throw this.getSystemError(SuffixError.name, SuffixError.message(suffix));
    }

    // Sample: set config
    await this.progressBar?.next("2");
    this.setConfig(Plugins.TemplatePlugin.configKeys.resourceName, `resource-${suffix}`);

    // End progress bar
    await this.progressBar?.end();

    // Save config
    this.saveConfig();

    // Send end telemetry and log
    this.sendSuccessTelemetryEventAndLog();

    // Return success
    return ok(undefined);
  }
}
