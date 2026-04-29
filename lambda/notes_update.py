import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('notes')

def lambda_handler(event, context):
    user_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
    note_id = event['pathParameters']['noteId']
    body = json.loads(event['body'])
    new_content = body['content']
    
    table.update_item(
        Key={
            'userId': user_id,
            'noteId': note_id
        },
        UpdateExpression='SET content = :content',
        ExpressionAttributeValues={':content': new_content}
    )
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Note updated'})
    }