// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import {
  ConcurrentError,
  ConfigFolderName,
  err,
  Inputs,
  InvalidProjectError,
  NoProjectOpenedError,
  PathNotExistError,
  ProductName,
  StaticPlatforms,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { lock, unlock } from "proper-lockfile";
import { FxCore } from "..";
import { CoreSource } from "../error";
import { base64Encode } from "../tools";

export const ConcurrentLockerMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  const core = ctx.self as FxCore;
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const logger =
    core !== undefined && core.tools !== undefined && core.tools.logProvider !== undefined
      ? core.tools.logProvider
      : undefined;
  const ignoreLock = inputs.ignoreLock === true || StaticPlatforms.includes(inputs.platform);
  if (ignoreLock === false) {
    if (!inputs.projectPath) {
      ctx.result = err(new NoProjectOpenedError(CoreSource));
      return;
    }
    if (!(await fs.pathExists(inputs.projectPath))) {
      ctx.result = err(new PathNotExistError(CoreSource, inputs.projectPath));
      return;
    }
    const lf = path.join(inputs.projectPath, `.${ConfigFolderName}`);
    if (!(await fs.pathExists(lf))) {
      ctx.result = err(new InvalidProjectError(CoreSource));
      return;
    }

    const lockFileDir = path.join(
      os.tmpdir(),
      `${ProductName}-${base64Encode(inputs.projectPath)}`
    );
    await fs.ensureDir(lockFileDir);

    await lock(lf, { lockfilePath: path.join(lockFileDir, `${ConfigFolderName}.lock`) })
      .then(async () => {
        if (logger) logger.debug(`[core] success to acquire lock on: ${lf}`);
        try {
          await next();
        } finally {
          await unlock(lf, { lockfilePath: path.join(lockFileDir, `${ConfigFolderName}.lock`) });
          await fs.rmdir(lockFileDir);
          if (logger) logger.debug(`[core] lock released on ${lf}`);
        }
      })
      .catch((e: any) => {
        if (e["code"] === "ELOCKED") {
          if (logger) logger.warning(`[core] failed to acquire lock on: ${lf}`);
          ctx.result = err(new ConcurrentError(CoreSource));
          return;
        }
        throw e;
      });
  } else {
    await next();
  }
};
