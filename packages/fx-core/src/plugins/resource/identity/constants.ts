export class Constants {
  public static readonly pluginName: string = "Identity Plugin";
  public static readonly pluginNameShort: string = "msi";
  public static readonly prefix: string = "teamsfx";

  public static readonly apiVersion: string = "2018-11-30";
  public static readonly deployName: string = "user-assigned-identity";

  public static readonly identityName: string = "identityName";
  public static readonly identityId: string = "identityId";
  public static readonly identity: string = "identity";

  public static readonly solution: string = "solution";
  public static readonly subscriptionId: string = "subscriptionId";
  public static readonly resourceGroupName: string = "resourceGroupName";
  public static readonly resourceNameSuffix: string = "resourceNameSuffix";
  public static readonly location: string = "location";
  public static readonly remoteTeamsAppId: string = "remoteTeamsAppId";

  public static readonly resourceProvider: string = "Microsoft.ManagedIdentity";
}

export class Telemetry {
  static readonly componentName = "fx-resource-azure-identity";
  static startSuffix = "-start";
  static valueYes = "yes";
  static valueNo = "no";
  static userError = "user";
  static systemError = "system";

  static readonly stage = {
    provision: "provision",
  };

  static readonly properties = {
    component: "component",
    success: "success",
    errorCode: "error-code",
    errorType: "error-type",
    errorMessage: "error-message",
    appid: "appid",
  };
}
export class IdentityBicep {
  static readonly identityName: string = "userAssignedIdentityProvision.outputs.identityName";
  static readonly identityId: string = "userAssignedIdentityProvision.outputs.identityId";
  static readonly identity: string = "userAssignedIdentityProvision.outputs.identity";
}

export class IdentityArmOutput {
  static readonly identityName: string = "identity_identityName";
  static readonly identityId: string = "identity_identityId";
  static readonly identity: string = "identity_identity";
}

export class IdentityBicepFile {
  static readonly moduleTemplateFileName: string = "userAssignedIdentity.template.bicep";
}
