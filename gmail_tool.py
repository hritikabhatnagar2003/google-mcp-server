import base64
from email.mime.text import MIMEText
from googleapiclient.discovery import build


def create_draft(to: str, subject: str, body: str, creds=None):
    """Create a Gmail draft with given to, subject and body. Returns the API response."""
    service = build('gmail', 'v1', credentials=creds)

    message = MIMEText(body)
    message['To'] = to
    message['From'] = 'me'
    message['Subject'] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    draft_body = {'message': {'raw': raw}}

    created = service.users().drafts().create(userId='me', body=draft_body).execute()
    return created
