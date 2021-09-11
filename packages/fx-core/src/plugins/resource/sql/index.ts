// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  ok,
  err,
  FxError,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { isArmSupportEnabled } from "../../..";
import {
  AzureResourceSQL,
  HostTypeOptionAzure,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { Constants, Telemetry } from "./constants";
import { ErrorMessage } from "./errors";
import { SqlPluginImpl } from "./plugin";
import { SqlResult, SqlResultFactory } from "./results";
import { DialogUtils } from "./utils/dialogUtils";
import { TelemetryUtils } from "./utils/telemetryUtils";
import "./v2";
@Service(ResourcePlugins.SqlPlugin)
export class SqlPlugin implements Plugin {
  name = "fx-resource-azure-sql";
  displayName = "Azure SQL Database";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const azureResources = solutionSettings.azureResources || [];
    const cap = solutionSettings.capabilities || [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      cap.includes(TabOptionItem.id) &&
      azureResources.includes(AzureResourceSQL.id)
    );
  }
  sqlImpl = new SqlPluginImpl();

  public async preProvision(ctx: PluginContext): Promise<SqlResult> {
    return this.runWithSqlError(
      Telemetry.stage.preProvision,
      () => this.sqlImpl.preProvision(ctx),
      ctx
    );
  }

  public async provision(ctx: PluginContext): Promise<SqlResult> {
    if (!isArmSupportEnabled()) {
      return this.runWithSqlError(
        Telemetry.stage.provision,
        () => this.sqlImpl.provision(ctx),
        ctx
      );
    } else {
      return ok(undefined);
    }
  }

  public async postProvision(ctx: PluginContext): Promise<SqlResult> {
    return this.runWithSqlError(
      Telemetry.stage.postProvision,
      () => this.sqlImpl.postProvision(ctx),
      ctx
    );
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<SqlResult> {
    return this.runWithSqlError(
      Telemetry.stage.generateArmTemplates,
      () => this.sqlImpl.generateArmTemplates(ctx),
      ctx
    );
  }

  public async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return this.runWithSqlError(
      Telemetry.stage.getQuestion,
      () => this.sqlImpl.getQuestions(stage, ctx),
      ctx
    );
  }

  private async runWithSqlError(
    stage: string,
    fn: () => Promise<SqlResult>,
    ctx: PluginContext
  ): Promise<SqlResult> {
    try {
      return await fn();
    } catch (e) {
      if(!(e instanceof SystemError || e instanceof UserError)) {
        e = new SystemError({error: e as Error, source: Constants.pluginNameShort, name: ErrorMessage.UnhandledError.name});
        ctx.logProvider?.error((e as SystemError).message);
      }
      const fxError = e as FxError;
      const errorCode = fxError.source + "." + fxError.name;
      const errorType = fxError instanceof SystemError ? Telemetry.systemError : Telemetry.userError;
      TelemetryUtils.init(ctx);
      TelemetryUtils.sendErrorEvent(stage, errorCode, errorType, fxError.message);
      return err(fxError);
    } 
    finally{
      await DialogUtils.progressBar?.end(false);
    }
  }
}

export default new SqlPlugin();
