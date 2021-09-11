import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";

export class AppStudioResultFactory {
  static readonly defaultHelpLink = "";
  static readonly defaultIssueLink = "";

  public static UserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError(Constants.PLUGIN_NAME, message, name, helpLink);
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError(Constants.PLUGIN_NAME, message, name, issueLink);
  }
}
