// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Inputs, NoProjectOpenedError } from "@microsoft/teamsfx-api";
import { CoreSource, InvalidV1ProjectError } from "../error";
import { validateV1Project } from "../tools";

export const MigrateConditionHandlerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    ctx.result = err(new NoProjectOpenedError(CoreSource));
    return;
  }

  const errorMessage = await validateV1Project(inputs.projectPath);
  if (errorMessage) {
    ctx.result = err(new InvalidV1ProjectError(errorMessage));
    return;
  }

  await next();
};
