import logging
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from app.config import settings

logger = logging.getLogger(__name__)

# Cached for the process lifetime — avoids a Drive search on every upload.
_recordings_folder_id: str | None = None


def get_drive_service(recruiter_id=None, db=None):
    refresh_token = settings.GOOGLE_REFRESH_TOKEN
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET

    if recruiter_id and db:
        try:
            from app.models.user import User
            user = db.query(User).filter(User.id == recruiter_id).first()
            if user:
                if user.google_refresh_token:
                    refresh_token = user.google_refresh_token
                if user.google_client_id:
                    client_id = user.google_client_id
                if user.google_client_secret:
                    client_secret = user.google_client_secret
        except Exception as err:
            logger.error(f"Error fetching recruiter OAuth credentials for Drive: {err}")

    if not client_id or not client_secret or not refresh_token:
        logger.warning(f"Google Drive credentials (recruiter: {recruiter_id}) are not fully configured. Recording upload will run in SIMULATION mode.")
        return None
    try:
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
        )
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logger.error(f"Error creating Google Drive client: {e}")
        return None


def _get_or_create_recordings_folder(service, folder_name: str) -> str | None:
    global _recordings_folder_id
    if _recordings_folder_id:
        return _recordings_folder_id

    try:
        escaped_name = folder_name.replace("'", "\\'")
        query = f"name='{escaped_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields="files(id, name)", pageSize=1).execute()
        files = results.get('files', [])
        if files:
            _recordings_folder_id = files[0]['id']
            return _recordings_folder_id

        folder = service.files().create(
            body={'name': folder_name, 'mimeType': 'application/vnd.google-apps.folder'},
            fields='id',
        ).execute()
        _recordings_folder_id = folder.get('id')
        return _recordings_folder_id
    except Exception as e:
        logger.error(f"Error finding/creating Drive '{folder_name}' folder: {e}")
        return None


def upload_recording(file_path: str, filename: str, mime_type: str = 'video/webm', recruiter_id=None, db=None) -> dict | None:
    service = get_drive_service(recruiter_id=recruiter_id, db=db)
    if not service:
        logger.info(f"[SIMULATION] Would upload recording '{filename}' to Drive 'Recordings' folder.")
        return None

    folder_id = _get_or_create_recordings_folder(service, settings.GOOGLE_DRIVE_FOLDER_NAME)
    if not folder_id:
        logger.error("Could not resolve the Drive 'Recordings' folder; aborting upload.")
        return None

    try:
        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
        body = {'name': filename, 'parents': [folder_id]}
        file = service.files().create(body=body, media_body=media, fields='id, webViewLink').execute()
        logger.info(f"Uploaded recording '{filename}' to Drive: {file.get('id')}")
        return {'id': file.get('id'), 'webViewLink': file.get('webViewLink')}
    except Exception as e:
        logger.error(f"Error uploading recording '{filename}' to Drive: {e}")
        return None
