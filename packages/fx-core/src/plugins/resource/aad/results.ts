// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError, UserError, Result, ok } from "@microsoft/teamsfx-api";
import { Plugins } from "./constants";

export type AadResult = Result<any, FxError>;

export class ResultFactory {
  static readonly source: string = Plugins.pluginNameShort;

  public static UserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError(this.source,  message, name, helpLink);
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError(this.source,  message, name,issueLink);
  }

  public static Success(result?: any): AadResult {
    return ok(result);
  }
}
