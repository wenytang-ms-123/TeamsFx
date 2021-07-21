// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProductName, SystemError } from "@microsoft/teamsfx-api";
import * as vscode from "vscode";

import { getLocalTeamsAppId } from "./commonUtils";
import { ext } from "../extensionVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import { getTeamsAppId } from "../utils/commonUtils";
import { isValidProject } from "@microsoft/teamsfx-core";
import { getNpmInstallLogInfo, NpmInstallLogInfo } from "./npmLogHandler";
import * as path from "path";
import { showError } from "../handlers";
import {
  errorDetail,
  issueLink,
  issueTemplate,
  npmInstall,
  npmInstallErrorMessage,
} from "./constants";

interface IRunningTeamsfxTask {
  source: string;
  name: string;
  scope: vscode.WorkspaceFolder | vscode.TaskScope;
}

const allRunningTeamsfxTasks: Map<IRunningTeamsfxTask, number> = new Map<
  IRunningTeamsfxTask,
  number
>();
const allRunningDebugSessions: Set<string> = new Set<string>();
const activeNpmInstallTasks = new Set<string>();

function isNpmInstallTask(task: vscode.Task): boolean {
  if (task) {
    return task.name.trim().toLocaleLowerCase().endsWith("npm install");
  }

  return false;
}

function isTeamsfxTask(task: vscode.Task): boolean {
  // teamsfx: xxx start / xxx watch
  if (task) {
    if (
      task.source === ProductName &&
      (task.name.trim().toLocaleLowerCase().endsWith("start") ||
        task.name.trim().toLocaleLowerCase().endsWith("watch"))
    ) {
      // provided by toolkit
      return true;
    }

    if (task.definition && task.definition.type === ProductName) {
      // defined by launch.json
      const command = task.definition.command as string;
      return (
        command !== undefined &&
        (command.trim().toLocaleLowerCase().endsWith("start") ||
          command.trim().toLocaleLowerCase().endsWith("watch"))
      );
    }
  }

  return false;
}

function displayTerminal(taskName: string): boolean {
  const terminal = vscode.window.terminals.find((t) => t.name === taskName);
  if (terminal !== undefined && terminal !== vscode.window.activeTerminal) {
    terminal.show(true);
    return true;
  }

  return false;
}

function onDidStartTaskProcessHandler(event: vscode.TaskProcessStartEvent): void {
  if (ext.workspaceUri) {
    // && isValidProject(ext.workspaceUri.fsPath)
    const task = event.execution.task;
    if (task.scope !== undefined && isTeamsfxTask(task)) {
      allRunningTeamsfxTasks.set(
        { source: task.source, name: task.name, scope: task.scope },
        event.processId
      );
    } else if (isNpmInstallTask(task)) {
      try {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugNpmInstallStart, {
          [TelemetryProperty.DebugNpmInstallName]: task.name,
        });
      } catch {
        // ignore telemetry error
      }

      activeNpmInstallTasks.add(task.name);
    }
  }
}

async function onDidEndTaskProcessHandler(event: vscode.TaskProcessEndEvent): Promise<void> {
  const task = event.execution.task;
  const activeTerminal = vscode.window.activeTerminal;

  if (task.scope !== undefined && isTeamsfxTask(task)) {
    allRunningTeamsfxTasks.delete({ source: task.source, name: task.name, scope: task.scope });
  } else if (isNpmInstallTask(task)) {
    try {
      const cwdOption = (task.execution as vscode.ShellExecution).options?.cwd;
      let cwd: string | undefined;
      if (cwdOption !== undefined) {
        cwd = path.join(ext.workspaceUri.fsPath, cwdOption?.replace("${workspaceFolder}/", ""));
      }

      let npmInstallLogInfo: NpmInstallLogInfo | undefined;
      try {
        if (cwd !== undefined && event.exitCode !== undefined && event.exitCode !== 0) {
          npmInstallLogInfo = await getNpmInstallLogInfo();
          showError(
            new SystemError(
              npmInstall,
              npmInstallErrorMessage,
              task.name,
              issueTemplate + errorDetail + JSON.stringify(npmInstallLogInfo),
              issueLink,
              npmInstallLogInfo
            )
          );
        }
      } catch {
        // ignore any error
        showError(
          new SystemError(npmInstall, npmInstallErrorMessage, task.name, issueTemplate, issueLink)
        );
      }

      const properties: { [key: string]: string } = {
        [TelemetryProperty.DebugNpmInstallName]: task.name,
        [TelemetryProperty.DebugNpmInstallExitCode]: event.exitCode + "", // "undefined" or number value
      };
      if (
        cwd !== undefined &&
        npmInstallLogInfo?.cwd !== undefined &&
        path.relative(npmInstallLogInfo.cwd, cwd).length === 0 &&
        event.exitCode !== undefined &&
        npmInstallLogInfo.exitCode === event.exitCode
      ) {
        properties[TelemetryProperty.DebugNpmInstallNodeVersion] =
          npmInstallLogInfo?.nodeVersion + ""; // "undefined" or string value
        properties[TelemetryProperty.DebugNpmInstallNpmVersion] =
          npmInstallLogInfo?.npmVersion + ""; // "undefined" or string value
        properties[TelemetryProperty.DebugNpmInstallErrorMessage] =
          npmInstallLogInfo.errorMessage?.join("\n") + ""; // "undefined" or string value
      }
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugNpmInstall, properties);
    } catch {
      // ignore telemetry error
    }

    activeNpmInstallTasks.delete(task.name);

    if (activeTerminal?.name === task.name && event.exitCode === 0) {
      // when the task in active terminal is ended successfully.
      for (const hiddenTaskName of activeNpmInstallTasks) {
        // display the first hidden terminal.
        if (displayTerminal(hiddenTaskName)) {
          return;
        }
      }
    } else if (activeTerminal?.name !== task.name && event.exitCode !== 0) {
      // when the task in hidden terminal failed to execute.
      displayTerminal(task.name);
    }
  }
}

function onDidStartDebugSessionHandler(event: vscode.DebugSession): void {
  if (ext.workspaceUri && isValidProject(ext.workspaceUri.fsPath)) {
    const debugConfig = event.configuration;
    if (
      debugConfig &&
      debugConfig.name &&
      (debugConfig.url || debugConfig.port) && // it's from launch.json
      !debugConfig.postRestartTask
    ) {
      // and not a restart one
      // send f5 event telemetry
      try {
        const remoteAppId = getTeamsAppId() as string;
        const localAppId = getLocalTeamsAppId() as string;
        const isRemote =
          (debugConfig.url as string) &&
          remoteAppId &&
          (debugConfig.url as string).includes(remoteAppId);
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugStart, {
          [TelemetryProperty.DebugSessionId]: event.id,
          [TelemetryProperty.DebugType]: debugConfig.type,
          [TelemetryProperty.DebugRequest]: debugConfig.request,
          [TelemetryProperty.DebugPort]: debugConfig.port + "",
          [TelemetryProperty.DebugRemote]: isRemote ? "true" : "false",
          [TelemetryProperty.DebugAppId]: isRemote ? remoteAppId : localAppId,
        });
      } catch {
        // ignore telemetry error
      }

      allRunningDebugSessions.add(event.id);
    }
  }
}

export function terminateAllRunningTeamsfxTasks(): void {
  for (const task of allRunningTeamsfxTasks) {
    try {
      process.kill(task[1], "SIGTERM");
    } catch (e) {
      // ignore and keep killing others
    }
  }
  allRunningTeamsfxTasks.clear();
}

function onDidTerminateDebugSessionHandler(event: vscode.DebugSession): void {
  if (allRunningDebugSessions.has(event.id)) {
    // a valid debug session
    // send stop-debug event telemetry
    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugStop, {
        [TelemetryProperty.DebugSessionId]: event.id,
      });
    } catch {
      // ignore telemetry error
    }

    const extConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
      "fx-extension"
    );
    if (extConfig.get<boolean>("stopTeamsToolkitTasksPostDebug", true)) {
      terminateAllRunningTeamsfxTasks();
    }

    allRunningDebugSessions.delete(event.id);
    allRunningTeamsfxTasks.clear();
  }
}

export function registerTeamsfxTaskAndDebugEvents(): void {
  ext.context.subscriptions.push(vscode.tasks.onDidStartTaskProcess(onDidStartTaskProcessHandler));
  ext.context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(onDidEndTaskProcessHandler));
  ext.context.subscriptions.push(
    vscode.debug.onDidStartDebugSession(onDidStartDebugSessionHandler)
  );
  ext.context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession(onDidTerminateDebugSessionHandler)
  );
}
