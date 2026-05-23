import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.compose',
]
CLIENT_SECRETS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'


def get_credentials(force_console: bool = False):
    creds = None
    # Priority: environment-provided token -> local token.json -> run OAuth flow
    env_token = os.environ.get('GOOGLE_TOKEN_JSON')
    if env_token:
        try:
            info = json.loads(env_token)
            creds = Credentials.from_authorized_user_info(info, SCOPES)
        except Exception:
            creds = None
    elif os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    # Refresh or obtain new credentials if needed
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Load client config from env var or file
            client_config_json = os.environ.get('GOOGLE_CLIENT_SECRETS')
            if client_config_json:
                client_config = json.loads(client_config_json)
                flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            else:
                if not os.path.exists(CLIENT_SECRETS_FILE):
                    raise FileNotFoundError(
                        'credentials.json not found. Create OAuth client credentials in Google Cloud and save as credentials.json'
                    )
                flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
            if force_console:
                print('Using console OAuth flow. Visit the printed URL and paste the code here.')
                if hasattr(flow, 'run_console'):
                    creds = flow.run_console()
                else:
                    auth_url, _ = flow.authorization_url(prompt='consent')
                    print(f'Please visit this URL and paste the authorization code:\n{auth_url}')
                    code = input('Enter authorization code: ').strip()
                    creds = flow.fetch_token(code=code)
            else:
                try:
                    creds = flow.run_local_server(port=0)
                except Exception:
                    # Fallback to console mode if local server flow fails (e.g., headless or non-interactive)
                    print('Falling back to console OAuth flow. Visit the printed URL and paste the code here.')
                    if hasattr(flow, 'run_console'):
                        creds = flow.run_console()
                    else:
                        auth_url, _ = flow.authorization_url(prompt='consent')
                        print(f'Please visit this URL and paste the authorization code:\n{auth_url}')
                        code = input('Enter authorization code: ').strip()
                        creds = flow.fetch_token(code=code)
        # Save the credentials for the next run
        # Persist token.json locally and print instructions if using env-based tokens
        try:
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
        except Exception:
            pass
        if os.environ.get('GOOGLE_TOKEN_JSON'):
            print('NOTE: GOOGLE_TOKEN_JSON is set in env; token.json was written locally if possible.')
    return creds


if __name__ == '__main__':
    try:
        import os

        force_console = os.environ.get('OAUTH_MODE', '').lower() == 'console'
        creds = get_credentials(force_console=force_console)
        print('Credentials obtained and saved to token.json')
    except Exception as e:
        print('Error during OAuth flow:', e)
