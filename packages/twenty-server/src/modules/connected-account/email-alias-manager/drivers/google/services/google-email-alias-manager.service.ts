import { Injectable } from '@nestjs/common';

import { google } from 'googleapis';

import { GmailEmailAliasErrorHandlerService } from 'src/modules/connected-account/email-alias-manager/drivers/google/services/google-email-alias-error-handler.service';
import { OAuth2ClientManagerService } from 'src/modules/connected-account/oauth2-client-manager/services/oauth2-client-manager.service';
import { type ConnectedAccountWorkspaceEntity } from 'src/modules/connected-account/standard-objects/connected-account.workspace-entity';

@Injectable()
export class GoogleEmailAliasManagerService {
  constructor(
    private readonly oAuth2ClientManagerService: OAuth2ClientManagerService,
    private readonly gmailEmailAliasErrorHandlerService: GmailEmailAliasErrorHandlerService,
  ) {}

  public async getHandleAliases(
    connectedAccount: ConnectedAccountWorkspaceEntity,
  ) {
    const oAuth2Client =
      await this.oAuth2ClientManagerService.getGoogleOAuth2Client(
        connectedAccount,
      );

    const gmailClient = google.gmail({
      version: 'v1',
      auth: oAuth2Client,
    });

    // Use Gmail API to get Send-As aliases instead of People API
    // This correctly fetches Gmail aliases configured in Settings → Accounts → "Send mail as"
    const sendAsResponse = await gmailClient.users.settings.sendAs
      .list({
        userId: 'me',
      })
      .catch((error) => {
        throw this.gmailEmailAliasErrorHandlerService.handleError(error);
      });

    const sendAsAddresses = sendAsResponse.data.sendAs;

    const handleAliases =
      sendAsAddresses
        ?.filter((sendAs) => {
          // Filter out the primary address (isPrimary === true)
          return sendAs.isPrimary !== true;
        })
        .map((sendAs) => {
          return sendAs.sendAsEmail || '';
        })
        .filter((email) => email !== '') || [];

    return handleAliases;
  }
}
