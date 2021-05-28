import React, { useRef } from "react";
import { Button, Avatar } from "@fluentui/react-northstar";
import { Client } from "@microsoft/microsoft-graph-client";
import * as teamsfx from "@microsoft/teamsfx";

export function Graph() {
  const graph = useRef<Client | null>(null);
  // Developers have more control of user login and how to handle credential
  const { requirePermission, data, error, login } = teamsfx.useTeamsFxCredential<{photo: any; profile: any}>(
    async (credential: teamsfx.TeamsUserCredential) => {
      if (!graph.current) {
        graph.current = await teamsfx.createMicrosoftGraphClient(credential);
      }
      const profile = await graph.current.api("/me").get();
      const photo = await graph.current.api("/me/photo/$value").get();
      return {
        profile,
        photo
      };
    }
  );
  return (
    <div>
      <h2>Get the user's profile photo</h2>
      <p>
        Click below to authorize this app to read your profile photo using
        Microsoft Graph.
      </p>
      {requirePermission && <Button primary content="Authorize" onClick={login} />}
      {error && <div className="error">{error}</div>}
      {data && (
        <div className="profile">
          <Avatar
            image={URL.createObjectURL(data.photo)}
            name={data.profile.displayName}
          />{" "}
          <em>{data.profile.displayName}</em>
        </div>
      )}
    </div>
  );
}
