// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TemplatePlugin } from "../../../../../src/plugins/resource/template/index";
import { TestHelper } from "../helper";
import { PluginContext } from "@microsoft/teamsfx-api";
import { Plugins } from "../../../../../src/plugins/resource/template/constants/plugins";

chai.use(chaiAsPromised);

describe("templatePlugin", () => {
  let templatePlugin: TemplatePlugin;
  let pluginContext: PluginContext;

  beforeEach(() => {
    templatePlugin = new TemplatePlugin();
  });

  it("success", async function () {
    pluginContext = TestHelper.pluginContext();
    const provisionRes = await templatePlugin.provision(pluginContext);
    chai.assert.isOk(provisionRes);
    chai.assert.equal(
      pluginContext.config.get(Plugins.TemplatePlugin.configKeys.resourceName),
      "resource-123456"
    );
  });

  it("fail", async function () {
    pluginContext = TestHelper.pluginContext(false);
    const provisionRes = await templatePlugin.provision(pluginContext);
    chai.assert.isTrue(provisionRes.isErr());
  });
});
