// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    loadConfiguration,
    TeamsUserCredential,
} from "@microsoft/teamsfx";

/**
 * Load configuration using React environment variables and return a new TeamsUserCredential instance.
 *
 * @returns a TeamsUserCredential instance.
 * 
 * @internal
 */
export function getCredential(): TeamsUserCredential {
    const teamsfxEndpoint = process.env.REACT_APP_TEAMSFX_ENDPOINT;
    const startLoginPageUrl = process.env.REACT_APP_START_LOGIN_PAGE_URL;
    const clientId = process.env.REACT_APP_CLIENT_ID;
    loadConfiguration({
        authentication: {
            initiateLoginEndpoint: startLoginPageUrl,
            simpleAuthEndpoint: teamsfxEndpoint,
            clientId: clientId,
        }
    });
    const credential = new TeamsUserCredential();
    return credential;
}
