import React from "react";
import { Avatar } from "@fluentui/react-northstar";
import { Client } from "@microsoft/microsoft-graph-client";
import * as teamsfx from "@microsoft/teamsfx";

export function Graph() {
  // Developers have more control of user login and how to handle credential
  const { dataOrError, isBusy } = teamsfx.useMicrosoftGraph(async (client: Client) => {
    const profile = await client.api("/me").get();
    const photo = await client.api("/me/photo/$value").get();
    return {
      profile,
      photo
    };
  });

  return (
    <div>
      <h2>Get the user's profile photo</h2>
      <p>
        Click below to authorize this app to read your profile photo using
        Microsoft Graph.
      </p>
      {dataOrError instanceof Error && <div className="error">{dataOrError}</div>}
      {!isBusy && !(dataOrError instanceof Error) && (
        <div className="profile">
          <Avatar
            image={URL.createObjectURL(dataOrError!.photo)}
            name={dataOrError!.profile.displayName}
          />{" "}
          <em>{dataOrError!.profile.displayName}</em>
        </div>
      )}
    </div>
  );
}
