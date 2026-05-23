import asyncio
import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import auth
import docs_tool
import gmail_tool


class AppendRequest(BaseModel):
    doc_id: str
    content: str


class DraftRequest(BaseModel):
    to: str
    subject: str
    body: str


app = FastAPI()


@app.get('/')
async def root():
    return {'status': 'ok', 'message': 'Google MCP server running'}


@app.on_event("startup")
async def _log_routes():
    logging.basicConfig(level=logging.INFO)
    routes = [r.path for r in app.routes]
    logging.info("Registered routes: %s", routes)


async def prompt_approval(action: str, payload: dict) -> str:
    # Allow non-interactive auto-approval via env var (useful in deployments)
    auto = os.environ.get('AUTO_APPROVE', '').lower()
    if auto in ('1', 'true', 'yes'):
        print(f'Auto-approved action: {action} (AUTO_APPROVE={auto})')
        return 'y'

    def _prompt():
        print(f"Action: {action}\nPayload: {payload}")
        return input("Approve? (y/n) ").strip().lower()

    return await asyncio.to_thread(_prompt)


@app.post('/append_to_doc')
async def append_to_doc_endpoint(req: AppendRequest):
    approval = await prompt_approval('append_to_doc', req.dict())
    if approval != 'y':
        raise HTTPException(status_code=403, detail='Action not approved')

    creds = auth.get_credentials()
    try:
        result = docs_tool.append_to_doc(req.doc_id, req.content, creds=creds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {'status': 'ok', 'result': result}


@app.post('/create_email_draft')
async def create_email_draft_endpoint(req: DraftRequest):
    approval = await prompt_approval('create_email_draft', req.dict())
    if approval != 'y':
        raise HTTPException(status_code=403, detail='Action not approved')

    creds = auth.get_credentials()
    try:
        result = gmail_tool.create_draft(req.to, req.subject, req.body, creds=creds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {'status': 'ok', 'result': result}


if __name__ == '__main__':
    import uvicorn

    port = int(os.environ.get('PORT', '8000'))
    reload_mode = os.environ.get('RELOAD', 'false').lower() in ('1', 'true', 'yes')
    uvicorn.run('server:app', host='0.0.0.0', port=port, reload=reload_mode)
