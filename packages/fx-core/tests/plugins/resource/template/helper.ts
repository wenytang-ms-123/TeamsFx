// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "@microsoft/teamsfx-api";
import {
  fakeDialogProvider,
  fakeLogProvider,
  fakeTelemetryReporter,
} from "../commonUtils/fakeUtils";
import { Plugins } from "../../../../src/plugins/resource/template/constants/plugins";

const suffixAllowed = "123456";
const suffixForbiddened = "123";

export class TestHelper {
  static pluginContext(suffix = true): PluginContext {
    const solutionConfig = new Map();
    solutionConfig.set(
      Plugins.SolutionPlugin.configKeys.resourceNameSuffix,
      suffix ? suffixAllowed : suffixForbiddened
    );
    const pluginContext = {
      logProvider: fakeLogProvider,
      telemetryReporter: fakeTelemetryReporter,
      dialog: fakeDialogProvider,
      config: new Map(),
      configOfOtherPlugins: new Map([[Plugins.SolutionPlugin.id, solutionConfig]]),
      app: {
        name: {
          short: "aad-plugin-unit-test",
        },
      },
    } as unknown as PluginContext;

    return pluginContext;
  }
}
