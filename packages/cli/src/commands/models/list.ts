// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { listSamplesCommand } from "./listSamples";
import { listTemplatesCommand } from "./listTemplates";

export const listCommand: CLICommand = {
  name: "list",
  description: "List available options.",
  commands: [listSamplesCommand, listTemplatesCommand],
};
