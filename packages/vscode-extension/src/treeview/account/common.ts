// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

export enum AccountItemStatus {
  SignedOut,
  SigningIn,
  SignedIn,
}

export const loadingIcon = new vscode.ThemeIcon("loading~spin");
export const infoIcon = new vscode.ThemeIcon("info");
export const errorIcon = new vscode.ThemeIcon(
  "error",
  new vscode.ThemeColor("notificationsErrorIcon.foreground")
);
export const warningIcon = new vscode.ThemeIcon(
  "warning",
  new vscode.ThemeColor("editorLightBulb.foreground")
);
export const passIcon = new vscode.ThemeIcon(
  "pass",
  new vscode.ThemeColor("debugIcon.startForeground")
);
export const azureIcon = new vscode.ThemeIcon("azure");
export const keyIcon = new vscode.ThemeIcon("key");
