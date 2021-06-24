// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, PluginContext, Result, Plugin } from "@microsoft/teamsfx-api";
import { Provision } from "./stages/provision";
import { Plugins } from "./constants/plugins";

export class TemplatePlugin implements Plugin {
  public async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    const provisionRes = new Provision(ctx, Plugins.TemplatePlugin);
    try {
      return await provisionRes.run();
    } catch (error) {
      return await provisionRes.handleError(error);
    }
  }
}
