// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import fs from "fs-extra";
import os from "os";
import "mocha";
import {
  checkRequiredParameters,
  convertPathToCamelCase,
  getRelativePath,
  getResponseJson,
  getUrlProtocol,
  isSupportedApi,
  isYamlSpecFile,
  updateFirstLetter,
} from "../../../src/common/spec-parser/utils";
import { OpenAPIV3 } from "openapi-types";

describe("utils", () => {
  describe("isYamlSpecFile", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("should return false for a valid JSON file", async () => {
      const result = await isYamlSpecFile("test.json");
      expect(result).to.be.false;
    });

    it("should return true for an yaml file", async () => {
      const result = await isYamlSpecFile("test.yaml");
      expect(result).to.be.true;
    });

    it("should handle local json files", async () => {
      const readFileStub = sinon.stub(fs, "readFile").resolves('{"name": "test"}' as any);
      const result = await isYamlSpecFile("path/to/localfile");
      expect(result).to.be.false;
    });

    it("should handle remote files", async () => {
      const axiosStub = sinon.stub(axios, "get").resolves({ data: '{"name": "test"}' });
      const result = await isYamlSpecFile("http://example.com/remotefile");
      expect(result).to.be.false;
    });
  });

  describe("updateFirstLetter", () => {
    it("should return the string with the first letter capitalized", () => {
      const result = updateFirstLetter("hello");
      expect(result).to.equal("Hello");
    });

    it("should return an empty string if the input is empty", () => {
      const result = updateFirstLetter("");
      expect(result).to.equal("");
    });
  });

  describe("getRelativePath", () => {
    it("should return the correct relative path", () => {
      const from = "/path/to/from";
      const to = "/path/to/file.txt";
      const result = getRelativePath(from, to);
      expect(result).to.equal("file.txt");
    });

    it("should get relative path with subfolder", () => {
      const from = "/path/to/from";
      const to = "/path/to/subfolder/file.txt";
      const result = getRelativePath(from, to);
      expect(result).to.equal("subfolder/file.txt");
    });

    it("should replace backslashes with forward slashes on Windows", () => {
      if (os.platform() === "win32") {
        const from = "c:\\path\\to\\from";
        const to = "c:\\path\\to\\subfolder\\file.txt";
        const result = getRelativePath(from, to);
        expect(result).to.equal("subfolder/file.txt");
      }
    });
  });

  describe("convertPathToCamelCase", () => {
    it("should convert a path to camel case", () => {
      const path = "this/is/a/{test}/path";
      const expected = "ThisIsATestPath";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should convert a path to camel case start with /", () => {
      const path = "/this/is/a/{test}/path";
      const expected = "ThisIsATestPath";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return an empty string for an empty path", () => {
      const path = "";
      const expected = "";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return the same string for a path with no slashes", () => {
      const path = "test";
      const expected = "Test";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });
  });

  describe("isSupportedApi", () => {
    it("should return true if method is GET, path is valid, and parameter is supported", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return false if method is GET, path is valid, parameter is supported, but response is empty", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
              responses: {
                400: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if method is not GET", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if path is not valid", () => {
      const method = "GET";
      const path = "/invalid";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if parameter is not supported", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "object" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return true if parameter length is 0", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return true if parameter is null", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {},
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });
  });

  describe("getUrlProtocol", () => {
    it("should return the protocol of a valid URL", () => {
      const url = "https://example.com/path/to/file";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.equal("https:");
    });

    it("should return undefined for an invalid URL", () => {
      const url = "not a url";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.be.undefined;
    });

    it("should return undefined for relative url", () => {
      const url = "/v3";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.be.undefined;
    });

    it("should return the protocol for other protocol", () => {
      const url = "ftp://v1";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.equal("ftp:");
    });
  });

  describe("checkRequiredParameters", () => {
    it("should return true if there is only one required parameter", () => {
      const paramObject = [
        { in: "query", required: true },
        { in: "path", required: false },
      ];
      const result = checkRequiredParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result, true);
    });

    it("should return false if there are multiple required parameters", () => {
      const paramObject = [
        { in: "query", required: true },
        { in: "path", required: true },
      ];
      const result = checkRequiredParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result, false);
    });

    it("should return false if any required parameter is in header or cookie", () => {
      const paramObject = [
        { in: "query", required: true },
        { in: "path", required: false },
        { in: "header", required: true },
      ];
      const result = checkRequiredParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result, false);
    });
  });

  describe("getResponseJson", () => {
    it("should return an empty object if no JSON response is defined", () => {
      const operationObject = {};
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({});
    });

    it("should return the JSON response for status code 200", () => {
      const operationObject = {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      });
    });

    it("should return the JSON response for status code 201", () => {
      const operationObject = {
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
      });
    });

    it("should return the JSON response for the default status code", () => {
      const operationObject = {
        responses: {
          default: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      });
    });

    it("should return the JSON response for the 200 status code", () => {
      const operationObject = {
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                  },
                },
              },
            },
          },
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      });
    });

    it("should return an empty object if all JSON responses are undefined", () => {
      const operationObject = {
        responses: {
          "400": {
            content: {
              "application/xml": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "500": {
            content: {
              "text/plain": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({});
    });
  });
});
