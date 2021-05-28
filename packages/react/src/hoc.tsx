// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { useState, useEffect } from "react";
import { TeamsFxContext, TeamsContextWithAuth } from "./context";
import { getCredential } from "./credential";

/**
 * HOC that wraps credential using TeamsFxCtx.
 * 
 * @param WrappedComponent - child component that can use the authenticated credential instance in TeamsFxContext.
 * @param scopes - The array of Microsoft Token scope of access. Default value is  `[.default]`. Scopes provide a way to manage permissions to protected resources.
 * @returns Wrapped JSX element to render.
 * 
 * @beta
 */
export function withContext(WrappedComponent: React.ComponentType, autoLoginUser: boolean = true, scopes: string[] = [".default"]): () => JSX.Element {
    const credential = getCredential();
    if (autoLoginUser) {
      credential.login(scopes);
    }
    const [teamsFxCtx, setTeamsFxCtx] = useState<TeamsContextWithAuth>({scopes: scopes});

    useEffect(() => {
      microsoftTeams.initialize(() => {
        microsoftTeams.getContext(context => {
            setTeamsFxCtx({
              teamsContext: context,
              credential: credential,
              scopes: scopes
            })
        });
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return () => (
      <TeamsFxContext.Provider value={teamsFxCtx}>
        <WrappedComponent></WrappedComponent>
      </TeamsFxContext.Provider>
    );
}
