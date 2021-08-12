
module simpleAuthProvision './simple_auth_test.bicep' = {
  name: 'simpleAuthProvision'
  params: {
    simpleAuthServerFarmsName: simpleAuth_serverFarmsName
    simpleAuthWebAppName: simpleAuth_webAppName
    sku: simpleAuth_sku
    m365AadClientId: m365AadClientId
    m365AadClientSecret: m365AadClientSecret
    applicationIdUri: applicationIdUri
    m365TenantId: m365TenantId
    oauthAuthorityHost: m365OauthAuthorityHost
  }
}
