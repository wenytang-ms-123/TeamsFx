import {
  ConfigFolderName,
  SolutionContext,
  ProjectSettings,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { PluginNames } from "../plugins/solution/fx-solution/constants";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  BotOptionItem,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../plugins/solution/fx-solution/question";
export function validateProject(solutionContext: SolutionContext): string | undefined {
  const res = validateSettings(solutionContext.projectSettings);
  return res;
}

export function validateSettings(projectSettings?: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return "empty solutionSettings";
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if (solutionSettings.hostType === undefined) return "empty solutionSettings.hostType";
  if (
    solutionSettings.activeResourcePlugins === undefined ||
    solutionSettings.activeResourcePlugins.length === 0
  )
    return "empty solutionSettings.activeResourcePlugins";
  const capabilities = solutionSettings.capabilities || [];
  const azureResources = solutionSettings.azureResources || [];
  const plugins = solutionSettings.activeResourcePlugins || [];
  const v1 = solutionSettings?.migrateFromV1;
  // if(!configJson[PluginNames.LDEBUG]) return "local debug config is missing";
  if (!plugins.includes(PluginNames.LDEBUG))
    return `${PluginNames.LDEBUG} setting is missing in settings.json`;
  if (solutionSettings.hostType === HostTypeOptionSPFx.id) {
    // if(!configJson[PluginNames.SPFX]) return "SPFx config is missing";
    if (!plugins.includes(PluginNames.SPFX))
      return "SPFx setting is missing in activeResourcePlugins";
  } else {
    if (capabilities.includes(TabOptionItem.id)) {
      // if(!configJson[PluginNames.FE]) return "Frontend hosting config is missing";
      if (!plugins.includes(PluginNames.FE) && !v1)
        return `${PluginNames.FE} setting is missing in settings.json`;

      // if(!configJson[PluginNames.AAD]) return "AAD config is missing";
      if (!plugins.includes(PluginNames.AAD) && !v1)
        return `${PluginNames.AAD} setting is missing in settings.json`;

      // if(!configJson[PluginNames.SA]) return "Simple auth config is missing";
      if (!plugins.includes(PluginNames.SA) && !v1)
        return `${PluginNames.SA} setting is missing in settings.json`;
    }
    if (capabilities.includes(BotOptionItem.id)) {
      // if(!configJson[PluginNames.BOT]) return "Bot config is missing";
      if (!plugins.includes(PluginNames.BOT))
        return `${PluginNames.BOT} setting is missing in settings.json`;
    }
    if (capabilities.includes(MessageExtensionItem.id)) {
      // if(!configJson[PluginNames.BOT]) return "MessagingExtension config is missing";
      if (!plugins.includes(PluginNames.BOT))
        return `${PluginNames.BOT} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceSQL.id)) {
      // if(!configJson[PluginNames.SQL]) return "Azure SQL config is missing";
      if (!plugins.includes(PluginNames.SQL))
        return `${PluginNames.SQL} setting is missing in settings.json`;
      // if(!configJson[PluginNames.MSID]) return "SQL identity config is missing";
      if (!plugins.includes(PluginNames.MSID))
        return `${PluginNames.MSID} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceFunction.id)) {
      // if(!configJson[PluginNames.FUNC]) return "Azure functions config is missing";
      if (!plugins.includes(PluginNames.FUNC))
        return `${PluginNames.FUNC} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceApim.id)) {
      // if(!configJson[PluginNames.APIM]) return "API Management config is missing";
      if (!plugins.includes(PluginNames.APIM))
        return `${PluginNames.APIM} setting is missing in settings.json`;
    }
  }
  return undefined;
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
    if (validateSettings(projectSettings)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function isV1Project(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`);
    if (fs.existsSync(confFolderPath)) {
      return false;
    }
    const packageJsonPath = path.resolve(workspacePath, "package.json");
    const packageSettings = fs.readJsonSync(packageJsonPath);
    return validateV1PackageSettings(packageSettings);
  } catch (e) {
    return false;
  }
}

export function validateV1PackageSettings(settings: any): boolean {
  if (settings?.msteams) {
    return true;
  }
  return false;
}
