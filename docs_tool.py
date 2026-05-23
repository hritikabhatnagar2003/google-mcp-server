from googleapiclient.discovery import build


def append_to_doc(doc_id: str, content: str, creds=None):
    """Append `content` to the end of the Google Doc specified by `doc_id`.

    Returns the API response from batchUpdate.
    """
    service = build('docs', 'v1', credentials=creds)
    doc = service.documents().get(documentId=doc_id).execute()

    # Find largest endIndex in document body to append at the end
    end_index = 1
    for el in doc.get('body', {}).get('content', []):
        if isinstance(el, dict) and 'endIndex' in el and isinstance(el['endIndex'], int):
            if el['endIndex'] > end_index:
                end_index = el['endIndex']

    # Insert text at end_index (append)
    requests = [
        {
            'insertText': {
                'location': {'index': max(1, end_index)},
                'text': content,
            }
        }
    ]

    result = service.documents().batchUpdate(documentId=doc_id, body={'requests': requests}).execute()
    return result
