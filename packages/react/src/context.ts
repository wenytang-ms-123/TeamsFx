// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { useContext } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import {
    TeamsUserCredential,
} from "@microsoft/teamsfx";

/**
 * Interface of React context containing TeamsFx credential information.
 */
export interface TeamsContextWithAuth {
    teamsContext?: microsoftTeams.Context;
    credential?: TeamsUserCredential;
    scopes: string[];
}

/**
 * Default instance of TeamsContextWithAuth.
 * 
 * @internal
 */
const defaultTeamsCtxWithAuth: TeamsContextWithAuth = {
    scopes: [".default"]
}

/**
 * React context that contains TeamsFx credential information.
 * 
 * @beta
 */
export const TeamsFxContext = React.createContext<TeamsContextWithAuth>(defaultTeamsCtxWithAuth);

/**
 * React hook that provides access to the TeamsFx React context.
 * @returns TeamsContextWithAuth
 * 
 * @beta
 */
export const useTeamsContextWithAuth = () => useContext(TeamsFxContext);
