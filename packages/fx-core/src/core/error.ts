// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Func,
  FxError, 
  InvalidInputError, 
  InvalidObjectError, 
  ObjectAlreadyExistsError, 
  ObjectNotExistError, 
  SystemError,
  UndefinedError,
  UserError
} from "@microsoft/teamsfx-api";

export const CoreSource = "Core";
 
  
export class CopyFileError extends SystemError {
  constructor(source: string, e: Error){
    super({source: source, error: e});
  }
}
  
export class InvalidV1ProjectError extends UserError{
  constructor(message?: string){
    super({source: CoreSource, message: `The project is not a valid Teams Toolkit V1 project. ${message}`});
  }
}
 
export class InvalidProjectSettingsFileError extends InvalidObjectError {
  constructor(reason?: string){
    super(CoreSource, "ProjectSettings", reason);
  }
}
 
export class FetchSampleError extends UserError {
  constructor(){
    super({source: CoreSource, message: "Failed to fetch sample code"});
  }
}

export class FunctionRouterError extends SystemError {
  constructor(source:string, func: Func){
    super({source: source, message: `Failed to route function call:${JSON.stringify(func)}`});
  }
}

export function ContextUpgradeError(error: Error, isUserError = false): FxError {
  if (isUserError) {
    return new UserError( {error: error, source: CoreSource});
  } else {
    return new SystemError( {error: error, source: CoreSource});
  }
}

export class PluginHasNoTaskImpl extends SystemError {
  constructor(pluginName: string, task: string){
    super(CoreSource,  `Plugin ${pluginName} has not implemented method: ${task}`);
  }
}

export class ProjectSettingsUndefinedError extends UndefinedError {
  constructor(){
    super(CoreSource,  "ProjectSettings");
  }
}

export class ProjectEnvNotExistError extends UserError {
  constructor(env: string){
    super(CoreSource,  `The specified env ${env} does not exist. Select an existing env.`);
  }
} 
export class InvalidEnvNameError extends InvalidInputError {
  constructor(){
    super(CoreSource,  `Environment name can only contain letters, digits, _ and -.`);
  }
}  
export class ProjectEnvAlreadyExistError extends ObjectAlreadyExistsError {
  constructor(env: string){
    super(CoreSource,  `Project environment ${env} `);
  }
} 
export class InvalidEnvConfigError extends InvalidObjectError {
  constructor(env: string, errorMsg: string){
    super(CoreSource,  `configuration config.${env}.json`, errorMsg);
  }
} 
export class NonExistEnvNameError extends ObjectNotExistError {
  constructor(env: string){
    super(CoreSource,  `The configuration config.${env}.json`);
  }
} 
export class NonActiveEnvError extends ObjectNotExistError {
  constructor(){
    super(CoreSource,  "active environment");
  }
}  
export class ModifiedSecretError extends UserError {
  constructor() {
    super(CoreSource, "The secret file has been changed.");
  }
} 
export class LoadSolutionError extends SystemError {
  constructor() {
    super({message: "Failed to load solution", source: CoreSource});
  }
}
 