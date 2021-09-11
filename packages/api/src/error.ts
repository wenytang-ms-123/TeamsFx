// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface FxError extends Error {
  source: string;
  timestamp: Date;
  userData?: any;
}

export interface ErrorOptionBase {
  source?: string,
  name?: string,
  message?: string,
  error?: Error,
  userData?: any;
}

export interface UserErrorOptions extends ErrorOptionBase {
  helpLink?: string,
}

export interface SystemErrorOptions extends ErrorOptionBase {
  issueLink?: string,
}

export class UserError extends Error implements FxError {
  source: string;
  timestamp: Date;
  helpLink?: string;
  userData?: any;
  constructor(source?: string, message?: string, name?: string, helpLink?: string); //case1
  constructor(error: Error, source?: string, name?: string, helpLink?: string);//case2
  constructor(opt: UserErrorOptions); //case3
  constructor(param1?: UserErrorOptions | string | Error, param2?: string, param3?: string, param4?: string) {
    if (param1 === undefined || typeof param1 === "string") { //case 1
      super(param2 || "");
      this.name = param3 ? param3 : new.target.name;
      this.source = param1 || "unknown";
      this.helpLink = param4;
    }
    else if (param1 instanceof Error) {
      //case 2
      const error = param1 as Error;
      super(error.message);
      Object.assign(this, error);
      this.name = param3 || error.name || new.target.name;
      this.source = param2 || "unknown";
      this.helpLink = param4;
    }
    else {
      //case3
      const option = param1 as UserErrorOptions;
      if (option.error) {
        const arr: string[] = [];
        if (option.message) arr.push(option.message);
        if (option.error.message) arr.push(option.error.message);
        const message = arr.join(", ") || "";
        super(message);
        this.name = option.name || option.error.name || new.target.name;
      }
      else {
        super(option.message || "");
        this.name = option.name || new.target.name;
      }
      this.helpLink = param1.helpLink;
      this.source = param1.source || "unknown";
      this.userData = param1.userData;
    }
    this.timestamp = new Date();
    Error.captureStackTrace(this, new.target);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SystemError extends Error implements FxError {
  source: string;
  timestamp: Date;
  issueLink?: string;
  userData?: any;
  constructor(source?: string, message?: string, name?: string, issueLink?: string); //case1
  constructor(error: Error, source?: string, name?: string, issueLink?: string);//case2
  constructor(opt: SystemErrorOptions); //case3
  constructor(param1?: SystemErrorOptions | string | Error, param2?: string, param3?: string, param4?: string) {
    if (param1 === undefined || typeof param1 === "string") { //case 1
      super(param2 || "");
      this.name = param3 ? param3 : new.target.name;
      this.source = param1 || "unknown";
      this.issueLink = param4;
    }
    else if (param1 instanceof Error) {
      //case 2
      const error = param1 as Error;
      super(error.message);
      Object.assign(this, error);
      this.name = param3 || error.name || new.target.name;
      this.source = param2 || "unknown";
      this.issueLink = param4;
    }
    else {
      //case4 case3
      const option = param1 as SystemErrorOptions;
      if (option.error) {
        const arr: string[] = [];
        if (option.message) arr.push(option.message);
        if (option.error.message) arr.push(option.error.message);
        const message = arr.join(", ") || "";
        super(message);
        this.name = option.name || option.error.name || new.target.name;
      }
      else {
        super(option.message || "");
        this.name = option.name || new.target.name;
      }
      this.issueLink = param1.issueLink;
      this.source = param1.source || "unknown";
      this.userData = param1.userData;
    }
    this.timestamp = new Date();
    Error.captureStackTrace(this, new.target);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function assembleError(e: any, source?: string): FxError {
  if (e instanceof UserError || e instanceof SystemError) return e;
  if (!source) source = "unknown";
  const type = typeof e;
  if (type === "string") {
    return new UnknownError(source, e as string);
  } else if (e instanceof Error) {
    const err = e as Error;
    const fxError = new SystemError(err, source);
    fxError.stack = err.stack;
    return fxError;
  } else {
    return new UnknownError(source, JSON.stringify(e));
  }
}

export class UnknownError extends SystemError {
  constructor(source?: string, message?: string) {
    super({ source: source || "API", message: message});
  }
}

export class UserCancelError extends UserError {
  constructor(source?: string) {
    super({ source: source || "API" });
  }
}

export class EmptyOptionError extends SystemError {
  constructor(source?: string) {
    super({ source: source || "API" });
  }
}

export class PathAlreadyExistsError extends UserError {
  constructor(source: string, path: string) {
    super({ source: source, message: `Path ${path} already exists.` });
  }
}

export class PathNotExistError extends UserError {
  constructor(source: string, path: string) {
    super({ source: source, message: `Path ${path} does not exist.` });
  }
}

export class ObjectAlreadyExistsError extends UserError {
  constructor(source: string, name: string) {
    super({ source: source, message: `${name} already exists.` });
  }
}

export class ObjectNotExistError extends UserError {
  constructor(source: string, name: string) {
    super({ source: source, message: `${name} does not exist.` });
  }
}

export class UndefinedError extends SystemError {
  constructor(source: string, name: string) {
    super({ source: source, message: `${name} is undefined, which is not expected` });
  }
}

export class NotImplementedError extends SystemError {
  constructor(source: string, method: string) {
    super({ source: source, message: `Method not implemented:${method}` });
  }
}

export class WriteFileError extends SystemError {
  constructor(source: string, e: Error) {
    super({ source: source, error: e, name: "WriteFileError"});
  }
}

export class ReadFileError extends SystemError {
  constructor(source: string, e: Error) {
    super({ source: source, error: e , name: "ReadFileError"});
  }
}

export class NoProjectOpenedError extends UserError {
  constructor(source: string) {
    super({ source: source, message: "No project opened, you can create a new project or open an existing one." });
  }
}

export class ConcurrentError extends UserError {
  constructor(source: string) {
    super({ source: source, message: "Concurrent operation error, please wait until the running task finish or you can reload the window to cancel it." });
  }
}

export class InvalidInputError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `Input '${name}' is invalid: ${reason}` });
  }
}

export class InvalidProjectError extends UserError {
  constructor(source: string, msg?: string) {
    super({ source: source, message: `The command only works for project created by Teamsfx Toolkit. ${msg ? ": " + msg : ""}` });
  }
}

export class InvalidObjectError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `${name} is invalid: ${reason}` });
  }
}

export class InvalidOperationError extends UserError {
  constructor(source: string, name: string, reason?: string) {
    super({ source: source, message: `Invalid operation: ${name} ${reason}` });
  }
}