/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { funcPluginLogger as logger } from "./funcPluginLogger";
import { DepsCheckerError } from "./errors";
import {
  ConfigMap,
  DialogMsg,
  DialogType,
  Inputs,
  PluginContext,
  QuestionType,
  returnUserError,
} from "@microsoft/teamsfx-api";
import { Messages, dotnetManualInstallHelpLink, defaultHelpLink } from "./common";
import { IDepsAdapter, IDepsChecker } from "./checker";
import { getResourceFolder } from "../../../../..";

class FuncPluginAdapter implements IDepsAdapter {
  private readonly downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
  private readonly answerKey = "function-dotnet-checker-enabled";
  private enabled = false;

  public displayLearnMore(message: string, link: string): Promise<boolean> {
    // TODO: implement learn more popup in plugin
    return Promise.resolve(true);
  }

  public async displayWarningMessage(
    message: string,
    buttonText: string,
    action: () => Promise<boolean>
  ): Promise<boolean> {
    return await action();
  }

  public displayContinueWithLearnMore(message: string, link: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  public showOutputChannel(): void {
    // TODO: find a way to implement in plugin
  }

  public getResourceDir(): string {
    return path.resolve(path.join(getResourceFolder(), "plugins", "resource", "function"));
  }

  public dotnetCheckerEnabled(): boolean {
    return this.enabled;
  }

  public async runWithProgressIndicator(callback: () => Promise<void>): Promise<void> {
    // NOTE: We cannot use outputChannel in plugin to print the dots in one line.
    let counter = 1;
    const timer = setInterval(() => {
      const dots = Array(counter).fill(".").join("");
      logger.info(dots);
      counter += 1;
    }, this.downloadIndicatorInterval);
    try {
      await callback();
    } finally {
      clearTimeout(timer);
    }
  }

  public hasTeamsfxBackend(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  public funcToolCheckerEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  public nodeCheckerEnabled(): boolean {
    throw new Error("Method not implemented.");
  }

  public setFeatureFlag(answers?: Inputs): void {
    this.enabled = answers![this.answerKey] as boolean || false;
  }

  public handleDotnetError(error: Error): void {
    const source = "functionDepsChecker";
    const defaultAnchor = "report-issues";
    if (error instanceof DepsCheckerError) {
      const [helpLink, anchor] = this.splitHelpLink(error.helpLink);
      throw returnUserError(error, source, anchor || defaultAnchor, helpLink, error);
    } else {
      throw returnUserError(
        new Error(Messages.defaultErrorMessage),
        source,
        defaultAnchor,
        defaultHelpLink,
        error
      );
    }
  }

  public async handleDotnetForLinux(ctx: PluginContext, checker: IDepsChecker): Promise<boolean> {
    const confirmMessage = await this.generateMsg(Messages.linuxDepsNotFound, [checker]);
    return this.displayContinueWithLearnMoreLink(ctx, confirmMessage, dotnetManualInstallHelpLink);
  }

  public async displayContinueWithLearnMoreLink(
    ctx: PluginContext,
    message: string,
    link: string
  ): Promise<boolean> {
    if (!ctx.dialog) {
      // no dialog, always continue
      return true;
    }

    const userSelected: string | undefined = (
      await ctx.dialog.communicate(
        new DialogMsg(DialogType.Ask, {
          description: message,
          type: QuestionType.Confirm,
          options: [Messages.learnMoreButtonText, Messages.continueButtonText], // Cancel is added by default
        })
      )
    ).getAnswer();

    if (userSelected === Messages.learnMoreButtonText) {
      await ctx.dialog.communicate(
        new DialogMsg(DialogType.Ask, {
          type: QuestionType.OpenExternal,
          description: link,
        })
      );

      return this.displayContinueWithLearnMoreLink(ctx, message, link);
    }

    return userSelected === Messages.continueButtonText;
  }

  public async generateMsg(
    messageTemplate: string,
    checkers: Array<IDepsChecker>
  ): Promise<string> {
    const supportedPackages = [];
    for (const checker of checkers) {
      const info = await checker.getDepsInfo();
      const supportedVersions = info.supportedVersions.map((version) => "v" + version).join(" or ");
      const supportedPackage = `${info.name} (${supportedVersions})`;
      supportedPackages.push(supportedPackage);
    }
    const supportedMessage = supportedPackages.join(" and ");
    return messageTemplate.replace("@SupportedPackages", supportedMessage);
  }

  private splitHelpLink(link: string): [string, string] {
    const lastAnchor = link.lastIndexOf("#");
    if (lastAnchor !== -1) {
      return [link.slice(0, lastAnchor), link.slice(lastAnchor + 1)];
    } else {
      return [link, ""];
    }
  }
}

export const funcPluginAdapter = new FuncPluginAdapter();
