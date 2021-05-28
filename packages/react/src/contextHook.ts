// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { useState, useEffect } from "react";
import { getCredential } from "./credential";
import { TeamsContextWithAuth } from "./context";

export function useTeamsContext(autoLoginUser: boolean = true, scopes: string[] = [".default"]): TeamsContextWithAuth {
    const [teamsFxCtx, setTeamsFxCtx] = useState<TeamsContextWithAuth>({scopes: scopes});
    const credential = getCredential();
    if (autoLoginUser) {
      credential.login(scopes);
    }

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

    return teamsFxCtx;
}
