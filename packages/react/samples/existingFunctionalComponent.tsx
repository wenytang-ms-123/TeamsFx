import React from "react";
import * as teamsfx from "@microsoft/teamsfx";

function ExistingApp() {
  // original codes
  // ...
  // Use Hook to get Teams context
  const { teamsContext } = teamsfx.useTeamsFxContext();

  return (
    <div className={teamsContext!.theme}>
      // original codes
    </div>
  )
}

export const Graph = () => {
  return (
    <teamsfx.Provider>
      <ExistingApp />
    </teamsfx.Provider>
  );
}
