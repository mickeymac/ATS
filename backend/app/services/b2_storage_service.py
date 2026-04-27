import os
import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException
from app.core.config import settings

def get_b2_client():
    """Initializes and returns a boto3 client connected to Backblaze B2."""
    if not settings.B2_KEY_ID or not settings.B2_APPLICATION_KEY:
        raise HTTPException(
            status_code=500,
            detail="B2 Storage credentials (B2_KEY_ID, B2_APPLICATION_KEY) are not configured."
        )

    try:
        return boto3.client(
            service_name='s3',
            endpoint_url=settings.B2_ENDPOINT,
            aws_access_key_id=settings.B2_KEY_ID,
            aws_secret_access_key=settings.B2_APPLICATION_KEY
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize B2 client: {str(e)}")

async def upload_resume_to_b2(file_content: bytes, filename: str, mime_type: str = "application/pdf") -> tuple[str, str]:
    """
    Uploads a resume to Backblaze B2 inside the 'resumes/' folder and returns the filename and public URL.
    """
    bucket_name = settings.B2_BUCKET_NAME
    if not bucket_name:
        raise HTTPException(status_code=500, detail="B2_BUCKET_NAME is not configured.")

    b2_client = get_b2_client()
    object_name = f"resumes/{filename}"

    try:
        # Upload the file
        b2_client.put_object(
            Bucket=bucket_name,
            Key=object_name,
            Body=file_content,
            ContentType=mime_type
        )
        
        # Generate the public URL
        # Format: https://{endpoint_hostname}/file/{bucket_name}/{key}
        # Endpoint example: https://s3.us-west-002.backblazeb2.com
        hostname = settings.B2_ENDPOINT.replace("https://s3.", "https://f000.", 1) 
        if "f000" not in hostname:
            hostname = settings.B2_ENDPOINT # Fallback if S3 API endpoint structure differs
            
        file_url = f"{hostname}/file/{bucket_name}/{object_name}"
        
        return filename, file_url

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"B2 Upload failed: {e.response['Error']['Message']}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during B2 Upload: {str(e)}")

async def delete_resume_from_b2(filename: str):
    """
    Deletes a file from Backblaze B2 by its filename (which maps to the 'resumes/' object key).
    """
    if not filename:
        return

    bucket_name = settings.B2_BUCKET_NAME
    b2_client = get_b2_client()
    object_name = f"resumes/{filename}"

    try:
        b2_client.delete_object(Bucket=bucket_name, Key=object_name)
    except Exception as e:
        print(f"Warning: Failed to delete file {object_name} from B2: {e}")
