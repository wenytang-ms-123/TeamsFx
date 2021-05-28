import React from "react";
import * as teamsfx from "@microsoft/teamsfx";

export default class ExistingApp extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // Use teams context to change color
    const context = this.context.teamsContext;
    if(context.theme !== 'default') {
      document.body.style.color = '#fff';
    }
    // Original business codes...
  }

  render() {
    return (
      <teamsfx.Provider>
        //original codes
      </teamsfx.Provider>
    );
  }
}

// Set the React context
ExistingApp.contextType = teamsfx.TeamsFxContext;
