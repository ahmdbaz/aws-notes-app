import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('notes')

def lambda_handler(event, context):
    user_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
    note_id = event['pathParameters']['noteId']
    
    table.delete_item(Key={
        'userId': user_id,
        'noteId': note_id
    })
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Note deleted'})
    }