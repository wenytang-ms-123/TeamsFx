// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { useEffect, useReducer } from "react";
import {
    TeamsUserCredential,
    ErrorCode
} from "@microsoft/teamsfx";
import { getCredential } from "./credential";

type CredentialHandler<T> = (credential: TeamsUserCredential) => Promise<T>;

/**
 * Interface of returned data from useTeamsFx.
 * 
 * @beta
 */
export interface TeamsFxCredential<T> extends TeamsCredentialState<T> {
    /**
     * User need to login and consent if it's true.
     */
    requirePermission: boolean;
    /**
     * The instance of TeamsUserCredential
    */
    credential?: TeamsUserCredential;
    /**
     * Data returned from custom handler.
     */
    data?: T;
    /**
     * Error instance.
     */
    error?: Error;
    /**
     * Call this function if error code is 'ErrorCode.UiRequiredError'
     */
    login: () => Promise<void>;
}

type TeamsCredentialState<T> = Pick<TeamsFxCredential<T>, "requirePermission" | "credential" | "data" | "error">

type Action<T> =
    | { type: 'login success' }
    | { type: 'require permission'; error: Error }
    | { type: 'data update'; data: T }
    | { type: 'login error'; error: Error }
    | { type: 'user error'; error: Error };

/**
 * A custom React hook that shows status and allow developer invoke login function.
 * 
 * @param handler - Custom async function to handle the credential.
 * @param scopes - The array of Microsoft Token scope of access. Default value is  `[.default]`. Scopes provide a way to manage permissions to protected resources.
 * @returns TeamsFxData including credential, data, error etc.
 * 
 * @beta
 */
export function useTeamsFxCredential<T>(handler: CredentialHandler<T>, scopes: string[] = [".default"]): TeamsFxCredential<T> {
    const reducer = (state: TeamsCredentialState<T>, action: Action<T>): TeamsCredentialState<T> => {
        switch (action.type) {
            case 'login success':
                return { requirePermission: false, credential: state.credential, data: state.data, error: undefined };
            case 'require permission':
                return { requirePermission: true, credential: state.credential, data: undefined, error: action.error };
            case 'data update':
                return { requirePermission: false, credential: state.credential, data: action.data, error: undefined };
            case 'login error':
                return { requirePermission: true, credential: state.credential, data: undefined, error: action.error };
            case 'user error':
                return { requirePermission: false, credential: state.credential, data: undefined, error: action.error };
            default:
                return state;
        }
    }

    const teamsUserCredential = getCredential();
    const [{requirePermission, credential, data, error}, dispatch] = useReducer(
        reducer,
        { requirePermission: false, credential: teamsUserCredential, data: undefined, error: undefined }
    );
    const login = async () => {
        if (!credential) {
            return;
        }
        try {   
            await credential.login(scopes);
            dispatch({ type: 'login success' });
        } catch (e) {
            if (e.code === ErrorCode.UiRequiredError) {
                dispatch({ type: 'require permission', error: e });
            }
            else {
                dispatch({ type: 'login error', error: e });
            }
        }
        await fetchData(credential);
    }
    const fetchData = async (credential: TeamsUserCredential) => {
        try {
            const result = await handler(credential);
            dispatch({ type: 'data update', data: result });
        } catch (e) {
            if (e.code === ErrorCode.UiRequiredError) {
                dispatch({ type: 'require permission', error: e });
            }
            else {
                dispatch({ type: 'user error', error: e });
            }
        }
    }
    useEffect(() => {
        fetchData(teamsUserCredential);
    }, []);
    return { requirePermission, credential, data, error, login };
}
