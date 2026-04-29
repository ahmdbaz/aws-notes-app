import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('notes')

def lambda_handler(event, context):
    user_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
    body = json.loads(event['body'])
    note_content = body['content']
    
    note_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    table.put_item(Item={
        'userId': user_id,
        'noteId': note_id,
        'content': note_content,
        'createdAt': timestamp
    })
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'noteId': note_id,
            'content': note_content,
            'createdAt': timestamp
        })
    }