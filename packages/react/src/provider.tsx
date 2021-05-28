// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React from "react";
import { TeamsFxContext, TeamsContextWithAuth } from "./context";
import { getCredential } from "./credential";

interface WithScopesProps {
  autoLoginUser?: boolean;
  scopes?: string[];
  children: React.ReactNode;
}

/**
 * A React provider component with pre-configured value.
 * 
 * @param props - React component props.
 * @returns Wrapped JSX element to render.
 * 
 * @beta
 */
export class Provider extends React.Component<WithScopesProps, {teamsFxCtx: TeamsContextWithAuth}> {
  constructor(props: WithScopesProps) {
    super(props);
    this.state = {
      teamsFxCtx: {scopes: props.scopes || [".default"]}
    };
  }

  componentDidMount() {
    const credential = getCredential();
    if (this.props.autoLoginUser) {
      credential.login(this.state.teamsFxCtx.scopes);
    }
    microsoftTeams.initialize(() => {
      microsoftTeams.getContext(context => {
        this.setState({
          teamsFxCtx: {
            teamsContext: context,
            credential: credential,
            scopes: this.state.teamsFxCtx.scopes
          }
        });
      });
    });
  }

  render() {
    return (
      <TeamsFxContext.Provider value={this.state.teamsFxCtx}>
        {this.props.children}
      </TeamsFxContext.Provider>
    );
  }
}
