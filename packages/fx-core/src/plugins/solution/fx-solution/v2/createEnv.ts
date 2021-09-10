import {
  AzureSolutionSettings,
  err,
  FxError,
  Inputs,
  ok,
  Result,
  SolutionContext,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { isArmSupportEnabled } from "../../../../common/tools";
import { CopyFileError, newEnvInfo } from "../../../../core";
import { copyParameterJson } from "../arm";
import { isAzureProject } from "./utils";

export async function createEnv(ctx: v2.Context, inputs: Inputs): Promise<Result<Void, FxError>> {
  if (
    isArmSupportEnabled() &&
    isAzureProject(ctx.projectSetting.solutionSettings as AzureSolutionSettings)
  ) {
    const solutionContext: SolutionContext = {
      envInfo: newEnvInfo(inputs.targetEnvName),
      root: inputs.projectPath!,
      ...ctx,
      answers: inputs,
    };
    try {
      await copyParameterJson(solutionContext, inputs.sourceEnvName);
    } catch (e) {
      return err(CopyFileError(e));
    }
  }
  return ok(Void);
}
