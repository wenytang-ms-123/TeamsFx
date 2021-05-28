// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { useEffect, useReducer } from "react";
import {
    TeamsUserCredential,
    ErrorCode,
    createMicrosoftGraphClient
} from "@microsoft/teamsfx";
import { getCredential } from "./credential";
import { Client } from "@microsoft/microsoft-graph-client";

type GraphClientHandler<T> = (client: Client) => Promise<T>;

/**
 * Interface of returned data from useMicrosoftGraph.
 * 
 * @beta
 */
export interface GraphResult<T> {
    /**
     * Data returned from custom Graph client handler or caught error.
     */
    dataOrError: T | Error | undefined;
    /**
     * Whether the request is still being processed.
     */
    isBusy: boolean;
}

type Action<T> =
    | { type: 'login success' }
    | { type: 'require permission'; error: Error }
    | { type: 'data update'; data: T }
    | { type: 'login error'; error: Error }
    | { type: 'user error'; error: Error };

/**
 * A custom React hook that lets developers to handle an authenticated Microsoft Graph client instance.
 * 
 * @param handler - Custom async function to handle the Microsoft Graph client.
 * @returns GraphResult including data/error and status.
 * 
 * @beta
 */
export function useMicrosoftGraph<T>(handler: GraphClientHandler<T>): GraphResult<T> {
    const reducer = (state: GraphResult<T>, action: Action<T>): GraphResult<T> => {
        switch (action.type) {
            case 'login success':
                return { dataOrError: undefined, isBusy: true };
            case 'require permission':
                login();
                return { dataOrError: action.error, isBusy: true };
            case 'data update':
                return { dataOrError: action.data, isBusy: false };
            case 'login error':
                return { dataOrError: action.error, isBusy: false };
            case 'user error':
                return { dataOrError: action.error, isBusy: false };
            default:
                return state;
        }
    }

    const teamsUserCredential = getCredential();
    const [{dataOrError, isBusy}, dispatch] = useReducer(
        reducer,
        { dataOrError: undefined, isBusy: true }
    );
    const login = async () => {
        try {   
            await teamsUserCredential.login([".default"]);
            dispatch({ type: 'login success' });
        } catch (e) {
            if (e.code === ErrorCode.UiRequiredError) {
                dispatch({ type: 'require permission', error: e });
            }
            else {
                dispatch({ type: 'login error', error: e });
            }
        }
        await fetchData(teamsUserCredential);
    }
    const fetchData = async (credential: TeamsUserCredential) => {
        try {
            const graph = await createMicrosoftGraphClient(credential);
            const result = await handler(graph);
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
    return { dataOrError, isBusy };
}
